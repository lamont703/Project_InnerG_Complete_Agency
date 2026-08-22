import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { fetchTikTokComments, tiktokAccountOriginId } from "@/lib/tiktok-comments";
import { trimForComment, stripLinks } from "@/lib/instagram-comments";

/**
 * Pull TikTok comments from GoHighLevel and draft a reply to each.
 *
 * WHY A POLL AND NOT A WEBHOOK. Instagram pushes comments to us; TikTok does
 * not, and GoHighLevel's own comment webhook is a workflow trigger inside their
 * builder rather than something that can be pointed at an endpoint here. So
 * this asks, on a schedule.
 *
 * IT DRAFTS AND NEVER SENDS, and unlike Instagram that is not a policy choice —
 * it is the only option. Every GHL reply endpoint 404s (/create, /reply,
 * /{id}/reply, /{id}/replies were all tried); only reading and liking are
 * exposed. Replying exists solely in GHL's workflow builder, so a TikTok draft
 * is written here and pasted there.
 *
 * SAME BRAIN, SAME VOICE. It calls /api/chat on the instagram_comment channel,
 * which carries the tone rules, the reply-shape rules, the off-topic wind-down
 * and the ban on repeating anything private. Those rules are about how to
 * answer a public comment, and nothing in them is Instagram-specific — using
 * one policy for both platforms is the point, since two copies would drift.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function draftReply(comment: string, priorCount: number): Promise<string | null> {
  const secret = process.env.INTERNAL_AGENT_SECRET;
  const preface =
    priorCount === 0
      ? "[A first-time commenter on TikTok. They have never interacted with us before — assume they have never heard of ShearQuery.]"
      : `[This person has commented ${priorCount} time(s) before on TikTok. Be warmer, but do not claim to remember specifics.]`;

  try {
    const res = await fetch(`${SITE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "x-internal-agent": secret } : {}) },
      body: JSON.stringify({
        messages: [{ role: "user", content: `${preface}\n\nComment: ${comment}` }],
        channel: "instagram_comment",
        memberId: null,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const body = await res.json().catch(() => ({}));
    return typeof body?.text === "string" && body.text.trim() ? body.text : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return NextResponse.json({ ok: false, error: "GHL credentials not configured" }, { status: 500 });
  }

  const admin = createAdminClient() as any;

  const originId = await tiktokAccountOriginId(apiKey, locationId);
  if (!originId) return NextResponse.json({ ok: false, error: "no tiktok account connected in GHL" });

  let comments;
  try {
    comments = await fetchTikTokComments({ apiKey, locationId, originId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 502 });
  }

  let drafted = 0;
  let skipped = 0;

  for (const c of comments) {
    if (!c.content.trim()) continue;

    /*
     * The unique index on (platform, external_comment_id) is what makes this
     * poll safe to run repeatedly. Claiming BEFORE drafting means a second run
     * overlapping the first writes nothing rather than both generating a reply
     * to the same comment.
     */
    const { error: claimError } = await admin.from("instagram_comment_replies").insert({
      platform: "tiktok",
      external_comment_id: c.id,
      comment_id: c.platformCommentId ?? c.id,
      media_id: c.platformPostId,
      commenter_id: c.authorId ?? "unknown",
      commenter_username: c.authorName,
      comment_text: c.content.slice(0, 2000),
      commenter_prior_comments: 0,
      status: "pending",
    });
    if (claimError) {
      skipped++;
      continue;
    }

    /*
     * Counted AFTER the claim so this comment is already stored, then subtracted
     * — the same correction the Instagram path needed, without which every
     * first-timer looks like a regular. Keyed on the opaque GHL author token,
     * which is the only identifier TikTok gives us.
     */
    let prior = 0;
    if (c.authorId) {
      const { data: seen } = await admin
        .from("instagram_comment_replies")
        .select("id")
        .eq("platform", "tiktok")
        .eq("commenter_id", c.authorId)
        .limit(50);
      prior = Math.max(0, (seen?.length ?? 1) - 1);
    }

    const answer = await draftReply(c.content, prior);
    if (!answer) {
      // Left 'pending' so the page still shows it needs a human, rather than
      // marking it done and losing it.
      await admin
        .from("instagram_comment_replies")
        .update({ reply_error: "chat unavailable", commenter_prior_comments: prior })
        .eq("platform", "tiktok")
        .eq("external_comment_id", c.id);
      continue;
    }

    /*
     * Links are stripped and NOT moved to a DM. On Instagram the private reply
     * carries them; here there is no send path at all, so a URL in the text
     * would either be pasted into a TikTok comment — where links are not
     * clickable and carry no weight — or silently lost. Better that the reply
     * simply does not promise one.
     */
    await admin
      .from("instagram_comment_replies")
      .update({
        reply_text: trimForComment(stripLinks(answer)),
        commenter_prior_comments: prior,
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("platform", "tiktok")
      .eq("external_comment_id", c.id);

    drafted++;
  }

  return NextResponse.json({
    ok: true,
    commentsSeen: comments.length,
    drafted,
    alreadyKnown: skipped,
    note: "TikTok replies cannot be posted by API — drafts are pasted into GoHighLevel.",
  });
}
