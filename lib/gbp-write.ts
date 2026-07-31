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


/** Read only the fields we're about to change, so the snapshot is scoped. */
export async function readLocationFields(token: string, locationName: string, readMask: string) {
  const r = await gbpFetch(`${BIZ_INFO}/${locationName}?readMask=${encodeURIComponent(readMask)}`, token);
  if (!r.ok) throw new Error(`read location failed (${r.status}): ${r.body?.error?.message || ""}`);
  return r.body;
}

/**
 * Patch fields on a location, recording an undo point first.
 *
 * The danger here is different from attributes. Fields like serviceItems and
 * categories are REPLACED wholesale by a patch, not merged — sending two
 * services to a listing that has forty-four deletes forty-two of them, silently
 * and instantly. Callers must pass the complete intended value, and the merge
 * helpers exist so they don't have to assemble it by hand.
 *
 * This function therefore refuses an empty updateMask and snapshots exactly the
 * fields being replaced, so a mistake is recoverable rather than final.
 */
export async function writeLocationFields(args: {
  token: string;
  locationName: string;
  /** Comma-separated field paths, e.g. "serviceItems" or "categories". */
  updateMask: string;
  /** Complete replacement value for those fields. */
  patch: Record<string, unknown>;
  memberId?: string | null;
  note?: string;
}): Promise<WriteResult> {
  const { token, locationName, updateMask, patch, memberId, note } = args;

  if (!updateMask.trim()) {
    return { ok: false, error: "Refusing to patch a location with an empty updateMask." };
  }

  let before: any;
  try {
    before = await readLocationFields(token, locationName, updateMask);
  } catch (e: any) {
    return { ok: false, error: `could not snapshot before writing: ${e.message}` };
  }

  const admin = createAdminClient();
  const { data: snap, error: snapErr } = await (admin.from("gbp_write_snapshots") as any)
    .insert({
      community_member_id: memberId ?? null,
      location_name: locationName,
      surface: "location",
      before_state: before,
      applied_patch: { updateMask, body: patch },
      status: "applied",
      note: note ?? null,
    })
    .select("id")
    .single();

  if (snapErr || !snap?.id) {
    return { ok: false, error: `snapshot not saved, write aborted: ${snapErr?.message || "unknown"}` };
  }

  const res = await gbpFetch(
    `${BIZ_INFO}/${locationName}?updateMask=${encodeURIComponent(updateMask)}`,
    token,
    { method: "PATCH", body: JSON.stringify(patch) }
  );

  if (!res.ok) {
    await (admin.from("gbp_write_snapshots") as any)
      .update({ status: "failed", note: `${note ? note + " — " : ""}${res.body?.error?.message || res.status}` })
      .eq("id", snap.id);
    return { ok: false, snapshotId: snap.id, before, error: `write failed (${res.status}): ${res.body?.error?.message || ""}` };
  }

  const after = await readLocationFields(token, locationName, updateMask).catch(() => null);
  await (admin.from("gbp_write_snapshots") as any).update({ after_state: after }).eq("id", snap.id);

  return { ok: true, snapshotId: snap.id, before, after };
}

/**
 * Restore location fields from a snapshot.
 *
 * Straightforward in a way the attribute revert isn't: because these fields are
 * replaced wholesale, writing the recorded before-state back is a complete undo.
 */
export async function revertLocationFields(args: { token: string; snapshotId: string }): Promise<WriteResult> {
  const { token, snapshotId } = args;
  const admin = createAdminClient();

  const { data: snap, error } = await (admin.from("gbp_write_snapshots") as any)
    .select("id, location_name, surface, before_state, applied_patch")
    .eq("id", snapshotId)
    .maybeSingle();

  if (error || !snap) return { ok: false, error: "snapshot not found" };
  if (snap.surface !== "location") return { ok: false, error: `revert not implemented for surface "${snap.surface}"` };

  const updateMask = String(snap.applied_patch?.updateMask || "");
  if (!updateMask) return { ok: false, error: "snapshot has no updateMask" };

  const body: Record<string, unknown> = { name: snap.location_name };
  for (const field of updateMask.split(",").map((f) => f.trim()).filter(Boolean)) {
    // A field absent from before_state was unset; send an empty value so the
    // restore clears it rather than leaving what we added in place.
    body[field] = snap.before_state?.[field] ?? (field === "serviceItems" ? [] : null);
  }

  const res = await gbpFetch(
    `${BIZ_INFO}/${snap.location_name}?updateMask=${encodeURIComponent(updateMask)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  if (!res.ok) return { ok: false, error: `revert failed (${res.status}): ${res.body?.error?.message || ""}` };

  const after = await readLocationFields(token, snap.location_name, updateMask).catch(() => null);
  await (admin.from("gbp_write_snapshots") as any)
    .update({ status: "reverted", reverted_at: new Date().toISOString(), after_state: after })
    .eq("id", snapshotId);

  return { ok: true, snapshotId, after };
}


const V4 = "https://mybusiness.googleapis.com/v4";

/**
 * Publish a reply to a Google review.
 *
 * Different in kind from the other writes here: this is public, it speaks in
 * the owner's voice, and a customer will read it. Nothing should reach this
 * function that the owner hasn't read and approved — the API layer is
 * responsible for that, and the change-request row records it.
 *
 * The snapshot captures any existing reply so an edit can be undone. Usually
 * there isn't one, which the snapshot records as null rather than as an empty
 * string, so a revert can tell "there was no reply" from "the reply was blank".
 */
export async function writeReviewReply(args: {
  token: string;
  /** Full v4 resource name: accounts/{a}/locations/{l}/reviews/{r} */
  reviewName: string;
  comment: string;
  locationName: string;
  memberId?: string | null;
  note?: string;
}): Promise<WriteResult> {
  const { token, reviewName, comment, locationName, memberId, note } = args;

  const text = (comment || "").trim();
  if (!text) return { ok: false, error: "Refusing to publish an empty reply." };
  // Google's own cap. Failing here is a clearer error than a 400 from the API.
  if (text.length > 4096) return { ok: false, error: "Reply is longer than Google allows (4096 characters)." };

  const existing = await gbpFetch(`${V4}/${reviewName}`, token);
  const before = existing.ok ? { reviewReply: existing.body?.reviewReply ?? null } : { reviewReply: null };

  const admin = createAdminClient();
  const { data: snap, error: snapErr } = await (admin.from("gbp_write_snapshots") as any)
    .insert({
      community_member_id: memberId ?? null,
      location_name: locationName,
      surface: "reviews",
      before_state: { reviewName, ...before },
      applied_patch: { reviewName, comment: text },
      status: "applied",
      note: note ?? null,
    })
    .select("id")
    .single();

  if (snapErr || !snap?.id) {
    return { ok: false, error: `snapshot not saved, write aborted: ${snapErr?.message || "unknown"}` };
  }

  const res = await gbpFetch(`${V4}/${reviewName}/reply`, token, {
    method: "PUT",
    body: JSON.stringify({ comment: text }),
  });

  if (!res.ok) {
    await (admin.from("gbp_write_snapshots") as any)
      .update({ status: "failed", note: `${note ? note + " — " : ""}${res.body?.error?.message || res.status}` })
      .eq("id", snap.id);
    return { ok: false, snapshotId: snap.id, before, error: `reply failed (${res.status}): ${res.body?.error?.message || ""}` };
  }

  await (admin.from("gbp_write_snapshots") as any)
    .update({ after_state: { reviewName, reviewReply: res.body } })
    .eq("id", snap.id);

  return { ok: true, snapshotId: snap.id, before, after: res.body };
}
