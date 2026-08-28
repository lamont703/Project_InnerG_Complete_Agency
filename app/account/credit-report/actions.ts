"use server";

import { revalidatePath } from "next/cache";
import { currentMember } from "@/lib/member-context";
import { createShare, revokeShare, claimInvite } from "@/lib/credit-report/store";

/**
 * Share and claim actions, all scoped to the signed-in member.
 *
 * EVERY ONE OF THESE RE-RESOLVES THE MEMBER SERVER-SIDE. None of them takes a
 * member id as an argument, because an action that accepted one would be a way
 * to mint a share link for somebody else's payment history — which is the only
 * promise this product actually makes.
 */

export async function createShareAction(
  label: string,
  days: number
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Sign in first." };

  // Bounded rather than free-form: a "share link" good for five years is a
  // published record wearing a different word.
  const window = Math.min(Math.max(Math.round(days) || 30, 1), 180);

  const res = await createShare(member.id, label.trim() || null, window);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-report");
  return { ok: true, token: res.share!.token };
}

export async function revokeShareAction(shareId: string): Promise<{ ok: boolean; error?: string }> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Sign in first." };
  const res = await revokeShare(member.id, shareId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-report");
  return { ok: true };
}

export async function claimInviteAction(token: string): Promise<{ ok: boolean; error?: string }> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Sign in first." };
  const res = await claimInvite(token, member.id);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/account/credit-report");
  return { ok: true };
}
