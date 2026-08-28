"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMember } from "@/lib/member-context";
import type { PaymentStatus } from "@/lib/credit-report/model";
import {
  enrollmentForMember,
  updateEnrollment,
  addWorker,
  updateWorker,
  upsertWeek,
  rosterById,
  markInvited,
  newInviteToken,
  type Enrollment,
} from "@/lib/credit-report/store";
import { sendInviteSms, cooldownRemainingMs } from "@/lib/credit-report/invite";

/**
 * Owner-side writes.
 *
 * ONE GATE, USED BY EVERY ACTION. `ownedEnrollment()` resolves the signed-in
 * member and returns their enrollment, and `ownedRoster()` additionally proves a
 * roster row belongs to it. Nothing here takes an enrollment id from the client.
 *
 * That matters more here than almost anywhere else in this codebase: a write
 * that skipped the check would let one shop mark another shop's barber down as
 * unpaid. The damage would not be a broken page — it would be a false statement
 * about a real person, sitting in a record they show to employers.
 */

async function ownedEnrollment(): Promise<{ member: { id: string }; enrollment: Enrollment } | null> {
  const member = await currentMember();
  if (!member) return null;
  const enrollment = await enrollmentForMember(member.id);
  if (!enrollment) return null;
  return { member, enrollment };
}

async function ownedRoster(rosterId: string): Promise<Enrollment | null> {
  const owned = await ownedEnrollment();
  if (!owned) return null;
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("shop_roster")
    .select("id, enrollment_id")
    .eq("id", rosterId)
    .maybeSingle();
  if (!data || data.enrollment_id !== owned.enrollment.id) return null;
  return owned.enrollment;
}

const DENIED = { ok: false as const, error: "You do not have a shop enrolled, or that record is not yours." };

