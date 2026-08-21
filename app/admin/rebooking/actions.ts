"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { fetchRebookingQueue } from "@/lib/rebooking/queue";
import { reviewNotes, type NoteProposal } from "@/lib/rebooking/note-agent";
import { logOutreach } from "@/lib/rebooking/outreach-log";
import { bucketFor } from "@/lib/rebooking/baseline";
import { runRebookingAgent } from "@/lib/rebooking/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConsentCampaign } from "@/lib/sms-consent/campaign";
import { syncPendingConsent } from "@/lib/sms-consent/store";
import { reconcileRedemptions } from "@/lib/offers/haircut-offer";
import {
  saveNote,
  markContacted,
  reactivate,
  type InactiveReason,
  type NoteStatus,
} from "@/lib/rebooking/notes";

/**
 * Writing down what the barber knows about a client.
 *
 * EVERY ACTION RE-VERIFIES THE CALLER. Middleware gates /admin/rebooking, but
 * it fails OPEN on an auth exception and these write with the service-role
 * client — the same defence-in-depth the ad-campaign and content-publisher
 * actions keep. rebooking_client_notes has RLS on with no policies, so
 * service-role is the only thing that can touch it and isAdmin() is the actual
 * boundary.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_STATUS: NoteStatus[] = ["active", "snoozed", "inactive", "reduced"];
const VALID_REASON: InactiveReason[] = [
  "moved",
  "switched_barber",
  "no_longer_local",
  "passed_away",
  "other",
];

/** Free text has to be bounded — this is a note, not a document. */
const MAX_NOTE_LENGTH = 2000;

