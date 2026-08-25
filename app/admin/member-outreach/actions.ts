"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { sendGhlSms } from "@/lib/ghl-sms";
import { sendGhlEmail } from "@/lib/ghl-email";

/**
 * Send one drafted message, after a person has read it.
 *
 * RE-VERIFIES THE CALLER, the same defence-in-depth the ad-campaign and content
 * publisher actions keep: middleware gates /admin but fails OPEN on an auth
 * exception, and this sends a message to a real business owner under our name.
 *
 * IT RECORDS THE SEND AS OUTREACH, NOT CONVERSATION. This is the loop that had
 * to be closed deliberately: a message sent from here goes out through GHL,
 * comes back through the SMS webhook, and would otherwise be filed as "a person
 * typing in the GHL inbox" — so the agent would later treat its own nudge as
 * something the two of them discussed. Writing it here as 'agent_outbound'
 * means recent_outreach picks it up and recent_other_channels does not.
 *
 * The write happens AFTER the send. A message that never left is not something
 * to remember sending, and a suggestion that reappears tomorrow is a far
 * smaller problem than one silently marked done.
 */

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendOutreach(input: {
  memberId: string;
  signal: string;
  channel: "sms" | "email";
  message: string;
  subject?: string;
  contactId?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<SendResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  const body = (input.message || "").trim();
  if (!body) return { ok: false, error: "Nothing to send." };

  let sent: { ok: boolean; error?: string };
  if (input.channel === "sms") {
    sent = await sendGhlSms({
      message: body,
      contactId: input.contactId ?? undefined,
      phone: input.phone ?? undefined,
      name: input.name ?? undefined,
    });
  } else {
    if (!input.email) return { ok: false, error: "No email address on file." };
    sent = await sendGhlEmail({
      email: input.email,
      subject: input.subject || "ShearQuery",
      // Plain text arrives with its line breaks intact only if they are made
      // into markup — a draft written with blank lines otherwise lands as one
      // paragraph.
      html: body.split("\n").map((l) => (l.trim() ? `<p>${l}</p>` : "")).join(""),
      name: input.name ?? undefined,
      contactId: input.contactId ?? undefined,
    });
  }

  if (!sent.ok) return { ok: false, error: sent.error || "GHL refused the send." };

  try {
    const db = createAdminClient();
    const { data: thread } = await (db.from("member_agent_threads") as any)
      .select("id")
      .eq("community_member_id", input.memberId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let threadId = thread?.id ?? null;
    if (!threadId) {
      const { data: made } = await (db.from("member_agent_threads") as any)
        .insert({ community_member_id: input.memberId, title: "Outreach" })
        .select("id")
        .single();
      threadId = made?.id ?? null;
    }

    if (threadId) {
      await (db.from("member_agent_messages") as any).insert({
        thread_id: threadId,
        role: "human",
        content: input.subject ? `${input.subject}\n\n${body}` : body,
        channel: input.channel,
        source: "agent_outbound",
      });
    }
  } catch {
    /*
     * The message is already delivered by this point. Failing to log it must
     * not be reported as a failed send — that invites a second send, which is
     * the one outcome worse than a missing record.
     */
  }

  /*
   * The cached draft is retired once it has gone out. Without this the same
   * suggestion returns on the next load — the ten-day quiet period would
   * eventually suppress it, but only once the send is visible as outreach, and
   * a card reappearing minutes after being sent is how somebody sends twice.
   */
  try {
    const db = createAdminClient();
    await (db.from("member_outreach_drafts") as any)
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("community_member_id", input.memberId)
      .eq("signal", input.signal)
      .eq("status", "pending");
  } catch {
    /* Already delivered. A stale card is a far smaller problem than a resend. */
  }

  revalidatePath("/admin/member-outreach");
  return { ok: true };
}

/**
 * Keep an edit without sending it.
 *
 * A draft someone reworded must survive the page reload, and must never be
 * regenerated afterwards — silently replacing somebody's wording is the fastest
 * way to stop anyone bothering to edit at all.
 */
export async function saveDraftEdit(input: {
  memberId: string;
  signal: string;
  channel: "sms" | "email";
  body: string;
  subject?: string;
}): Promise<SendResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const body = (input.body || "").trim();
  if (!body) return { ok: false, error: "Nothing to save." };

  try {
    const db = createAdminClient();
    await (db.from("member_outreach_drafts") as any).upsert(
      {
        community_member_id: input.memberId,
        signal: input.signal,
        channel: input.channel,
        subject: input.subject ?? null,
        body,
        origin: "ai",
        status: "pending",
        edited: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "community_member_id,signal" }
    );
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }

  revalidatePath("/admin/member-outreach");
  return { ok: true };
}

/**
 * Set this one aside.
 *
 * Dismissed rather than deleted, and the partial unique index only covers
 * 'pending' rows — so the record stays as history and the suggestion does not
 * come back on the next load.
 */
export async function dismissDraft(input: { memberId: string; signal: string }): Promise<SendResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const db = createAdminClient();
    await (db.from("member_outreach_drafts") as any)
      .update({ status: "dismissed", dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("community_member_id", input.memberId)
      .eq("signal", input.signal)
      .eq("status", "pending");
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
  revalidatePath("/admin/member-outreach");
  return { ok: true };
}

/**
 * Throw this wording away and write it again.
 *
 * Deletes the cached row rather than regenerating inline: the page's own
 * generation path already knows how to write one, and having a second place
 * that composes drafts is how the two drift.
 */
export async function regenerateDraft(input: { memberId: string; signal: string }): Promise<SendResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const db = createAdminClient();
    await (db.from("member_outreach_drafts") as any)
      .delete()
      .eq("community_member_id", input.memberId)
      .eq("signal", input.signal)
      .eq("status", "pending");
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
  revalidatePath("/admin/member-outreach");
  return { ok: true };
}
