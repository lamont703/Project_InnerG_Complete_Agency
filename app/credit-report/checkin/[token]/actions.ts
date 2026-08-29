"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/lib/credit-report/model";
import { completeCheckin, resolveCheckin, setPresence, upsertWeek } from "@/lib/credit-report/store";

/**
 * Writes made from a check-in link.
 *
 * THE TOKEN IS THE ONLY CREDENTIAL, because the person answering is a shop
 * owner on their phone who is not signed in and should not have to be. That
 * puts the whole burden on two checks, and both run on every single write:
 *
 *   1. The token still resolves — unknown or expired is refused.
 *   2. The roster row belongs to THAT token's enrollment.
 *
 * Without the second check, a valid token from any shop would be a licence to
 * write payment statements about any barber in the system. That is not a
 * broken page; it is a false record about a real person, in the one place they
 * show to employers.
 */

async function scopedRoster(token: string, rosterId: string) {
  const resolved = await resolveCheckin(token);
  if (!resolved) return null;

  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("shop_roster")
    .select("id, enrollment_id")
    .eq("id", rosterId)
    .maybeSingle();

  if (!data || data.enrollment_id !== resolved.enrollment.id) return null;
  return resolved;
}

const DENIED = { ok: false as const, error: "This check-in link has expired. The next one is on its way." };

export async function recordWeekAction(
  token: string,
  rosterId: string,
  weekStart: string,
  status: PaymentStatus
): Promise<{ ok: boolean; error?: string }> {
  const resolved = await scopedRoster(token, rosterId);
  if (!resolved) return DENIED;

  if (new Date(`${weekStart}T00:00:00Z`).getTime() > Date.now()) {
    return { ok: false, error: "That week hasn't happened yet." };
  }

  const res = await upsertWeek(
    rosterId,
    { weekStart, status, daysLate: status === "late" ? 1 : null },
    resolved.enrollment.smsPhone
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function setPresenceAction(
  token: string,
  rosterId: string,
  stillHere: boolean
): Promise<{ ok: boolean; error?: string }> {
  const resolved = await scopedRoster(token, rosterId);
  if (!resolved) return DENIED;

  const res = await setPresence(rosterId, stillHere);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function finishCheckinAction(token: string): Promise<{ ok: boolean }> {
  const resolved = await resolveCheckin(token);
  if (!resolved) return { ok: false };
  await completeCheckin(resolved.checkin.id);
  return { ok: true };
}
