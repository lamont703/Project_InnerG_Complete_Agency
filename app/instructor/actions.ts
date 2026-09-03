"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { validatePunches } from "@/lib/school/store";
import {
  blocksForInstructor,
  claimInstructor,
  instructorForUser,
} from "@/lib/school/learning-store";

/**
 * Signing as yourself.
 *
 * NO isAdmin() HERE, and that is the point of this route existing. An
 * instructor is not an administrator and must never need the Internal Tools
 * password to do their own job. Identity comes from their session, and the only
 * thing it authorises is signing for the classes they are down to teach.
 */
export async function claimInstructorAction(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!token?.trim()) return { ok: false, error: "Paste the link your school sent you." };

  const res = await claimInstructor({ token: token.trim(), userId: user.id });
  if (res.ok) revalidatePath("/instructor");
  return { ok: res.ok, error: res.error };
}

export async function signAsSelfAction(
  punchIds: string[]
): Promise<{ ok: boolean; signed?: number; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const me = await instructorForUser(user.id);
  if (!me) return { ok: false, error: "This account is not linked to an instructor record." };
  if (!me.active) return { ok: false, error: "This instructor record is inactive. Talk to the school." };
  if (!punchIds.length) return { ok: false, error: "Nothing selected." };

  /*
   * THE PUNCH IDS ARE RE-CHECKED AGAINST THIS INSTRUCTOR'S OWN CLASSES. They
   * arrive from the browser, and without this an instructor could sign for
   * sessions of a class they do not teach — which is exactly the attribution
   * the signature is supposed to establish. The page already filters; a page
   * filter is a convenience, not a control.
   */
  const mine = await blocksForInstructor(me.id);
  const { pendingValidation } = await import("@/lib/school/store");
  const allowed = await pendingValidation(me.schoolId, 500, { blockIds: mine });
  const allowedIds = new Set(allowed.map((p) => p.punchId));
  const filtered = punchIds.filter((id) => allowedIds.has(id));

  if (filtered.length === 0) {
    return { ok: false, error: "Those sessions are not yours to sign." };
  }

  const res = await validatePunches({
    punchIds: filtered,
    instructorId: me.id,
    // Authenticated: this person is signed in and signing for their own class.
    method: "instructor",
  });
  if (res.ok) revalidatePath("/instructor");
  return res;
}
