"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { addInstructor, firstSchool, validatePunches } from "@/lib/school/store";
import { instructorForUser } from "@/lib/school/learning-store";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Signing for distance hours.
 *
 * CHECKS AUTH ITSELF on top of the middleware gate, for the same reason voiding
 * does: middleware.ts fails open on an auth exception, and this write puts a
 * named person's signature against a compliance record.
 *
 * THE INSTRUCTOR IS CHOSEN, NOT AUTHENTICATED. Whoever is behind the Internal
 * Tools password picks a name from the list. That is an assertion by the
 * school, not proof by the system, and the page says so in as many words — the
 * failure this whole feature exists to avoid is a record that looks stronger
 * than it is.
 */
export async function validateAction(
  punchIds: string[],
  instructorId: string
): Promise<{ ok: boolean; signed?: number; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!instructorId) return { ok: false, error: "Choose who is signing for these hours." };

  /*
   * THE METHOD IS DERIVED, NOT DECLARED. If the person at the console is
   * themselves the instructor being named — which is the normal case at a small
   * school where the owner teaches — the signature is genuinely theirs and is
   * recorded as such. Anyone signing for somebody else is recorded as having
   * asserted it. Neither is refused; they are simply not the same fact, and
   * letting the console choose its own label would make the distinction
   * decorative.
   */
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const self = user ? await instructorForUser(user.id) : null;
  const method = self && self.id === instructorId ? "instructor" : "asserted_by_admin";

  const res = await validatePunches({ punchIds, instructorId, method });
  if (!res.ok) return res;

  revalidatePath("/school/validation");
  revalidatePath("/school/roster");
  return res;
}

export async function addInstructorAction(f: {
  name: string;
  licenseNumber: string;
  email: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const school = await firstSchool();
  if (!school) return { ok: false, error: "No school on file." };

  const res = await addInstructor({
    schoolId: school.id,
    name: f.name,
    licenseNumber: f.licenseNumber,
    email: f.email,
  });
  if (res.ok) revalidatePath("/school/validation");
  return res;
}
