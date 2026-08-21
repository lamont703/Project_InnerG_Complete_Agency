import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What the barber knows that the order history cannot show.
 *
 * ADMIN-ONLY. rebooking_client_notes has RLS on and no policies, so the
 * service-role client used here is the only thing that can read it. These
 * notes are never composed into an outgoing message — lib/rebooking/messages.ts
 * builds from the cadence result alone, and that separation is the guarantee
 * that "her son went off to college" cannot end up in a text to her.
 */

/**
 * 'reduced' is the state Amber C. Flynn needed and the other three could not
 * express: still a client, off their old rhythm, worth nothing like their old
 * annual value. See the 20260820170000 migration for why each alternative got
 * her wrong.
 */
export type NoteStatus = "active" | "snoozed" | "inactive" | "reduced";

export type InactiveReason = "moved" | "switched_barber" | "no_longer_local" | "passed_away" | "other";

export interface ClientNote {
  shopifyCustomerId: string;
  clientName: string | null;
  note: string | null;
  status: NoteStatus;
  snoozeUntil: string | null;
  inactiveReason: InactiveReason | null;
  cadenceOverrideDays: number | null;
  lastContactedAt: string | null;
  mergedIntoCustomerId: string | null;
  /** What a reduced client still comes in for. Never sent to them. */
  reducedServices: string | null;
  updatedAt: string | null;
}

interface NoteRow {
  shopify_customer_id: string;
  client_name: string | null;
  note: string | null;
  status: NoteStatus;
  snooze_until: string | null;
  inactive_reason: InactiveReason | null;
  cadence_override_days: number | string | null;
  last_contacted_at: string | null;
  merged_into_customer_id: string | null;
  reduced_services: string | null;
  updated_at: string | null;
}

function fromRow(r: NoteRow): ClientNote {
  return {
    shopifyCustomerId: r.shopify_customer_id,
    clientName: r.client_name,
    note: r.note,
    status: r.status,
    snoozeUntil: r.snooze_until,
    inactiveReason: r.inactive_reason,
    // numeric comes back as a string from postgres via PostgREST.
    cadenceOverrideDays: r.cadence_override_days == null ? null : Number(r.cadence_override_days),
    lastContactedAt: r.last_contacted_at,
    mergedIntoCustomerId: r.merged_into_customer_id,
    reducedServices: r.reduced_services,
    updatedAt: r.updated_at,
  };
}

/**
 * The `as any` casts below are the repo's existing convention for tables newer
 * than types/database.ts, which has not been regenerated since before
 * booking_requests, shorts_queue, instagram_queue or publisher_queue landed —
 * without the cast every column resolves to `never`. The NoteRow interface
 * above is the real type boundary: rows are mapped through fromRow() rather
 * than used as `any`, so a column rename still breaks in one obvious place.
 */
export async function fetchAllNotes(): Promise<Map<string, ClientNote>> {
  const db = createAdminClient();
  const { data, error } = await (db.from("rebooking_client_notes") as any).select("*");
  if (error) throw new Error(`Could not read client notes: ${error.message}`);
  return new Map(
    ((data ?? []) as NoteRow[]).map((r) => [r.shopify_customer_id, fromRow(r)] as const),
  );
}

export interface SaveNoteInput {
  shopifyCustomerId: string;
  clientName?: string | null;
  note?: string | null;
  status?: NoteStatus;
  snoozeUntil?: string | null;
  inactiveReason?: InactiveReason | null;
  cadenceOverrideDays?: number | null;
  mergedIntoCustomerId?: string | null;
  reducedServices?: string | null;
}

/**
 * Write (or overwrite) the note for one client.
 *
 * UPSERT ON THE CUSTOMER ID, because a note is the current state of what we
 * know rather than a log. Editing a note should replace it, not add a second
 * row that the queue then has to choose between.
 *
 * Only fields actually present in the input are written — a caller updating the
 * status must not blank the free text it did not send.
 */
export async function saveNote(input: SaveNoteInput): Promise<void> {
  const db = createAdminClient();

  const row: Record<string, unknown> = { shopify_customer_id: input.shopifyCustomerId };
  if (input.clientName !== undefined) row.client_name = input.clientName;
  if (input.note !== undefined) row.note = input.note;
  if (input.status !== undefined) row.status = input.status;
  if (input.snoozeUntil !== undefined) row.snooze_until = input.snoozeUntil;
  if (input.inactiveReason !== undefined) row.inactive_reason = input.inactiveReason;
  if (input.cadenceOverrideDays !== undefined) row.cadence_override_days = input.cadenceOverrideDays;
  if (input.mergedIntoCustomerId !== undefined) row.merged_into_customer_id = input.mergedIntoCustomerId;
  if (input.reducedServices !== undefined) row.reduced_services = input.reducedServices;

  const { error } = await (db.from("rebooking_client_notes") as any).upsert(row, {
    onConflict: "shopify_customer_id",
  });
  if (error) throw new Error(`Could not save note: ${error.message}`);
}

/** Stamp that outreach went out, so the queue stops surfacing them for a while. */
export async function markContacted(shopifyCustomerId: string, clientName?: string | null): Promise<void> {
  const db = createAdminClient();
  const { error } = await (db.from("rebooking_client_notes") as any).upsert(
    {
      shopify_customer_id: shopifyCustomerId,
      client_name: clientName ?? null,
      last_contacted_at: new Date().toISOString(),
    },
    { onConflict: "shopify_customer_id" },
  );
  if (error) throw new Error(`Could not record contact: ${error.message}`);
}

/** Put a client back in the queue — clears status, snooze and reason together. */
export async function reactivate(shopifyCustomerId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await (db.from("rebooking_client_notes") as any)
    .update({ status: "active", snooze_until: null, inactive_reason: null })
    .eq("shopify_customer_id", shopifyCustomerId);
  if (error) throw new Error(`Could not reactivate: ${error.message}`);
}
