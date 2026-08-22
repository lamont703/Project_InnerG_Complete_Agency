import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { isExpired } from "@/lib/instagram-token";
import { DISCLOSURE } from "@/lib/instagram-dm-policy";
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

/**
 * A PRIVATE REPLY OPENS A DM THREAD, SO THE DM AGENT HAS TO KNOW ABOUT IT.
 *
 * Without this the two agents share nothing and the seam shows immediately.
 * The comment agent DMs somebody a link; they reply; the DM agent finds no
 * thread, treats them as a total stranger, opens with the bot disclosure it has
 * already had no chance to give, and answers with no memory of the exchange
 * that prompted them to write. From their side: "I asked where you are, you
 * messaged me, I replied, and you introduced yourself."
 *
 * It also fixes a compliance gap rather than just an awkwardness. Meta requires
 * the bot disclosure at the START of a message thread, and the private reply IS
 * that start — it was going out without one.
 *
 * THE ID ASSUMPTION, STATED BECAUSE IT IS AN ASSUMPTION. This keys the thread
 * on the commenter's id from the comment webhook, betting it is the same
 * Instagram-scoped id the messaging webhook will report for that person. Meta's
 * docs say a scoped id is created when someone "comments on a post, reel, or
 * story, or sends a message", which reads as one id per person per app, but
 * they do not state the equivalence outright and it has not been observed here.
 *
 * If the bet is wrong the thread simply never matches and the DM agent behaves
 * exactly as it does today — no duplicate messages, no wrong history, just the
 * amnesia we already have. That is why this is worth doing before the
 * equivalence is confirmed: the upside is cohesion and the downside is the
 * status quo.
 */
async function seedDmThreadFromComment(
  admin: any,
  input: { commenterId: string; commentText: string; dmText: string; now: string }
): Promise<{ isNewThread: boolean }> {
  const { data: existing } = await admin
    .from("instagram_dm_threads")
    .select("sender_id, disclosed_at, exchanges")
    .eq("sender_id", input.commenterId)
    .maybeSingle();

  const isNewThread = !existing;

  if (isNewThread) {
    await admin.from("instagram_dm_threads").insert({
      sender_id: input.commenterId,
      // Stamped because the private reply carries the disclosure (see the
      // caller). Leaving it null would make the DM agent open with it a second
      // time on their first reply.
      disclosed_at: input.now,
      exchanges: 1,
      last_message_at: input.now,
    });
  } else {
    await admin
      .from("instagram_dm_threads")
      .update({ exchanges: (existing.exchanges ?? 0) + 1, last_message_at: input.now })
      .eq("sender_id", input.commenterId);
  }

  /*
   * Both halves go into the transcript, and the comment is labelled as one.
   * /api/chat replays this array as conversation history, so without the label
   * the model would read a public comment as though it had been said in the DM
   * — a small lie that makes its next reply subtly wrong.
   */
  await admin.from("instagram_dm_messages").insert([
    { sender_id: input.commenterId, role: "user", text_body: `[commented on our post] ${input.commentText}`.slice(0, 4000) },
    { sender_id: input.commenterId, role: "model", text_body: input.dmText.slice(0, 4000) },
  ]);

  return { isNewThread };
}

export interface CommentResult {
  handled: boolean;
  reason: string;
  replied?: boolean;
  dmSent?: boolean;
  /** True when the private reply also opened a DM thread the DM agent can continue. */
  threadSeeded?: boolean;
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

  /*
   * DRAFT UNLESS EXPLICITLY TOLD OTHERWISE.
   *
   * A missing settings row, an unreadable one, or any error here all resolve to
   * false. The failure mode of getting this wrong is posting in the brand's
   * voice, in public, permanently, without anyone having read it — so the
   * default cannot be permission.
   */
  const { data: settings } = await admin
    .from("instagram_agent_settings")
    .select("comment_auto_reply")
    .eq("id", true)
    .maybeSingle();
  const autoReply = settings?.comment_auto_reply === true;

  if (!autoReply) {
    await admin
      .from("instagram_comment_replies")
      .update({
        reply_text: publicText,
        // Prepared but not sent. The disclosure is decided at send time rather
        // than now, because a thread may open between drafting and approval.
        dm_text: links.length ? `${stripLinks(answer)}\n\n${links.join("\n")}`.trim() : null,
        status: "draft",
        updated_at: now,
      })
      .eq("comment_id", input.commentId);
    return { handled: true, reason: "draft", replied: false, dmSent: false };
  }

  const posted = await postCommentReply({
    accessToken: conn.accessToken,
    commentId: input.commentId,
    message: publicText,
  });

  let dmText: string | null = null;
  let dmResult: { ok: boolean; error?: string } = { ok: false, error: "not attempted" };

  let threadSeeded = false;

  if (links.length) {
    /*
     * The single private reply is spent only when there is genuinely something
     * to hand over. A comment that needed no link keeps its one message
     * unspent, which matters because there is no second and no way to ask
     * whether it was used.
     */
    const { data: knownThread } = await admin
      .from("instagram_dm_threads")
      .select("sender_id")
      .eq("sender_id", input.commenterId)
      .maybeSingle();

    /*
     * The disclosure rides along when this is the first message in the thread.
     * Meta requires it at the start of a message thread and a private reply IS
     * that start — it was going out without one. If a thread already exists the
     * person has been told, and repeating it reads as a malfunction.
     */
    const body = `${stripLinks(answer)}\n\n${links.join("\n")}`.trim();
    dmText = knownThread ? body : `${DISCLOSURE}\n\n${body}`;

    const r = await sendPrivateReply({
      accessToken: conn.accessToken,
      igUserId: conn.igUserId,
      commentId: input.commentId,
      message: dmText,
    });
    dmResult = r.ok ? { ok: true } : { ok: false, error: (r as any).error };

    /*
     * Recorded only after a successful send. Seeding first would leave a thread
     * claiming we said something we never managed to send, and the DM agent
     * would then answer a follow-up referring to a message that does not exist.
     * A failure to record is survivable — it degrades to the amnesia we had
     * before this existed.
     */
    if (dmResult.ok) {
      try {
        await seedDmThreadFromComment(admin, {
          commenterId: input.commenterId,
          commentText: text,
          dmText,
          now,
        });
        threadSeeded = true;
      } catch (err: any) {
        console.warn("[instagram-comment] thread seed failed:", err?.message);
      }
    }
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

  return { handled: true, reason: status, replied: posted.ok, dmSent: dmResult.ok, threadSeeded };
}
