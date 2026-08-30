"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { voidPunch } from "@/lib/school/store";

/**
 * Voiding a punch, from the ledger.
 *
 * CHECKS AUTH ITSELF, on top of the middleware gate. Voiding is the most
 * consequential write in the system — it changes what a student's hour record
 * says — and the middleware fails open on an auth exception.
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
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!reason?.trim()) return { ok: false, error: "Give a reason — a void without one is a deletion." };

  const res = await voidPunch({ punchId, reason, by: "unattributed (no staff accounts yet)" });
  if (!res.ok) return res;

  revalidatePath(`/school/students/${punchId}`);
  revalidatePath("/school/roster");
  return { ok: true };
}
