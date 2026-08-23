"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { createSession, saveShot, saveStyle, fetchSession, signShots } from "@/lib/hairstyle/store";
import { buildBarberRequest, type BarberRequest } from "@/lib/hairstyle/request";
import type { FadeSpec } from "@/lib/fade-geometry";
import type { ShotId } from "@/lib/hairstyle/capture";

/**
 * Every action re-verifies the caller. Middleware gates this route but fails
 * OPEN on an auth exception, and these read and write photographs of a person.
 */

const VALID_SHOTS: ShotId[] = ["front", "left", "right", "back", "top"];

export async function startSession(name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const s = await createSession(name || null);
    revalidatePath("/admin/hairstyle-selector");
    return { ok: true, id: s.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start." };
  }
}

export async function uploadShot(form: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  const sessionId = String(form.get("sessionId") ?? "");
  const shot = String(form.get("shot") ?? "") as ShotId;
  const file = form.get("file");

  if (!sessionId) return { ok: false, error: "Missing session." };
  if (!VALID_SHOTS.includes(shot)) return { ok: false, error: "Unknown angle." };
  if (!(file instanceof File)) return { ok: false, error: "No photo received." };
  // The bucket caps this too; refusing here saves the round trip.
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "That photo's too big — under 15MB please." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "That isn't an image." };

  try {
    const saved = await saveShot(sessionId, shot, await file.arrayBuffer(), file.type);
    if (!saved.ok) return { ok: false, error: saved.error };
    // Signed, never public — see lib/hairstyle/store.ts.
    const signed = await signShots({ [shot]: saved.path });
    revalidatePath("/admin/hairstyle-selector");
    return { ok: true, url: signed[shot] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function chooseStyle(input: {
  sessionId: string;
  spec: FadeSpec;
  lengthInches: number | null;
  clientNote: string | null;
}): Promise<{ ok: boolean; request?: BarberRequest; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  if (!input.sessionId) return { ok: false, error: "Missing session." };

  const len = input.lengthInches;
  if (len != null && (!Number.isFinite(len) || len < 0 || len > 24)) {
    return { ok: false, error: "That length doesn't look right." };
  }

  try {
    const { request } = buildBarberRequest(input.spec, {
      length: len == null ? null : { currentInches: len, source: "self_reported" },
      clientNote: input.clientNote,
    });
    await saveStyle(input.sessionId, {
      fadeSpec: input.spec,
      currentLengthInches: len,
      clientNote: input.clientNote,
      request,
      status: "ready",
    });
    revalidatePath("/admin/hairstyle-selector");
    return { ok: true, request };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not build the request." };
  }
}

/**
 * Marks the request as handed over.
 *
 * DOES NOT ACTUALLY SEND ANYTHING YET, and says so on the page. While this is
 * an internal demo the barber and the client are the same person; wiring a real
 * SMS would be sending Lamont a text about Lamont. The send path is the GHL
 * outbound already used by the rebooking agent, and plugging it in is small —
 * but it should happen when there is a second person to send to.
 */
export async function sendToBarber(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  try {
    const s = await fetchSession(sessionId);
    if (!s?.request) return { ok: false, error: "Nothing to send yet." };
    await saveStyle(sessionId, { status: "sent" });
    revalidatePath("/admin/hairstyle-selector");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send." };
  }
}
