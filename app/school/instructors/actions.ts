"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { addInstructor, firstSchool } from "@/lib/school/store";
import {
  assignBlockInstructor,
  issueInstructorClaimToken,
  setInstructorActive,
} from "@/lib/school/learning-store";

/** Every write here re-checks isAdmin(): the middleware gate fails open. */

export async function addInstructorAction(f: {
  name: string; licenseNumber: string; email: string;
}): Promise<{ ok: boolean; claimToken?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const school = await firstSchool();
  if (!school) return { ok: false, error: "No school on file." };

  const res = await addInstructor({
    schoolId: school.id, name: f.name,
    licenseNumber: f.licenseNumber, email: f.email,
  });
  if (res.ok) revalidatePath("/school/instructors");
  return res;
}

export async function setActiveAction(
  instructorId: string, active: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const res = await setInstructorActive(instructorId, active);
  if (res.ok) {
    revalidatePath("/school/instructors");
    revalidatePath("/school/validation");
  }
  return res;
}

export async function assignBlockAction(
  blockId: string, instructorId: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const res = await assignBlockInstructor({ blockId, instructorId });
  if (res.ok) revalidatePath("/school/instructors");
  return res;
}

export async function issueInstructorLinkAction(
  instructorId: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const token = await issueInstructorClaimToken(instructorId);
  if (!token) {
    return { ok: false, error: "This instructor has already set up their account, so a new link would do nothing." };
  }
  revalidatePath("/school/instructors");
  return { ok: true, token };
}
