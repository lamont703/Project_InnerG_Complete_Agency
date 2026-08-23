import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { youtubeAccessToken, fetchVideoComments } from "@/lib/youtube-comments";
import { trimForComment, stripLinks } from "@/lib/instagram-comments";

/**
 * Pull comments on Shorts the publisher posted, and draft a reply to each.
 *
 * SCOPED TO OUR OWN PUBLISHED SHORTS rather than the whole channel. There are
 * 402 videos on it and most predate any of this; sweeping all of them would
 * spend quota re-reading years of history to find nothing new. publisher_queue
 * knows exactly which videos this system put out, and those are the ones whose
 * comments it should be answering.
 *
 * EVERY COMMENT GETS A DRAFT, including hostile ones — the first real comment
 * on a published Short was "They are all fcking ass", twenty-six minutes after
 * it went out. Having the agent decide what deserves an answer was deliberately
 * not built: a rule that silently drops comments cannot be audited, and its
 * mistakes are invisible. A person decides, and Discard is a recorded act.
 *
 * Same brain and same voice as the other two platforms — /api/chat on the
 * instagram_comment channel, which carries every tone and shape rule. Nothing
 * in those rules is Instagram-specific.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** How many recently published Shorts to check per run. */
const VIDEO_WINDOW = 15;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function draftReply(comment: string, videoTitle?: string): Promise<string | null> {
  const secret = process.env.INTERNAL_AGENT_SECRET;
  const context = videoTitle
    ? `\n[THE SHORT THEY COMMENTED UNDER WAS: "${String(videoTitle).slice(0, 200)}"]`
    : "";

  try {
    const res = await fetch(`${SITE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "x-internal-agent": secret } : {}) },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `[A commenter on our YouTube Short. Assume they have never heard of ShearQuery.]${context}\n\nComment: ${comment}`,
          },
        ],
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

  const admin = createAdminClient() as any;

  const { data: videos } = await admin
    .from("publisher_queue")
    .select("youtube_id, title")
    .not("youtube_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(VIDEO_WINDOW);

  if (!videos?.length) return NextResponse.json({ ok: true, note: "no published shorts yet" });

  let token: string;
  try {
    token = await youtubeAccessToken();
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 502 });
  }

  let seen = 0;
  let drafted = 0;
  let alreadyKnown = 0;

  for (const v of videos) {
    let comments;
    try {
      comments = await fetchVideoComments({ accessToken: token, videoId: v.youtube_id });
    } catch (err: any) {
      console.warn(`[youtube-comment-sync] ${v.youtube_id}: ${err?.message}`);
      continue;
    }
    seen += comments.length;

    for (const c of comments) {
      if (!c.text.trim()) continue;

      /*
       * Claim before drafting. The unique (platform, external_comment_id) index
       * is what makes this poll safe to repeat — and it is also what makes a
       * Discard permanent, since the skipped row still occupies the slot and
       * the insert simply fails next time.
       */
      const { error: claimError } = await admin.from("instagram_comment_replies").insert({
        platform: "youtube",
        external_comment_id: c.id,
        comment_id: c.id,
        media_id: c.videoId,
        commenter_id: c.authorChannelId ?? "unknown",
        commenter_username: c.authorName,
        comment_text: c.text.slice(0, 2000),
        commenter_prior_comments: 0,
        status: "pending",
      });
      if (claimError) {
        alreadyKnown++;
        continue;
      }

      // Channel ids are stable across videos, unlike TikTok's opaque token, so
      // a returning commenter is genuinely recognisable here.
      let prior = 0;
      if (c.authorChannelId) {
        const { data: before } = await admin
          .from("instagram_comment_replies")
          .select("id")
          .eq("platform", "youtube")
          .eq("commenter_id", c.authorChannelId)
          .limit(50);
        prior = Math.max(0, (before?.length ?? 1) - 1);
      }

      const answer = await draftReply(c.text, v.title);
      if (!answer) {
        await admin
          .from("instagram_comment_replies")
          .update({ reply_error: "chat unavailable", commenter_prior_comments: prior })
          .eq("platform", "youtube")
          .eq("external_comment_id", c.id);
        continue;
      }

      await admin
        .from("instagram_comment_replies")
        .update({
          reply_text: trimForComment(stripLinks(answer)),
          commenter_prior_comments: prior,
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("platform", "youtube")
        .eq("external_comment_id", c.id);

      drafted++;
    }
  }

  return NextResponse.json({ ok: true, videosChecked: videos.length, commentsSeen: seen, drafted, alreadyKnown });
}
