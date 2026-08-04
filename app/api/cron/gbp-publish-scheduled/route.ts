import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { writeLocalPost } from "@/lib/gbp-write";
import { isStillPublishable } from "@/lib/gbp-post-schedule";

/**
 * Publish posts that have come due.
 *
 * Runs often, because "scheduled for 9am" should mean roughly 9am. Everything
 * it publishes was approved by an owner who saw the exact text — this job picks
 * the moment, never the content.
 *
 * The check that earns this job its keep is the second validation. A post
 * approved on the 1st and published on the 20th sat in a queue while the world
 * moved: an offer can expire, an event can finish. Publishing those late is
 * worse than not publishing, because it goes out under the shop's name to
 * customers who will try to use it.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** After this many failed attempts a post is left alone rather than retried forever. */
const MAX_ATTEMPTS = 3;

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: due, error } = await (admin.from("gbp_scheduled_posts") as any)
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const summary = { due: due?.length ?? 0, published: 0, expired: 0, failed: 0, skipped: [] as string[] };

  for (const row of due || []) {
    const finish = (patch: Record<string, unknown>) =>
      (admin.from("gbp_scheduled_posts") as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", row.id);

    // Did the window close while this waited?
    const still = isStillPublishable({ event: row.event, offer: row.offer }, now);
    if (!still.publishable) {
      await finish({ status: "cancelled", error: still.reason });
      summary.expired++;
      continue;
    }

    const { data: conn } = await (admin.from("gbp_connections") as any)
      .select("refresh_token")
      .eq("community_member_id", row.community_member_id)
      .maybeSingle();

    // Disconnected since scheduling. Not a failure to retry — there's nothing
    // to retry with until they reconnect.
    if (!conn?.refresh_token) {
      await finish({ status: "cancelled", error: "the Google connection was removed" });
      summary.skipped.push(`${row.id}: disconnected`);
      continue;
    }

    try {
      const token = await gbpAccessToken(conn.refresh_token);
      const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const accountName = accountsRes.ok ? (await accountsRes.json())?.accounts?.[0]?.name ?? null : null;
      if (!accountName) throw new Error("could not resolve the Google account");

      const write = await writeLocalPost({
        token,
        accountName,
        locationName: row.location_name,
        summary: row.summary,
        callToAction: { actionType: row.action_type, url: row.action_url || undefined },
        photoUrl: row.photo_url,
        event: row.event,
        offer: row.offer,
        memberId: row.community_member_id,
        note: `scheduled post${row.angle_id ? ` — ${row.angle_id}` : ""}`,
      });

      if (write.ok) {
        await finish({ status: "published", published_at: new Date().toISOString(), post_name: write.postName ?? null, error: null });
        summary.published++;
      } else {
        const attempts = (row.attempts ?? 0) + 1;
        await finish({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          error: write.error,
        });
        summary.failed++;
      }
    } catch (e: any) {
      const attempts = (row.attempts ?? 0) + 1;
      if (isGbpReconnectRequired(e)) {
        // Retrying a dead token only burns the attempt budget and delays the
        // real answer. Fail now, say why in terms the owner can act on, and
        // record the connection so the other GBP paths stop trying too.
        await markGbpRevoked(admin, { community_member_id: row.community_member_id });
        await finish({
          status: "failed",
          attempts,
          error: "Google connection expired — reconnect your Google Business Profile and reschedule this post.",
        });
        summary.failed++;
        continue;
      }
      await finish({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        error: e?.message || "publish threw",
      });
      summary.failed++;
    }
  }

  return NextResponse.json({ success: true, ...summary });
}
