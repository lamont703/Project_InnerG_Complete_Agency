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
 * IT DRAFTS AND NEVER SENDS, which here is the same policy choice Instagram
 * makes: nothing goes out until somebody presses Send. Sending itself does
 * work — see postTikTokCommentReply — despite an earlier version of this
 * comment claiming no reply endpoint existed.
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

/**
 * What the post they commented under was about.
 *
 * WITHOUT THIS THE AGENT IS GUESSING. "can u do a bob?" under a hairstyles post
 * is a request for a POST about bobs; the same words under a shop listing would
 * be a question about a haircut. The agent read a real one as a service request
 * and replied by correcting the person about what ShearQuery is — which was
 * both wrong and slightly cold, and no rule could have fixed it, because the
 * information needed to tell the two apart was never in front of the model.
 */
async function postSummaries(apiKey: string, locationId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const r = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts/list`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "all", limit: "100", skip: "0" }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    for (const post of j?.results?.posts ?? []) {
      if (post.postId && post.summary) map.set(String(post.postId), String(post.summary));
    }
  } catch {
    /* Context is a nice-to-have; a reply without it is worse, not impossible. */
  }
  return map;
}

async function draftReply(comment: string, priorCount: number, postSummary?: string): Promise<string | null> {
  const secret = process.env.INTERNAL_AGENT_SECRET;
  const preface =
    priorCount === 0
      ? "[A first-time commenter on TikTok. They have never interacted with us before — assume they have never heard of ShearQuery.]"
      : `[This person has commented ${priorCount} time(s) before on TikTok. Be warmer, but do not claim to remember specifics.]`;

  const context = postSummary
    ? `\n[THE POST THEY COMMENTED UNDER SAID: "${postSummary.slice(0, 400)}"]`
    : "";

  try {
    const res = await fetch(`${SITE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "x-internal-agent": secret } : {}) },
      body: JSON.stringify({
        messages: [{ role: "user", content: `${preface}${context}\n\nComment: ${comment}` }],
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

  const summaries = await postSummaries(apiKey, locationId);

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

    const answer = await draftReply(c.content, prior, c.platformPostId ? summaries.get(c.platformPostId) : undefined);
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
