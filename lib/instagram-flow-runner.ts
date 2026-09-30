import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDm } from "@/lib/instagram-dm";
import { postCommentReply, sendPrivateReply, sendButtonMessage } from "@/lib/instagram-comments";
import { isOurOwnComment, connection } from "@/lib/instagram-comment-agent";
import { sendGhlEmail } from "@/lib/ghl-email";
import {
  decide, privateReplyFor, publicReplyFor, kitEmail, OPENER, NUDGE_TEXT, OPT_IN_TEXT,
  type FlowState, type Event, type Stage, type TopicId,
} from "@/lib/instagram-flow";

/**
 * Sends the Instagram comment → DM flow (the words and decisions are in
 * lib/instagram-flow.ts, pure and tested). Replaces the AI comment and DM
 * agents while dm_flow_enabled is on (instagram_agent_settings, toggled at
 * /admin/comment-engagement); with it off, the webhook keeps using them.
 *
 * Same failure posture as the agents it replaces: nothing here throws to the
 * webhook, because a non-2xx makes Meta redeliver — a second public reply
 * under the same comment.
 */

const db = () => createAdminClient() as any;
const NUDGE_EVERY_MS = 2 * 60_000;
const ONE_DM_PER_POST_DAYS = 7;

export async function flowEnabled(): Promise<boolean> {
  const { data } = await db().from("instagram_agent_settings").select("dm_flow_enabled").eq("id", true).maybeSingle();
  return data?.dm_flow_enabled === true;
}

async function getState(senderId: string): Promise<(FlowState & { raw: any }) | null> {
  const { data } = await db().from("instagram_flow_state").select("*").eq("sender_id", senderId).maybeSingle();
  return data ? { stage: data.stage, email: data.email, topics: data.topics ?? [], raw: data } : null;
}

async function logDm(senderId: string, role: "user" | "model", text: string, mid?: string | null) {
  await db().from("instagram_dm_messages").insert({ sender_id: senderId, role, text_body: text.slice(0, 2000), message_mid: mid ?? null }).then(() => {}, () => {});
}

// ── the comment ─────────────────────────────────────────────────────────────

export async function handleFlowComment(input: { commentId: string; mediaId?: string | null; commenterId: string; username?: string | null; text: string }) {
  const admin = db();
  if (await isOurOwnComment(admin, input.commenterId, input.username)) return { handled: false, reason: "our own comment" };

  // Claimed first: a redelivered webhook must never be a second public reply.
  const { error: claimErr } = await admin.from("instagram_flow_comments").insert({ comment_id: input.commentId, sender_id: input.commenterId, media_id: input.mediaId ?? null });
  if (claimErr) return { handled: false, reason: "already handled" };

  const conn = await connection(admin);
  if (!conn) {
    await admin.from("instagram_flow_comments").update({ error: "instagram not connected" }).eq("comment_id", input.commentId);
    return { handled: false, reason: "instagram not connected" };
  }

  const state = await getState(input.commenterId);

  // Once per person per post: a second comment on the same post gets the
  // public nod, not a second DM.
  let alreadyMessaged = false;
  if (input.mediaId) {
    const since = new Date(Date.now() - ONE_DM_PER_POST_DAYS * 86400_000).toISOString();
    const { count } = await admin.from("instagram_flow_comments").select("comment_id", { count: "exact", head: true })
      .eq("sender_id", input.commenterId).eq("media_id", input.mediaId).eq("dm_ok", true).gte("created_at", since);
    alreadyMessaged = (count ?? 0) > 0;
  }

  const publicText = publicReplyFor(input.commentId);
  const pub = await postCommentReply({ accessToken: conn.accessToken, commentId: input.commentId, message: publicText });

  let dmKind: "button" | "text" | "menu" | "none" = "none";
  let dmOk = false;
  let dmError: string | null = null;
  if (!alreadyMessaged) {
    const p = privateReplyFor(state);
    const r = await sendButtonMessage({ accessToken: conn.accessToken, igUserId: conn.igUserId, recipient: { comment_id: input.commentId }, text: p.text, buttons: p.buttons });
    if (r.ok) { dmKind = p.kind === "menu" ? "menu" : "button"; dmOk = true; }
    else {
      // Meta documents text for private replies; if the button is refused,
      // the same offer goes as text with a word to type back.
      dmError = r.error;
      const t = await sendPrivateReply({ accessToken: conn.accessToken, igUserId: conn.igUserId, commentId: input.commentId, message: p.kind === "menu" ? `${p.text.replace(/ Tap one 👇$/, "")} Reply MENU to see the options.` : OPENER.fallbackText });
      if (t.ok) { dmKind = "text"; dmOk = true; }
      else dmError = `${dmError} / text fallback: ${(t as any).error}`;
    }
    if (dmOk) await logDm(input.commenterId, "model", p.text);
  }

  if (!state) {
    await admin.from("instagram_flow_state").upsert(
      { sender_id: input.commenterId, username: input.username ?? null, stage: "opened", first_media_id: input.mediaId ?? null, first_comment_id: input.commentId },
      { onConflict: "sender_id", ignoreDuplicates: true }
    );
  }

  await admin.from("instagram_flow_comments").update({
    public_reply: publicText, public_ok: pub.ok, dm_kind: dmKind, dm_ok: dmOk,
    error: [pub.ok ? null : `public: ${(pub as any).error}`, dmError].filter(Boolean).join(" | ") || null,
  }).eq("comment_id", input.commentId);
  if (pub.ok) await admin.from("instagram_events").update({ replied_at: new Date().toISOString() }).eq("kind", "comment").eq("comment_id", input.commentId);

  return { handled: true, reason: "flow", replied: pub.ok, dmSent: dmOk, dmKind };
}

