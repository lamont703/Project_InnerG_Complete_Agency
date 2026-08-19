import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram } from "@/lib/instagram-publish";
import { isExpired } from "@/lib/instagram-token";

/**
 * Publish the next due Instagram post. Daily.
 *
 * ONE POST PER RUN, deliberately. Cadence here is limited by how much material
 * is worth posting, not by what the API allows — Instagram permits 100 a day
 * and posting anywhere near that is how an account gets read as automated by
 * both the algorithm and by people. The same reasoning the Shorts runner uses.
 *
 * OLDEST DUE FIRST, so a post that slipped a day goes out before one scheduled
 * for today. A queue that always takes the newest quietly abandons anything
 * that ever fell behind.
 *
 * IT REFUSES RATHER THAN RETRIES ON A DEAD TOKEN. Publishing with an expired
 * token marks a good post as failed for a reason that has nothing to do with
 * the post, and the queue then looks like a content problem.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminClient();

  const { data: conn } = await (admin.from("instagram_connection") as any)
    .select("access_token, ig_user_id, expires_at, status").eq("id", 1).maybeSingle();

  if (!conn?.access_token || !conn?.ig_user_id) {
    return NextResponse.json({ ok: false, state: "not_connected" });
  }
  if (isExpired(conn.expires_at) || conn.status !== "connected") {
    // Leave the queue untouched: this is our problem, not the post's.
    return NextResponse.json({ ok: false, state: "token_unusable", expiresAt: conn.expires_at });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: due } = await (admin.from("instagram_queue") as any)
    .select("*").eq("status", "queued").lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true }).limit(1);

  const post = due?.[0];
  if (!post) return NextResponse.json({ ok: true, state: "nothing_due" });

  const result = await publishToInstagram({
    igUserId: conn.ig_user_id,
    accessToken: conn.access_token,
    imageUrls: post.image_urls || [],
    caption: post.caption,
    tagHandles: post.tag_handles || [],
  });

  if (!result.ok) {
    await (admin.from("instagram_queue") as any).update({
      status: "failed",
      // The stage matters: a container failure is usually an unreachable image,
      // a publish failure is usually permissions. "It didn't post" is not a
      // diagnosis anyone can act on.
      error: `${result.stage}: ${result.error}`,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    return NextResponse.json({ ok: false, state: "publish_failed", postKey: post.post_key, stage: result.stage, error: result.error });
  }

  await (admin.from("instagram_queue") as any).update({
    status: "published",
    instagram_media_id: result.mediaId,
    permalink: result.permalink || null,
    published_at: new Date().toISOString(),
    error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", post.id);

  return NextResponse.json({ ok: true, state: "published", postKey: post.post_key, mediaId: result.mediaId, permalink: result.permalink });
}
