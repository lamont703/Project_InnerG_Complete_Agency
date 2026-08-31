"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { enrollStudent, firstSchool, programsFor } from "@/lib/school/store";

/**
 * Enrollment, from the front desk.
 *
 * CHECKS AUTH ITSELF. A server action is a POST to a route, so the middleware
 * gate on /school/roster does cover it — but that middleware fails open, and
 * this action creates a person. A write surface cannot rely on a gate that
 * fails open.
 */
export async function enrollStudentAction(input: {
  programId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<{ ok: boolean; clockCode?: string; claimToken?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  const school = await firstSchool();
  if (!school) return { ok: false, error: "No school is set up." };

  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  if (!firstName || !lastName) return { ok: false, error: "First and last name are required." };

  // The program has to belong to THIS school. A program id arriving in a
  // request body is a claim, and enrolling a student into another school's
  // program would put their hours under the wrong ceilings.
  const programs = await programsFor(school.id);
  if (!programs.some((p) => p.id === input.programId)) {
    return { ok: false, error: "Choose a program." };
  }

  const res = await enrollStudent({
    schoolId: school.id,
    programId: input.programId,
    firstName, lastName,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    enrolledOn: new Date().toISOString().slice(0, 10),
  });

  if (!res.ok) return res;
  revalidatePath("/school/roster");
  return res;
}
