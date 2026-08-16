import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertNotImpersonating } from "@/lib/account/view-as";
import {
  resolveOwnedBookingContext,
  OWNER_SETTABLE_STATUSES,
  type OwnerSettableStatus,
} from "@/lib/account/booking-requests";

/**
 * An owner marks what happened to a booking request.
 *
 * THE ID IS CHECKED AGAINST OWNERSHIP, NOT TRUSTED. The request body carries a
 * booking id, and a booking id is guessable-adjacent — so the update is scoped
 * by the entity pair derived server-side from the session, and the row must
 * match BOTH. Filtering by id alone would let any signed-in member mark any
 * business's bookings as declined, which would then email that business's
 * customers that nobody is coming.
 *
 * ONLY THREE STATUSES. 'new', 'notified' and 'no_response' belong to the API
 * and the cron; letting an owner write them would let a business erase the
 * record of having been asked. See OWNER_SETTABLE_STATUSES.
 *
 * NO VERIFICATION REQUIRED TO SET STATUS, deliberately. Verification gates
 * READING customer contact details, because that is the data worth stealing.
 * Marking a request declined is not worth stealing and asking for proof first
 * would suppress the one signal this whole feature was built to collect.
 */

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const ctx = await resolveOwnedBookingContext();
  if ("status" in ctx) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!("link" in ctx)) {
    return NextResponse.json({ error: "You haven't claimed a listing yet." }, { status: 403 });
  }

  // View As is read-only. An admin looking at a member's page must not be able
  // to text that member's customers by clicking a button.
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim() as OwnerSettableStatus;
  const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

  if (!id) return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  if (!OWNER_SETTABLE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "That status can't be set here." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    status_source: "dashboard",
    updated_at: now,
  };
  if (status === "declined") {
    patch.declined_at = now;
    patch.declined_reason = reason || "Marked declined by the business on their dashboard.";
  }

  // Both filters, always. See the header.
  const { data, error } = await (admin.from("booking_requests") as any)
    .update(patch)
    .eq("id", id)
    .eq("entity_type", ctx.link.entityType)
    .eq("entity_id", ctx.link.entityId)
    .select("id, status");

  if (error) {
    console.error("[account/booking-requests] update failed:", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    // Either the id does not exist or it belongs to someone else. The response
    // is the same either way on purpose: a distinct "not yours" message would
    // confirm that a given id is a real booking somewhere.
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  /*
   * The customer is not emailed from here. lib/booking-escalation owns every
   * "here is how your request ended" message and stamps resolution_notified_at
   * so it goes exactly once; the hourly cron will pick this row up within the
   * hour. Sending from both places is how a customer gets told twice.
   */
  return NextResponse.json({ ok: true, id: data[0].id, status: data[0].status });
}
