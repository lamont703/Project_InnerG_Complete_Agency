import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { isExpired } from "@/lib/instagram-token";
import {
  postCommentReply,
  sendPrivateReply,
  extractLinks,
  stripLinks,
  trimForComment,
} from "@/lib/instagram-comments";

/**
 * Somebody comments, and we answer — in public, casually, and without a link.
 *
 * WHY THE COMMENT AND NOT THE DM IS THE IMPORTANT CHANNEL. A business cannot
 * message anyone first on Instagram. A comment is the only thing a stranger can
 * do that opens a door, and it opens two: the public reply, which every future
 * reader of that post also sees, and one private message within 7 days. The DM
 * agent built before this one could only ever serve people who already knew to
 * message us.
 *
 * IT SHARES THE DM AGENT'S BRAIN, for the same reason that one shares the
 * website's: /api/chat holds the tools, the data and 900 lines of rules, and a
 * second copy of any of it would drift inside a fortnight. What differs is the
 * channel policy — see INSTAGRAM_COMMENT_POLICY — which makes the voice casual
 * and forbids links in public.
 *
 * LINKS ARE MOVED, NOT DELETED. The model writes naturally and often reaches
 * for a URL because the honest answer has one. Splitting here rather than
 * forbidding it upstream means the answer keeps its substance: the words stay
 * in the comment, the link goes to the DM, and the comment says so.
 */

/** Never answer our own comments — that is a loop conducted in public. */
async function ownAccountId(admin: any): Promise<string | null> {
  const { data } = await admin
    .from("instagram_connection")
    .select("ig_user_id")
    .eq("id", 1)
    .maybeSingle();
  return data?.ig_user_id ?? null;
}

async function connection(admin: any) {
  const { data } = await admin
    .from("instagram_connection")
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.access_token || !data?.ig_user_id) return null;
  if (isExpired(data.expires_at) || data.status !== "connected") return null;
  return { accessToken: data.access_token as string, igUserId: data.ig_user_id as string };
}

/**
 * How many times this person has commented before now.
 *
 * Drives the "everyone is new until they are not" rule. Read from the raw event
 * log rather than from our replies, because somebody who commented five times
 * before we had an agent is still a regular — they just never got an answer.
 */
async function priorComments(admin: any, commenterId: string): Promise<number> {
  const { data } = await admin
    .from("instagram_events")
    .select("id")
    .eq("kind", "comment")
    .eq("sender_id", commenterId)
    .limit(50);
  return Math.max(0, (data?.length ?? 1) - 1);
}

async function askChat(text: string, priorCount: number): Promise<string | null> {
  const secret = process.env.INTERNAL_AGENT_SECRET;
  /*
   * The commenter's history is stated in the message rather than passed as a
   * field, because /api/chat has no concept of one. It is the smallest honest
   * way to give the model what the tone rule needs.
   */
  const preface =
    priorCount === 0
      ? "[A first-time commenter. They have never interacted with us before.]"
      : `[This person has commented ${priorCount} time(s) before. You may be warmer, but do not claim to remember specifics.]`;

  try {
    const res = await fetch(`${SITE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "x-internal-agent": secret } : {}) },
      body: JSON.stringify({
        messages: [{ role: "user", content: `${preface}\n\nComment: ${text}` }],
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

export interface CommentResult {
  handled: boolean;
  reason: string;
  replied?: boolean;
  dmSent?: boolean;
}

export async function handleInstagramComment(input: {
  commentId: string;
  mediaId?: string | null;
  commenterId: string;
  username?: string | null;
  text: string;
}): Promise<CommentResult> {
  const admin = createAdminClient() as any;
  const text = (input.text || "").trim();
  if (!text) return { handled: false, reason: "empty comment" };

  const selfId = await ownAccountId(admin);
  if (selfId && input.commenterId === selfId) {
    return { handled: false, reason: "our own comment" };
  }

  /*
   * The unique index on comment_id is the real guard against a webhook
   * redelivery becoming a second public reply. Claiming the row BEFORE
   * generating anything means the loser of a race writes nothing, rather than
   * both racing to post under the same comment.
   */
  const prior = await priorComments(admin, input.commenterId);
  const { error: claimError } = await admin.from("instagram_comment_replies").insert({
    comment_id: input.commentId,
    media_id: input.mediaId ?? null,
    commenter_id: input.commenterId,
    commenter_username: input.username ?? null,
    comment_text: text.slice(0, 2000),
    commenter_prior_comments: prior,
    status: "pending",
  });
  if (claimError) return { handled: false, reason: "already handled" };

  const conn = await connection(admin);
  if (!conn) {
    await admin
      .from("instagram_comment_replies")
      .update({ status: "failed", reply_error: "instagram not connected", updated_at: new Date().toISOString() })
      .eq("comment_id", input.commentId);
    return { handled: false, reason: "instagram not connected" };
  }

  const answer = await askChat(text, prior);
  if (!answer) {
    /*
     * Left 'pending' rather than 'failed'. A model that could not be reached is
     * a transient problem and this comment still deserves an answer — the
     * monitoring page shows pending rows so a person can pick it up, which is
     * better than marking it done and forgetting it.
     */
    await admin
      .from("instagram_comment_replies")
      .update({ reply_error: "chat unavailable", updated_at: new Date().toISOString() })
      .eq("comment_id", input.commentId);
    return { handled: false, reason: "chat unavailable" };
  }

  // Split: words stay public, anything clickable goes to the DM.
  const links = extractLinks(answer);
  const publicText = trimForComment(stripLinks(answer));
  const now = new Date().toISOString();

  const posted = await postCommentReply({
    accessToken: conn.accessToken,
    commentId: input.commentId,
    message: publicText,
  });

  let dmText: string | null = null;
  let dmResult: { ok: boolean; error?: string } = { ok: false, error: "not attempted" };

  if (links.length) {
    /*
     * The single private reply is spent only when there is genuinely something
     * to hand over. A comment that needed no link keeps its one message
     * unspent, which matters because there is no second and no way to ask
     * whether it was used.
     */
    dmText = `${stripLinks(answer)}\n\n${links.join("\n")}`.trim();
    const r = await sendPrivateReply({
      accessToken: conn.accessToken,
      igUserId: conn.igUserId,
      commentId: input.commentId,
      message: dmText,
    });
    dmResult = r.ok ? { ok: true } : { ok: false, error: (r as any).error };
  }

  const status =
    posted.ok && (!links.length || dmResult.ok)
      ? "replied"
      : posted.ok || dmResult.ok
        ? "partial"
        : "failed";

  await admin
    .from("instagram_comment_replies")
    .update({
      reply_text: publicText,
      reply_comment_id: posted.ok ? (posted as any).id ?? null : null,
      replied_at: posted.ok ? now : null,
      reply_error: posted.ok ? null : (posted as any).error,
      dm_text: dmText,
      dm_sent_at: dmResult.ok ? now : null,
      dm_error: links.length && !dmResult.ok ? dmResult.error : null,
      status,
      updated_at: now,
    })
    .eq("comment_id", input.commentId);

  // Keep the raw log honest too — replied_at there has never been written.
  if (posted.ok) {
    await admin
      .from("instagram_events")
      .update({ replied_at: now })
      .eq("kind", "comment")
      .eq("comment_id", input.commentId);
  }

  return { handled: true, reason: status, replied: posted.ok, dmSent: dmResult.ok };
}
