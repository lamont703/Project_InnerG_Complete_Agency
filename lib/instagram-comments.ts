/**
 * The two ways to answer somebody who commented, and they are different
 * mechanisms with different budgets.
 *
 * PUBLIC REPLY — POST /{comment-id}/replies. Unlimited, visible to everyone who
 * ever reads the post, and the one that compounds: an answer left under a
 * question keeps answering it for every future visitor. This is where the
 * conversation lives.
 *
 * PRIVATE REPLY — POST /{ig-user-id}/messages with recipient {comment_id}. The
 * ONE documented way to message somebody who has never messaged us, and it is
 * exactly one message, within 7 days of their comment. It is spent, not used:
 * there is no second, and no API to ask whether the first went. This is where
 * anything clickable goes, because a URL in a public comment drags people out
 * of the thread and Instagram gives comment links close to no weight anyway.
 *
 * Takes the token and account id as arguments rather than reading the
 * environment, same as instagram-publish.ts and instagram-dm.ts.
 */

const IG = "https://graph.instagram.com/v25.0";

/**
 * Instagram truncates a long comment behind "more" and the reply loses its
 * point. Nothing documents a hard cap for replies the way the 1000-byte DM
 * limit is documented, so this is a readability budget rather than a platform
 * one — which is why it trims rather than erroring.
 */
export const COMMENT_MAX_CHARS = 280;

export function trimForComment(text: string, max = COMMENT_MAX_CHARS): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  // Cut at a sentence end if there is one in the last third, so the reply ends
  // like a thought rather than mid-word.
  const slice = t.slice(0, max);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  return (stop > max * 0.6 ? slice.slice(0, stop + 1) : slice.replace(/\s+\S*$/, "")).trim();
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/** Reply under the comment, publicly. */
export async function postCommentReply(input: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<SendResult> {
  const message = trimForComment(input.message);
  if (!message) return { ok: false, error: "empty reply" };
  try {
    const r = await fetch(`${IG}/${input.commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: input.accessToken }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body?.error) {
      return { ok: false, error: body?.error?.message || `reply failed (${r.status})` };
    }
    return { ok: true, id: body?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "reply threw" };
  }
}

/**
 * The single private reply.
 *
 * The recipient is the COMMENT, not the person — Meta resolves it to them.
 * That is what makes this legal: we are answering a comment, not messaging a
 * stranger, and the distinction is the entire basis of the permission.
 *
 * Callers must check that one has not already been sent. This function cannot
 * know, and Meta will happily refuse the second with an error that reads like a
 * transient fault.
 */
export async function sendPrivateReply(input: {
  accessToken: string;
  igUserId: string;
  commentId: string;
  message: string;
}): Promise<SendResult> {
  const message = String(input.message || "").trim();
  if (!message) return { ok: false, error: "empty message" };
  try {
    const r = await fetch(`${IG}/${input.igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { comment_id: input.commentId },
        message: { text: message },
        access_token: input.accessToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body?.error) {
      return { ok: false, error: body?.error?.message || `private reply failed (${r.status})` };
    }
    return { ok: true, id: body?.message_id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "private reply threw" };
  }
}

/**
 * Does this reply need to hand over a link?
 *
 * The rule is that clickable references go to the DM and never into the public
 * comment. So the agent writes its answer, and anything that came out carrying
 * a URL gets split: the comment keeps the words, the DM keeps the link.
 *
 * Deliberately crude — a bare domain counts. Being over-eager here costs a
 * private reply that did not need spending; being under-eager posts a link in a
 * comment, which is the thing we are trying not to do.
 */
export function extractLinks(text: string): string[] {
  const urls = String(text || "").match(/https?:\/\/[^\s)]+/g) || [];
  const bare = String(text || "").match(/\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|co|gov|edu)\b(?:\/[^\s)]*)?/gi) || [];
  return [...new Set([...urls, ...bare.filter((b) => !urls.some((u) => u.includes(b)))])];
}

/** The comment text with links stripped out, so the public reply carries none. */
export function stripLinks(text: string): string {
  return String(text || "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|co|gov|edu)\b(?:\/[^\s)]*)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}
