"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { voidPunch } from "@/lib/school/store";
import { issueClaimToken } from "@/lib/school/learning-store";

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

/**
 * Issue (or re-issue) the link a student uses to set up their account.
 *
 * RE-ISSUING REPLACES THE OLD LINK. That is the point: the commonest reason to
 * need one is that the first went to a wrong number or a dead phone, and
 * leaving both live would mean the wrong recipient could still claim the record.
 * issueClaimToken() refuses outright once a record has been claimed, so this
 * cannot be used to take an account away from the student holding it.
 */
export async function issueClaimLinkAction(
  studentId: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const token = await issueClaimToken(studentId);
  if (!token) {
    return { ok: false, error: "This student has already set up their account, so a new link would do nothing." };
  }
  revalidatePath(`/school/students/${studentId}`);
  return { ok: true, token };
}
