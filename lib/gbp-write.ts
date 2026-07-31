import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Writing to a customer's Google Business Profile.
 *
 * Everything else in this codebase reads. This is the only module that changes
 * someone's live listing, so the safety properties live here rather than being
 * re-implemented by each caller:
 *
 *  1. Snapshot before write, always — and abort if the snapshot didn't save.
 *     A failed write is recoverable; a successful write with no record of what
 *     preceded it is not.
 *  2. Read back after write. Google can accept a request and apply something
 *     different, or queue it for review and apply it later. What we record is
 *     what Google says the profile is, never what we assume we set.
 *  3. Never send an empty field mask. On the attributes endpoint an absent or
 *     empty mask is not "change nothing" — it is the shape that can clear
 *     attributes the owner set themselves.
 *  4. Every write is revertible from its snapshot alone.
 *
 * Not enforced here, because it belongs a layer up: no write should reach this
 * module without the owner having approved that specific change.
 */

const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";

export type WriteSurface = "attributes" | "location" | "localPosts" | "reviews" | "media" | "placeActionLinks";

export interface WriteResult {
  ok: boolean;
  snapshotId?: string;
  before?: unknown;
  after?: unknown;
  error?: string;
}

async function gbpFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Current attributes for a location, as Google reports them. */
export async function readAttributes(token: string, locationName: string) {
  const r = await gbpFetch(`${BIZ_INFO}/${locationName}/attributes`, token);
  if (!r.ok) throw new Error(`read attributes failed (${r.status}): ${r.body?.error?.message || ""}`);
  return r.body;
}

/**
 * Set attributes, recording an undo point first.
 *
 * `attributes` must be complete objects in Google's shape, e.g.
 *   { name: "attributes/has_restroom", valueType: "BOOL", values: [true] }
 *
 * Only the names listed are touched; anything not in the mask is left alone.
 */
export async function writeAttributes(args: {
  token: string;
  locationName: string;
  attributes: any[];
  memberId?: string | null;
  note?: string;
}): Promise<WriteResult> {
  const { token, locationName, attributes, memberId, note } = args;

  const names = attributes.map((a) => a?.name).filter(Boolean);
  if (!names.length) {
    // Guard, not a formality: an empty mask on this endpoint is the shape that
    // wipes attributes rather than the shape that changes nothing.
    return { ok: false, error: "Refusing to write with an empty attribute mask." };
  }

  let before: any;
  try {
    before = await readAttributes(token, locationName);
  } catch (e: any) {
    return { ok: false, error: `could not snapshot before writing: ${e.message}` };
  }

  const patch = { name: `${locationName}/attributes`, attributes };
  const mask = names.join(",");

  const admin = createAdminClient();
  const { data: snap, error: snapErr } = await (admin.from("gbp_write_snapshots") as any)
    .insert({
      community_member_id: memberId ?? null,
      location_name: locationName,
      surface: "attributes",
      before_state: before,
      applied_patch: { attributeMask: mask, body: patch },
      status: "applied",
      note: note ?? null,
    })
    .select("id")
    .single();

  if (snapErr || !snap?.id) {
    // The whole point of this module. No undo record, no write.
    return { ok: false, error: `snapshot not saved, write aborted: ${snapErr?.message || "unknown"}` };
  }

  const res = await gbpFetch(
    `${BIZ_INFO}/${locationName}/attributes?attributeMask=${encodeURIComponent(mask)}`,
    token,
    { method: "PATCH", body: JSON.stringify(patch) }
  );

  if (!res.ok) {
    await (admin.from("gbp_write_snapshots") as any)
      .update({ status: "failed", note: `${note ? note + " — " : ""}${res.body?.error?.message || res.status}` })
      .eq("id", snap.id);
    return { ok: false, snapshotId: snap.id, before, error: `write failed (${res.status}): ${res.body?.error?.message || ""}` };
  }

  // Read back rather than trusting the response echo.
  const after = await readAttributes(token, locationName).catch(() => null);
  await (admin.from("gbp_write_snapshots") as any).update({ after_state: after }).eq("id", snap.id);

  return { ok: true, snapshotId: snap.id, before, after };
}

/**
 * Put a location's attributes back to a recorded snapshot.
 *
 * Restores by writing the previously-set attributes back. Note the limit
 * honestly: this restores values that existed before. An attribute the write
 * *added* where none existed can't be removed by setting a value, so the revert
 * reports which names it could not clear rather than pretending it fully undid
 * the change. Callers should treat that list as manual follow-up.
 */
export async function revertAttributes(args: {
  token: string;
  snapshotId: string;
}): Promise<WriteResult & { couldNotClear?: string[] }> {
  const { token, snapshotId } = args;
  const admin = createAdminClient();

  const { data: snap, error } = await (admin.from("gbp_write_snapshots") as any)
    .select("id, location_name, surface, before_state, applied_patch, status")
    .eq("id", snapshotId)
    .maybeSingle();

  if (error || !snap) return { ok: false, error: "snapshot not found" };
  if (snap.surface !== "attributes") return { ok: false, error: `revert not implemented for surface "${snap.surface}"` };

  const beforeAttrs: any[] = snap.before_state?.attributes || [];
  const written: string[] = String(snap.applied_patch?.attributeMask || "").split(",").filter(Boolean);
  const beforeNames = new Set(beforeAttrs.map((a) => a.name));

  const toRestore = beforeAttrs.filter((a) => written.includes(a.name));
  const couldNotClear = written.filter((n) => !beforeNames.has(n));

  if (toRestore.length) {
    const mask = toRestore.map((a) => a.name).join(",");
    const res = await gbpFetch(
      `${BIZ_INFO}/${snap.location_name}/attributes?attributeMask=${encodeURIComponent(mask)}`,
      token,
      { method: "PATCH", body: JSON.stringify({ name: `${snap.location_name}/attributes`, attributes: toRestore }) }
    );
    if (!res.ok) return { ok: false, error: `revert failed (${res.status}): ${res.body?.error?.message || ""}` };
  }

  const after = await readAttributes(token, snap.location_name).catch(() => null);
  await (admin.from("gbp_write_snapshots") as any)
    .update({ status: "reverted", reverted_at: new Date().toISOString(), after_state: after })
    .eq("id", snapshotId);

  return { ok: true, snapshotId, after, couldNotClear: couldNotClear.length ? couldNotClear : undefined };
}
