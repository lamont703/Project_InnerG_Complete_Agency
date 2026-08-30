"use server";

import { revalidatePath } from "next/cache";
import { voidPunch } from "@/lib/school/store";

/**
 * Voiding a punch, from the ledger.
 *
 * STAFF-FACING AND NOT YET GATED, same as the roster. This changes somebody's
 * hour record, so when an auth boundary lands around the school console this is
 * one of the first places it belongs. Noted rather than assumed, because the
 * kiosk next door is deliberately open and the two must not be confused.
 *
 * `by` is a placeholder until there are staff accounts. It is recorded rather
 * than left null on purpose — a void whose author is unknown is only marginally
 * better than a deletion, and writing "unattributed" makes the gap visible in
 * the trail instead of looking like a complete record.
 */
export async function voidPunchAction(
  punchId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  if (!reason?.trim()) return { ok: false, error: "Give a reason — a void without one is a deletion." };

  const res = await voidPunch({ punchId, reason, by: "unattributed (no staff accounts yet)" });
  if (!res.ok) return res;

  revalidatePath(`/school/students/${punchId}`);
  revalidatePath("/school/roster");
  return { ok: true };
}
