"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { isExpired } from "@/lib/instagram-token";
import { DISCLOSURE } from "@/lib/instagram-dm-policy";
import { postCommentReply, sendPrivateReply, trimForComment } from "@/lib/instagram-comments";

/**
 * Approving a draft, editing it, and turning the pause off.
 *
 * EVERY ACTION RE-VERIFIES THE CALLER against a real server-side session email.
 * Middleware gates the page but fails OPEN on an auth exception, and these post
 * publicly under the brand — a client-side check decides what to show and never
 * what to allow.
 */

async function requireAdmin(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return isAdminEmail(user?.email) ? user!.email! : null;
  } catch {
    return null;
  }
}

/**
 * Send a drafted reply.
 *
 * ONLY FROM 'draft', and the status is part of the update predicate rather than
 * checked beforehand. Two clicks on the same Send button — a double tap, or two
 * tabs — would otherwise both pass a check-then-act and post twice under one
 * comment, in public. Here the second matches no row and does nothing.
 */
export async function sendDraftReply(
  commentId: string,
  editedText?: string
): Promise<{ ok: boolean; error?: string }> {
  const email = await requireAdmin();
  if (!email) return { ok: false, error: "Not authorized." };

  const db = createAdminClient() as any;
  const now = new Date().toISOString();

  const { data: claimed } = await db
    .from("instagram_comment_replies")
    .update({ status: "pending", approved_by: email, approved_at: now, updated_at: now })
    .eq("comment_id", commentId)
    .eq("status", "draft")
    .select("comment_id, commenter_id, comment_text, reply_text, dm_text")
    .maybeSingle();

  if (!claimed) return { ok: false, error: "Already sent, or no longer a draft." };

  const { data: conn } = await db
    .from("instagram_connection")
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();

  if (!conn?.access_token || isExpired(conn.expires_at) || conn.status !== "connected") {
    await db
      .from("instagram_comment_replies")
      .update({ status: "draft", reply_error: "instagram not connected", updated_at: now })
      .eq("comment_id", commentId);
    return { ok: false, error: "Instagram is not connected." };
  }

  // An edit in the box wins over what the agent wrote.
  const publicText = trimForComment(editedText?.trim() || claimed.reply_text || "");
  if (!publicText) {
    await db.from("instagram_comment_replies").update({ status: "draft", updated_at: now }).eq("comment_id", commentId);
    return { ok: false, error: "Reply is empty." };
  }

  const posted = await postCommentReply({
    accessToken: conn.access_token,
    commentId,
    message: publicText,
  });

  let dmOk = false;
  let dmError: string | null = null;
  let dmText: string | null = claimed.dm_text;

  if (dmText) {
    /*
     * The disclosure is decided HERE rather than when the draft was written,
     * because a thread can open in between — they might have messaged us while
     * this sat waiting. Telling somebody they are talking to a bot twice reads
     * as a malfunction; never telling them is a compliance failure.
     */
    const { data: thread } = await db
      .from("instagram_dm_threads")
      .select("sender_id")
      .eq("sender_id", claimed.commenter_id)
      .maybeSingle();
    if (!thread) dmText = `${DISCLOSURE}\n\n${dmText}`;

    const r = await sendPrivateReply({
      accessToken: conn.access_token,
      igUserId: conn.ig_user_id,
      commentId,
      message: dmText,
    });
    dmOk = r.ok;
    if (!r.ok) dmError = (r as any).error;

    if (dmOk) {
      // Same seeding the automatic path does, so the DM agent can continue the
      // conversation instead of meeting them as a stranger.
      const { data: existing } = await db
        .from("instagram_dm_threads")
        .select("sender_id, exchanges")
        .eq("sender_id", claimed.commenter_id)
        .maybeSingle();
      if (existing) {
        await db
          .from("instagram_dm_threads")
          .update({ exchanges: (existing.exchanges ?? 0) + 1, last_message_at: now })
          .eq("sender_id", claimed.commenter_id);
      } else {
        await db.from("instagram_dm_threads").insert({
          sender_id: claimed.commenter_id,
          disclosed_at: now,
          exchanges: 1,
          last_message_at: now,
        });
      }
      await db.from("instagram_dm_messages").insert([
        { sender_id: claimed.commenter_id, role: "user", text_body: `[commented on our post] ${claimed.comment_text}`.slice(0, 4000) },
        { sender_id: claimed.commenter_id, role: "model", text_body: dmText.slice(0, 4000) },
      ]);
    }
  }

  const status = posted.ok && (!claimed.dm_text || dmOk) ? "replied" : posted.ok || dmOk ? "partial" : "failed";

  await db
    .from("instagram_comment_replies")
    .update({
      reply_text: publicText,
      reply_comment_id: posted.ok ? (posted as any).id ?? null : null,
      replied_at: posted.ok ? now : null,
      reply_error: posted.ok ? null : (posted as any).error,
      dm_text: dmText,
      dm_sent_at: dmOk ? now : null,
      dm_error: dmError,
      status,
      updated_at: now,
    })
    .eq("comment_id", commentId);

  if (posted.ok) {
    await db.from("instagram_events").update({ replied_at: now }).eq("kind", "comment").eq("comment_id", commentId);
  }

  revalidatePath("/admin/comment-engagement");
  return posted.ok ? { ok: true } : { ok: false, error: (posted as any).error };
}

/** Drop a draft without sending it. Keeps the row so it is not re-drafted. */
export async function discardDraft(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const email = await requireAdmin();
  if (!email) return { ok: false, error: "Not authorized." };

  const db = createAdminClient() as any;
  const { error } = await db
    .from("instagram_comment_replies")
    .update({ status: "skipped", approved_by: email, approved_at: new Date().toISOString() })
    .eq("comment_id", commentId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/comment-engagement");
  return { ok: true };
}

/**
 * Turn the pause off, or back on.
 *
 * Records who and when. "Why did it start posting on its own" is a question
 * that will be asked eventually, and the answer should not be a guess.
 */
export async function setAutoReply(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const email = await requireAdmin();
  if (!email) return { ok: false, error: "Not authorized." };

  const db = createAdminClient() as any;
  const { error } = await db.from("instagram_agent_settings").upsert({
    id: true,
    comment_auto_reply: enabled,
    comment_auto_reply_changed_at: new Date().toISOString(),
    comment_auto_reply_changed_by: email,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/comment-engagement");
  return { ok: true };
}

/**
 * A TikTok draft was copied and handed to GoHighLevel to post.
 *
 * NOT 'replied'. Nothing was sent from here — every GHL reply endpoint 404s and
 * the capability lives only in their workflow builder — so whoever pastes it is
 * the one who replied. Recording it as sent would make the queue look clear
 * while a comment sat unanswered, which is the exact failure this page exists
 * to prevent.
 */
export async function markCopied(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const email = await requireAdmin();
  if (!email) return { ok: false, error: "Not authorized." };

  const db = createAdminClient() as any;
  const { error } = await db
    .from("instagram_comment_replies")
    .update({
      status: "copied",
      approved_by: email,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("comment_id", commentId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/comment-engagement");
  return { ok: true };
}
