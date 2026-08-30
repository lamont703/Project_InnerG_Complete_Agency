"use server";

import { revalidatePath } from "next/cache";
import { enrolStudent, firstSchool, programsFor } from "@/lib/school/store";

/**
 * Enrolment, from the front desk.
 *
 * NOT PUBLIC. /school/roster is staff-facing and this action writes a real
 * student record — the moment there is an auth boundary around the school
 * console, it goes here first. It is called out rather than left implicit
 * because the kiosk next door is deliberately unauthenticated, and the two must
 * not be confused: that one can only clock somebody in, this one creates a
 * person.
 */
export async function enrolStudentAction(input: {
  programId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<{ ok: boolean; clockCode?: string; error?: string }> {
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

  const res = await enrolStudent({
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
