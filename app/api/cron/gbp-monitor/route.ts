import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { fetchGbpAudit } from "@/lib/gbp-audit-fetch";
import { diffSnapshots, recentSnapshots, recordSnapshot } from "@/lib/gbp-audit-history";
import { buildMonitoringEmail, shouldNotify } from "@/lib/gbp-monitoring";
import { sendGhlEmail } from "@/lib/ghl-email";

/**
 * Weekly Google Business Profile monitor.
 *
 * Snapshots every connected location and emails the owner ONLY when a check
 * actually moved. That restraint is the product: profiles drift, Google reverts
 * edits, and customers suggest changes — an owner who hears from us only when
 * something happened will open that email. One that arrives every Monday
 * regardless gets filtered, and then the week something breaks, nobody sees it.
 *
 * First run for a location is always silent: with nothing to compare against
 * there's no news, and "here is your profile" unasked is not monitoring.
 *
 * Snapshots are recorded even when we don't email, and even when the owner has
 * opted out of mail — the history is what makes next week's diff possible.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    // Deliberately terse: no hint about whether the secret is set or merely wrong.
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await (admin.from("gbp_connections") as any)
    .select("community_member_id, refresh_token, selected_location, locations, google_account_email, monitoring_emails_enabled, status")
    .not("refresh_token", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = {
    considered: 0,
    audited: 0,
    emailed: 0,
    quiet: 0,
    firstRun: 0,
    skipped: [] as string[],
    failed: [] as string[],
  };

  for (const conn of connections || []) {
    summary.considered++;

    const locationName: string | null =
      conn.selected_location ||
      (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);

    if (!locationName) {
      summary.skipped.push(`${conn.google_account_email}: no location selected`);
      continue;
    }

    try {
      const token = await gbpAccessToken(conn.refresh_token);
      const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const accountName = accountsRes.ok
        ? (await accountsRes.json())?.accounts?.[0]?.name ?? null
        : null;

      const bundle = await fetchGbpAudit(token, locationName, accountName);
      if (!bundle) {
        summary.failed.push(`${conn.google_account_email}: location unavailable`);
        continue;
      }
      summary.audited++;

      const history = await recentSnapshots(conn.community_member_id, locationName, 1);
      const previous = history[0] ?? null;
      const diff = previous ? diffSnapshots(previous, bundle.report) : null;

      // Recorded regardless of whether we email — this is what next week compares to.
      await recordSnapshot({
        memberId: conn.community_member_id,
        locationName,
        businessName: bundle.business.name,
        report: bundle.report,
        performance: bundle.performance,
        keywordCount: bundle.keywords.length,
        latest: previous,
      });

      if (!previous) {
        summary.firstRun++;
        continue;
      }
      if (!shouldNotify(diff)) {
        summary.quiet++;
        continue;
      }
      if (conn.monitoring_emails_enabled === false) {
        summary.skipped.push(`${conn.google_account_email}: emails off`);
        continue;
      }
      if (!conn.google_account_email) {
        summary.skipped.push("connection has no email on file");
        continue;
      }

      // Read the post feed only for people we're already emailing — no point
      // spending a Google call on the majority who get nothing this week.
      // Failure here just omits the nudge; it must not cost them the email.
      let lastPostAt: string | null = null;
      try {
        const token = await gbpAccessToken(conn.refresh_token);
        const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        const accountName = accountsRes.ok ? (await accountsRes.json())?.accounts?.[0]?.name ?? null : null;
        if (accountName) {
          const posts = await fetch(
            `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/localPosts?pageSize=1`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
          );
          if (posts.ok) lastPostAt = (await posts.json())?.localPosts?.[0]?.createTime ?? null;
        }
      } catch (e: any) {
        console.warn("[gbp-monitor] could not read posts:", e?.message);
      }

      const email = buildMonitoringEmail({
        businessName: bundle.business.name,
        score: bundle.report.score,
        diff,
        lastPostAt,
      });
      if (!email) {
        summary.quiet++;
        continue;
      }

      const sent = await sendGhlEmail({
        email: conn.google_account_email,
        name: bundle.business.name,
        subject: email.subject,
        html: email.html,
      });

      if (sent.ok) summary.emailed++;
      else summary.failed.push(`${conn.google_account_email}: ${sent.error}`);
    } catch (e: any) {
      // One bad connection must not end the run for everyone else.
      if (isGbpReconnectRequired(e)) {
        // Otherwise this connection fails on every weekly run forever, the
        // owner silently receives nothing, and no record explains why. Mark it
        // once — sync, performance and both review paths already skip revoked.
        await markGbpRevoked(admin, { community_member_id: conn.community_member_id });
        summary.skipped.push(`${conn.google_account_email}: token revoked — owner must reconnect`);
      } else {
        summary.failed.push(`${conn.google_account_email}: ${e?.message}`);
      }
    }
  }

  console.log("[gbp-monitor]", JSON.stringify(summary));
  return NextResponse.json({ success: true, ...summary });
}
