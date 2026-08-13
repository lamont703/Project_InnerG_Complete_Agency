"use server";

import { revalidatePath } from "next/cache";
import { currentMember, saveJourney, setAudience, type JourneyInput } from "@/lib/member-context";
import type { JourneyState, LicenseTrack } from "@/lib/member-journey";

/**
 * Save the member's journey.
 *
 * The member id comes from the session inside saveJourneyAction — never from
 * the form. A server action is a public HTTP endpoint with a nicer syntax, and
 * accepting an id from its arguments would let anyone rewrite anyone's exam
 * date by editing one string.
 */
export async function saveJourneyAction(input: {
  state?: string | null;
  track?: string | null;
  schoolName?: string | null;
  examDate?: string | null;
  zip?: string | null;
  hoursCompleted?: string | null;
  hoursRequired?: string | null;
  licensed?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "You need to be signed in." };

  // Someone filling in a student journey is a student, whatever the query
  // string said on the way in. Only ever widens a null — an owner who fills
  // this in stays an owner, since they may well be both.
  if (!member.audience) await setAudience(member.id, "student");

  const toInt = (v: string | null | undefined) => {
    if (v === undefined || v === null || v.trim() === "") return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const patch: JourneyInput = {
    state: (input.state || null) as JourneyState | null,
    track: (input.track || null) as LicenseTrack | null,
    schoolName: input.schoolName ?? null,
    examDate: input.examDate || null,
    zip: input.zip || null,
    hoursCompleted: toInt(input.hoursCompleted),
    hoursRequired: toInt(input.hoursRequired),
  };

  // `licensed` is a checkbox, so its absence is a real "no" rather than "not
  // submitted" — clearing the date is how someone corrects a mis-tick.
  if (input.licensed !== undefined) {
    patch.licensedAt = input.licensed ? new Date().toISOString() : null;
  }

  const result = await saveJourney(member.id, patch);
  if (result.ok) revalidatePath("/account/journey");
  return result;
}
