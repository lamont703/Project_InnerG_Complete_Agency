import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FadeSpec } from "@/lib/fade-geometry";
import type { BarberRequest } from "./request";
import type { ShotId } from "./capture";

/**
 * Sessions and their photos.
 *
 * SIGNED URLS, NOT PUBLIC ONES. The bucket is private — the only private one in
 * this project — because the objects are photographs of a named person's head.
 * Every read mints a short-lived signed URL rather than handing out a path that
 * works forever.
 */

export const SHOTS_BUCKET = "hairstyle-shots";

/** Long enough to load a page, short enough that a copied URL stops working. */
const SIGNED_URL_TTL_SECONDS = 60 * 30;

export interface HairstyleSession {
  id: string;
  subjectName: string | null;
  shots: Partial<Record<ShotId, string>>;
  fadeSpec: FadeSpec | null;
  currentLengthInches: number | null;
  clientNote: string | null;
  request: BarberRequest | null;
  status: "capturing" | "styling" | "ready" | "sent";
  createdAt: string;
}

function fromRow(r: Record<string, any>): HairstyleSession {
  return {
    id: r.id,
    subjectName: r.subject_name,
    shots: (r.shots ?? {}) as Partial<Record<ShotId, string>>,
    fadeSpec: r.fade_spec ?? null,
    currentLengthInches: r.current_length_inches == null ? null : Number(r.current_length_inches),
    clientNote: r.client_note,
    request: r.request ?? null,
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function createSession(subjectName: string | null): Promise<HairstyleSession> {
  const db = createAdminClient();
  const { data, error } = await (db.from("hairstyle_sessions") as any)
    .insert({ subject_name: subjectName }).select().single();
  if (error) throw new Error(`Could not start a session: ${error.message}`);
  return fromRow(data);
}

export async function fetchSession(id: string): Promise<HairstyleSession | null> {
  const db = createAdminClient();
  const { data, error } = await (db.from("hairstyle_sessions") as any)
    .select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

export async function listSessions(limit = 20): Promise<HairstyleSession[]> {
  const db = createAdminClient();
  const { data } = await (db.from("hairstyle_sessions") as any)
    .select("*").order("created_at", { ascending: false }).limit(limit);
  return ((data ?? []) as Record<string, any>[]).map(fromRow);
}

/** Store one shot and record its path against the session. */
export async function saveShot(
  sessionId: string,
  shot: ShotId,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const db = createAdminClient();
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${sessionId}/${shot}.${ext}`;

  const up = await db.storage.from(SHOTS_BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (up.error) return { ok: false, error: up.error.message };

  const session = await fetchSession(sessionId);
  const shots = { ...(session?.shots ?? {}), [shot]: path };
  const { error } = await (db.from("hairstyle_sessions") as any)
    .update({ shots }).eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** Short-lived URLs for the shots on a session. */
export async function signShots(
  shots: Partial<Record<ShotId, string>>,
): Promise<Partial<Record<ShotId, string>>> {
  const db = createAdminClient();
  const out: Partial<Record<ShotId, string>> = {};
  for (const [shot, path] of Object.entries(shots)) {
    if (!path) continue;
    const { data } = await db.storage.from(SHOTS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (data?.signedUrl) out[shot as ShotId] = data.signedUrl;
  }
  return out;
}

export async function saveStyle(
  sessionId: string,
  patch: {
    fadeSpec?: FadeSpec;
    currentLengthInches?: number | null;
    clientNote?: string | null;
    request?: BarberRequest;
    status?: HairstyleSession["status"];
  },
): Promise<void> {
  const db = createAdminClient();
  const row: Record<string, unknown> = {};
  if (patch.fadeSpec !== undefined) row.fade_spec = patch.fadeSpec;
  if (patch.currentLengthInches !== undefined) row.current_length_inches = patch.currentLengthInches;
  if (patch.clientNote !== undefined) row.client_note = patch.clientNote;
  if (patch.request !== undefined) row.request = patch.request;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await (db.from("hairstyle_sessions") as any).update(row).eq("id", sessionId);
  if (error) throw new Error(`Could not save: ${error.message}`);
}
