"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { addInstructor, firstSchool, validatePunches } from "@/lib/school/store";

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

  const res = await validatePunches({ punchIds, instructorId });
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