// ── the conversation ────────────────────────────────────────────────────────

export async function handleFlowMessage(input: { senderId: string; text?: string | null; postbackPayload?: string | null; postbackTitle?: string | null; mid?: string | null }) {
  const admin = db();
  const conn = await connection(admin);
  if (!conn) return { handled: false, reason: "instagram not connected" };

  const event: Event | null = input.postbackPayload
    ? { type: "postback", payload: input.postbackPayload }
    : input.text ? { type: "text", text: input.text } : null;
  if (!event) return { handled: false, reason: "nothing to answer" };

  // "MENU" is the typed fallback when a menu couldn't be sent as buttons.
  const state0 = await getState(input.senderId);
  const state = state0 ?? { stage: "opened" as Stage, email: null, topics: [] as TopicId[], raw: null };
  if (!state0) await admin.from("instagram_flow_state").insert({ sender_id: input.senderId, stage: "opened" }).then(() => {}, () => {});
  await logDm(input.senderId, "user", input.postbackTitle || input.text || input.postbackPayload || "", input.mid);

  const actions = event.type === "text" && /^\s*menu\s*$/i.test(event.text) && state.stage === "done"
    ? decide(state, { type: "postback", payload: "SQ_SEND_KIT" })
    : decide(state, event);

  const sent: string[] = [];
  for (const a of actions) {
    if (a.kind === "stage") {
      await admin.from("instagram_flow_state").update({ stage: a.stage, updated_at: new Date().toISOString() }).eq("sender_id", input.senderId);
    } else if (a.kind === "topic") {
      const topics = [...new Set([...(state.topics || []), a.topic])];
      await admin.from("instagram_flow_state").update({ topics, updated_at: new Date().toISOString() }).eq("sender_id", input.senderId);
    } else if (a.kind === "capture_email") {
      await captureEmail(input.senderId, a.email);
    } else if (a.kind === "text") {
      const r = await sendDm({ igUserId: conn.igUserId, accessToken: conn.accessToken, recipientId: input.senderId, text: a.text });
      if (r.ok) { sent.push("text"); await logDm(input.senderId, "model", a.text); }
    } else if (a.kind === "buttons") {
      // Don't answer a burst of typed lines with a burst of nudges.
      if (a.text === NUDGE_TEXT) {
        const last = state.raw?.last_nudge_at ? new Date(state.raw.last_nudge_at).getTime() : 0;
        if (Date.now() - last < NUDGE_EVERY_MS) continue;
        await admin.from("instagram_flow_state").update({ last_nudge_at: new Date().toISOString() }).eq("sender_id", input.senderId);
      }
      const r = await sendButtonMessage({ accessToken: conn.accessToken, igUserId: conn.igUserId, recipient: { id: input.senderId }, text: a.text, buttons: a.buttons });
      if (r.ok) { sent.push("buttons"); await logDm(input.senderId, "model", a.text); }
      else console.warn("[instagram-flow] button message failed:", (r as any).error);
    }
  }
  return { handled: true, reason: "flow", sent };
}

/** Save the email and their yes to the weekly invite, and send the kit. */
async function captureEmail(senderId: string, email: string) {
  const now = new Date().toISOString();
  await db().from("instagram_flow_state").update({
    email, live_training_opt_in: true, opt_in_text: OPT_IN_TEXT, opted_in_at: now, updated_at: now,
  }).eq("sender_id", senderId);
  // Asking again is a fresh yes: lift an old unsubscribe.
  await db().from("email_suppressions").delete().eq("email", email);

  const { getConfig, unsubscribeUrl } = await import("@/lib/live-training/store");
  const cfg = await getConfig();
  const k = kitEmail({ unsubscribeUrl: unsubscribeUrl(email), mailingAddress: cfg.mailing_address });
  const { data: s } = await db().from("instagram_flow_state").select("username").eq("sender_id", senderId).maybeSingle();
  const r = await sendGhlEmail({ email, name: s?.username || email, subject: k.subject, html: k.html });
  await db().from("instagram_flow_state").update(r.ok ? { kit_sent_at: new Date().toISOString(), kit_error: null } : { kit_error: (r.error || "send failed").slice(0, 300) }).eq("sender_id", senderId);
}