export async function saveClientNote(input: {
  shopifyCustomerId: string;
  clientName?: string | null;
  note?: string | null;
  status?: NoteStatus;
  snoozeUntil?: string | null;
  inactiveReason?: InactiveReason | null;
  cadenceOverrideDays?: number | null;
  mergedIntoCustomerId?: string | null;
  reducedServices?: string | null;
}): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!input.shopifyCustomerId) return { ok: false, error: "Missing client." };

  if (input.status && !VALID_STATUS.includes(input.status)) {
    return { ok: false, error: "Unknown status." };
  }
  if (input.inactiveReason && !VALID_REASON.includes(input.inactiveReason)) {
    return { ok: false, error: "Unknown reason." };
  }
  if (typeof input.note === "string" && input.note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note is too long (max ${MAX_NOTE_LENGTH} characters).` };
  }

  // A snooze with no date reappears immediately, which is confusing to do
  // silently — better to refuse and let the date be filled in.
  if (input.status === "snoozed" && !input.snoozeUntil) {
    return { ok: false, error: "Pick a date to snooze until." };
  }
  if (input.snoozeUntil && !/^\d{4}-\d{2}-\d{2}$/.test(input.snoozeUntil)) {
    return { ok: false, error: "Snooze date must be YYYY-MM-DD." };
  }

  const override = input.cadenceOverrideDays;
  if (override != null && (!Number.isFinite(override) || override <= 0 || override > 730)) {
    return { ok: false, error: "Cadence override must be between 1 and 730 days." };
  }

  if (typeof input.reducedServices === "string" && input.reducedServices.length > 200) {
    return { ok: false, error: "Keep that short — what do they still come in for?" };
  }

  // Marking someone active again must clear the things that were hiding them,
  // or they stay out of the queue with a status that says they shouldn't be.
  // 'reduced' clears the same fields: a reduced client is not snoozed and has
  // not left, and leaving a stale reason on them would read as though they had.
  const normalized =
    input.status === "active" || input.status === "reduced"
      ? { ...input, snoozeUntil: null, inactiveReason: null }
      : input;

  try {
    await saveNote(normalized);
    revalidatePath("/admin/rebooking");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save note." };
  }
}

/**
 * Record that outreach went out.
 *
 * TWO WRITES, AND BOTH MATTER. The note stamp is what stops the queue chasing
 * them again for a fortnight; the outreach row is the only evidence the agent
 * ever did anything, and without it there is nothing to attribute impact to
 * later. The state at send time is frozen into the log here rather than looked
 * up at report time, because the client's cadence moves as they visit and a
 * recomputed figure would compare the send against the wrong baseline bucket.
 */
export async function markClientContacted(
  shopifyCustomerId: string,
  clientName?: string | null,
  context?: {
    channel?: "sms" | "email" | "manual";
    cadenceDays?: number | null;
    daysOverdue?: number | null;
    annualValue?: number | null;
    averageTicket?: number | null;
    costCents?: number;
  },
): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!shopifyCustomerId) return { ok: false, error: "Missing client." };
  try {
    await markContacted(shopifyCustomerId, clientName);
    await logOutreach({
      shopifyCustomerId,
      clientName: clientName ?? null,
      channel: context?.channel ?? "manual",
      cadenceDays: context?.cadenceDays ?? null,
      daysOverdue: context?.daysOverdue ?? null,
      latenessBucket: context?.daysOverdue != null ? bucketFor(context.daysOverdue) : null,
      annualValue: context?.annualValue ?? null,
      averageTicket: context?.averageTicket ?? null,
      costCents: context?.costCents ?? 0,
    });
    revalidatePath("/admin/rebooking");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record contact." };
  }
}

export async function reactivateClient(shopifyCustomerId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!shopifyCustomerId) return { ok: false, error: "Missing client." };
  try {
    await reactivate(shopifyCustomerId);
    revalidatePath("/admin/rebooking");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reactivate." };
  }
}

/**
 * THE "RE-READ MY NOTES" BUTTON.
 *
 * Re-pulls the queue and asks the note agent what the free text implies that
 * the structured fields are missing. Returns PROPOSALS only — nothing is
 * applied here. Applying is a second, explicit click that goes through
 * saveClientNote() like any other edit.
 */
export async function reviewClientNotes(): Promise<
  | { ok: true; proposals: NoteProposal[]; reviewed: number }
  | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const queue = await fetchRebookingQueue();
    if (queue.notConfigured) return { ok: false, error: "Shopify is not connected." };

    const everyone = [...queue.clients, ...queue.setAside, ...queue.recentlyContacted];
    const withNotes = everyone.filter((c) => c.note?.note?.trim());

    // The roster is the QUEUE'S roster, not just who is due — a duplicate's
    // real record is usually the one that is up to date and therefore absent
    // from the queue.
    const result = await reviewNotes(withNotes, queue.roster);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, proposals: result.proposals, reviewed: result.reviewed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not review notes." };
  }
}

/** Apply one proposal the barber accepted. */
export async function applyProposal(p: NoteProposal): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  if (p.action === "merge" && p.mergeTargetId) {
    return saveClientNote({ shopifyCustomerId: p.customerId, mergedIntoCustomerId: p.mergeTargetId });
  }
  if (p.action === "snooze" && p.snoozeUntil) {
    return saveClientNote({ shopifyCustomerId: p.customerId, status: "snoozed", snoozeUntil: p.snoozeUntil });
  }
  if (p.action === "inactive") {
    return saveClientNote({
      shopifyCustomerId: p.customerId,
      status: "inactive",
      inactiveReason: p.inactiveReason ?? "other",
    });
  }
  if (p.action === "reduced") {
    return saveClientNote({
      shopifyCustomerId: p.customerId,
      status: "reduced",
      reducedServices: p.reducedServices ?? null,
      cadenceOverrideDays: p.cadenceDays ?? null,
    });
  }
  if (p.action === "cadence" && p.cadenceDays) {
    return saveClientNote({ shopifyCustomerId: p.customerId, cadenceOverrideDays: p.cadenceDays });
  }
  return { ok: false, error: "Nothing to apply." };
}

/**
 * The on/off switch and its guardrails.
 *
 * Deliberately one action for all of it: enabling while leaving a stale
 * 50-a-day cap in place is the kind of mistake a split API invites, and this
 * way every change is validated against the others in one place.
 */
export async function saveAgentSettings(input: {
  enabled: boolean;
  dryRun: boolean;
  dailyCap: number;
  channels: "sms" | "sms_and_email";
  startHour: number;
  endHour: number;
}): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  if (!Number.isInteger(input.dailyCap) || input.dailyCap < 0 || input.dailyCap > 50) {
    return { ok: false, error: "Daily cap must be between 0 and 50." };
  }
  if (!Number.isInteger(input.startHour) || input.startHour < 0 || input.startHour > 23) {
    return { ok: false, error: "Start hour must be 0–23." };
  }
  if (!Number.isInteger(input.endHour) || input.endHour < 1 || input.endHour > 24) {
    return { ok: false, error: "End hour must be 1–24." };
  }
  if (input.endHour <= input.startHour) {
    // An inverted window silently matches nothing, so the agent would look
    // enabled and never send — the worst kind of failure, because it is quiet.
    return { ok: false, error: "The end hour has to be after the start hour." };
  }
  if (input.enabled && input.dailyCap === 0) {
    return { ok: false, error: "A cap of 0 means it can never send. Turn it off instead." };
  }

  try {
    const db = createAdminClient();
    const { error } = await (db.from("rebooking_agent_settings") as any)
      .update({
        enabled: input.enabled,
        dry_run: input.dryRun,
        daily_cap: input.dailyCap,
        channels: input.channels,
        send_start_hour: input.startHour,
        send_end_hour: input.endHour,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/rebooking");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save settings." };
  }
}

/** Run the agent right now, from the UI, without waiting for the cron. */
export async function runAgentNow(): Promise<
  { ok: true; result: Awaited<ReturnType<typeof runRebookingAgent>> } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const result = await runRebookingAgent();
    revalidatePath("/admin/rebooking");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Run failed." };
  }
}

/**
 * Invite clients to opt in to texts.
 *
 * TARGETS ARE ONLY THOSE WITHOUT SMS CONSENT. Asking someone who already
 * subscribed to subscribe again reads as though nobody is paying attention, and
 * the campaign lib additionally skips anyone who already has a record — so
 * running this repeatedly tops the list up rather than re-asking.
 */
export async function sendSmsConsentCampaign(input: {
  limit: number;
  dryRun: boolean;
}): Promise<
  { ok: true; result: Awaited<ReturnType<typeof sendConsentCampaign>> } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200) {
    return { ok: false, error: "Batch size must be between 1 and 200." };
  }

  try {
    const queue = await fetchRebookingQueue();
    if (queue.notConfigured) return { ok: false, error: "Shopify is not connected." };

    /*
     * WHO GETS ASKED, AND WHO EMPHATICALLY DOES NOT.
     *
     * A dry run over the real list caught this before a single email went out.
     * Targeting everyone modelled would have emailed Justin Avery, whose note
     * says he moved to Las Vegas, and would have emailed Anthony Bennett twice
     * and Kedrick Emanuel once because those are duplicate records of people
     * already on the list. Asking a client who left whether he wants reminders
     * about coming back is the exact tone-deafness the notes exist to prevent.
     *
     * So: no one marked inactive, and no duplicate records. Snoozed and reduced
     * clients ARE asked — they have not gone anywhere, and consent collected
     * now is consent already in place when they return.
     */
    const all = [...queue.clients, ...queue.setAside, ...queue.recentlyContacted];
    const targets = all
      .filter((c) => !c.smsSubscribed && c.email)
      .filter((c) => c.note?.status !== "inactive")
      .filter((c) => !c.note?.mergedIntoCustomerId)
      .map((c) => ({ shopifyCustomerId: c.customerId, clientName: c.name, email: c.email }));

    const result = await sendConsentCampaign(targets, { limit: input.limit, dryRun: input.dryRun });
    revalidatePath("/admin/rebooking");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Campaign failed." };
  }
}

/** Replay confirmations Shopify hasn't accepted yet. */
export async function retryConsentSync(): Promise<
  { ok: true; result: Awaited<ReturnType<typeof syncPendingConsent>> } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const result = await syncPendingConsent();
    revalidatePath("/admin/rebooking");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed." };
  }
}

/** Match issued codes against orders that used them. */
export async function reconcileOfferRedemptions(): Promise<
  { ok: true; result: Awaited<ReturnType<typeof reconcileRedemptions>> } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const result = await reconcileRedemptions();
    revalidatePath("/admin/rebooking");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check redemptions." };
  }
}
