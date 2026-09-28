import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import {
  refreshInstagramToken, needsRefresh, isExpired, REFRESH_WHEN_DAYS_LEFT,
} from "@/lib/instagram-token";

/**
 * Keep the Instagram token alive. Weekly.
 *
 * WHY WEEKLY AND NOT MONTHLY. A 60-day token with a 21-day cushion gives about
 * three attempts before anything is at risk. That margin is the point: the
 * previous token died from a single unnoticed failure mode — nothing was
 * refreshing it at all — and the recovery from a lapsed token is not a retry,
 * it is a human re-authorising through OAuth.
 *
 * IT EMAILS WHEN IT CANNOT FIX THINGS ITSELF. A cron that logs a failure into
 * Vercel and moves on is how the last token went three months unnoticed. The
 * only states worth a message are the ones a person must act on: an expired
 * token, or a refresh that failed terminally.
 */

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function alert(subject: string, body: string) {
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.OUTREACH_ALERT_EMAIL;
  if (!to) return;
  await sendGhlEmail({
    email: to,
    subject,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${body}</div>`,
  }).catch(() => {});
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminClient();

  // Members' own connections first, and independently: a failure on the
  // platform token below must not stop members' tokens being kept alive.
  const members = await refreshMemberTokens(admin).catch((e: any) => ({ error: e?.message }));

  const { data: conn, error } = await (admin.from("instagram_connection") as any)
    .select("*").eq("id", 1).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!conn?.access_token) {
    // Not an error worth alarming on every week — there is simply nothing
    // connected yet, which a person already knows.
    return NextResponse.json({ ok: true, state: "not_connected", members });
  }

  if (isExpired(conn.expires_at)) {
    await (admin.from("instagram_connection") as any)
      .update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", 1);
    await alert(
      "Instagram token expired — reconnect needed",
      `The stored Instagram token expired on ${conn.expires_at}. Meta does not allow refreshing an expired token, so this needs a fresh authorisation through the OAuth flow. Nothing can publish until it is reconnected.`
    );
    return NextResponse.json({ ok: false, state: "expired", action: "reauthorise", members });
  }

  if (!needsRefresh(conn.expires_at)) {
    return NextResponse.json({
      ok: true, state: "healthy", expiresAt: conn.expires_at,
      note: `refresh starts within ${REFRESH_WHEN_DAYS_LEFT} days of expiry`,
      members,
    });
  }

  const result = await refreshInstagramToken(conn.access_token);

  if (!result.ok) {
    await (admin.from("instagram_connection") as any).update({
      status: result.terminal ? "error" : conn.status,
      last_refresh_error: result.error,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    // Only shout when a person has to do something. A transient network failure
    // has two more weekly attempts before it matters.
    if (result.terminal) {
      await alert(
        "Instagram token refresh failed — action needed",
        `Refreshing the Instagram token failed and will not succeed on retry: ${result.error}. It expires on ${conn.expires_at}. Reconnect through the OAuth flow before then.`
      );
    }
    return NextResponse.json({ ok: false, state: "refresh_failed", terminal: !!result.terminal, error: result.error, members });
  }

  await (admin.from("instagram_connection") as any).update({
    access_token: result.accessToken,
    expires_at: result.expiresAt,
    last_refreshed_at: new Date().toISOString(),
    last_refresh_error: null,
    status: "connected",
    updated_at: new Date().toISOString(),
  }).eq("id", 1);

  return NextResponse.json({ ok: true, state: "refreshed", expiresAt: result.expiresAt, members });
}

/**
 * Members' own Instagram tokens (member_instagram_connections).
 *
 * Same rule as the platform token: refresh inside the window, never after
 * expiry (Meta refuses), and mark expired ones so the owner's page and Claude
 * both say "reconnect" instead of failing mysteriously. No admin email per
 * member — the owner sees it the next time they ask Claude or open the page.
 */
async function refreshMemberTokens(admin: any) {
  const { data: rows } = await (admin.from("member_instagram_connections") as any)
    .select("community_member_id, access_token, expires_at, status")
    .eq("status", "connected");
  const summary = { checked: 0, refreshed: 0, expired: 0, failed: 0 };
  for (const row of rows || []) {
    summary.checked++;
    const now = new Date().toISOString();
    if (isExpired(row.expires_at)) {
      summary.expired++;
      await (admin.from("member_instagram_connections") as any)
        .update({ status: "expired", updated_at: now }).eq("community_member_id", row.community_member_id);
      continue;
    }
    if (!needsRefresh(row.expires_at)) continue;
    const r = await refreshInstagramToken(row.access_token);
    if (r.ok && r.accessToken) {
      summary.refreshed++;
      await (admin.from("member_instagram_connections") as any).update({
        access_token: r.accessToken, expires_at: r.expiresAt, last_refreshed_at: now, last_refresh_error: null, updated_at: now,
      }).eq("community_member_id", row.community_member_id);
    } else {
      summary.failed++;
      await (admin.from("member_instagram_connections") as any).update({
        last_refresh_error: r.error ?? "refresh failed", status: r.terminal ? "error" : "connected", updated_at: now,
      }).eq("community_member_id", row.community_member_id);
    }
  }
  return summary;
}