export async function updateShopAction(patch: {
  shopName?: string;
  address?: string;
  email?: string;
  smsPhone?: string;
  shopLicenseNumber?: string;
  dueDay?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const owned = await ownedEnrollment();
  if (!owned) return DENIED;

  const res = await updateEnrollment(owned.enrollment.id, patch);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-reporting");
  return { ok: true };
}

export type InviteOutcome = "sent" | "no_phone" | "not_configured" | "failed";

export async function addWorkerAction(input: {
  name: string;
  phone?: string;
  rentPerWeek?: string;
  startedAt?: string;
}): Promise<{ ok: boolean; inviteToken?: string | null; invite?: InviteOutcome; error?: string }> {
  const owned = await ownedEnrollment();
  if (!owned) return DENIED;
  if (!input.name?.trim()) return { ok: false, error: "A name is required." };

  const rent = input.rentPerWeek ? Number(input.rentPerWeek) : null;
  if (rent != null && (!Number.isFinite(rent) || rent < 0)) {
    return { ok: false, error: "Weekly rent has to be a number." };
  }

  const res = await addWorker(owned.enrollment, {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    rentPerWeek: rent,
    startedAt: input.startedAt || null,
  });
  if (!res.ok) return { ok: false, error: res.error };

  /*
   * The invite goes out here, not in addWorker(). The store writes rows; a
   * store function that also sent texts would make every future caller —
   * including an import or a backfill — a silent mass-texting risk.
   *
   * A FAILED SEND IS NOT A FAILED ADD. The roster row is real either way, the
   * shop can still report on it, and rolling it back would lose the owner's
   * work because a carrier was unreachable. The outcome is reported so the UI
   * can say what actually happened instead of implying a text landed.
   */
  let invite: InviteOutcome = "no_phone";
  if (res.inviteToken && input.phone?.trim()) {
    const sent = await sendInviteSms({
      shopName: owned.enrollment.shopName,
      barberName: input.name.trim(),
      phone: input.phone.trim(),
      token: res.inviteToken,
    });
    invite = sent.ok ? "sent" : sent.skipped ? "not_configured" : "failed";
    if (sent.ok) await markInvited(res.id!, res.inviteToken);
  }

  revalidatePath("/account/credit-reporting");
  return { ok: true, inviteToken: res.inviteToken ?? null, invite };
}

/**
 * Send the invite again.
 *
 * FOUR REFUSALS, each for a different reason worth telling the owner apart:
 * no number to text, already claimed (so there is nothing to claim), still
 * inside the cooldown, or the send itself failed. A single "couldn't resend"
 * would leave them guessing which.
 */
export async function resendInviteAction(
  rosterId: string
): Promise<{ ok: boolean; error?: string; retryInSeconds?: number }> {
  const enrollment = await ownedRoster(rosterId);
  if (!enrollment) return DENIED;

  const worker = await rosterById(rosterId);
  if (!worker) return { ok: false, error: "That person is not on your roster." };

  if (worker.claimedAt) {
    return { ok: false, error: `${worker.barberName} has already claimed this record.` };
  }
  if (!worker.barberPhone) {
    return { ok: false, error: "Add a mobile number for them first — there is nowhere to send it." };
  }

  const wait = cooldownRemainingMs(worker.invitedAt);
  if (wait > 0) {
    return {
      ok: false,
      retryInSeconds: Math.ceil(wait / 1000),
      error: `Already sent recently. You can send again in ${Math.ceil(wait / 60000)} min.`,
    };
  }

  // A row added before the number existed has no token yet. Mint one rather
  // than refusing — the alternative is deleting and re-adding the person,
  // which would throw away their payment history.
  const token = worker.inviteToken ?? newInviteToken();

  const sent = await sendInviteSms({
    shopName: enrollment.shopName,
    barberName: worker.barberName,
    phone: worker.barberPhone,
    token,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error: sent.skipped
        ? "Texting is not configured on this deployment yet."
        : sent.error || "Could not send that text.",
    };
  }

  await markInvited(rosterId, token);
  revalidatePath("/account/credit-reporting");
  return { ok: true };
}

export async function updateWorkerAction(
  rosterId: string,
  patch: { name?: string; phone?: string | null; rentPerWeek?: string | null; status?: "active" | "ended" }
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownedRoster(rosterId))) return DENIED;

  const rent =
    patch.rentPerWeek === undefined ? undefined : patch.rentPerWeek ? Number(patch.rentPerWeek) : null;
  if (rent != null && rent !== undefined && (!Number.isFinite(rent) || rent < 0)) {
    return { ok: false, error: "Weekly rent has to be a number." };
  }

  const res = await updateWorker(rosterId, {
    name: patch.name,
    phone: patch.phone,
    rentPerWeek: rent as number | null | undefined,
    status: patch.status,
    // Ending a placement dates it today rather than leaving it open, so the
    // report can say when somebody left rather than implying they never did.
    endedAt: patch.status === "ended" ? new Date().toISOString().slice(0, 10) : undefined,
  });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-reporting");
  return { ok: true };
}

/**
 * Record or correct one week for one barber.
 *
 * CORRECTION IS THE NORMAL CASE, NOT THE EXCEPTION. An owner reconstructing
 * six months from memory will get some of it wrong, and a system that only
 * appends forces a choice between an inaccurate record and no record. Setting
 * a week back to "no_record" deletes the row entirely — an owner who realises
 * they never actually knew must be able to say so, rather than being stuck
 * choosing between paid and unpaid.
 */
export async function setWeekAction(
  rosterId: string,
  week: { weekStart: string; status: PaymentStatus; daysLate?: number | null; note?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const enrollment = await ownedRoster(rosterId);
  if (!enrollment) return DENIED;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week.weekStart)) {
    return { ok: false, error: "That week is not a valid date." };
  }
  // A record cannot be written about a week that has not happened.
  if (new Date(`${week.weekStart}T00:00:00Z`).getTime() > Date.now()) {
    return { ok: false, error: "That week hasn't happened yet." };
  }

  const res = await upsertWeek(rosterId, week, enrollment.smsPhone);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-reporting");
  revalidatePath("/account/credit-report");
  return { ok: true };
}
