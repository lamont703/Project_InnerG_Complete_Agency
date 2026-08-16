import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records the outcome of a school tour call.
 *
 * IT RE-CHECKS isAdmin() RATHER THAN TRUSTING MIDDLEWARE. Middleware gates
 * /api/admin/* but FAILS OPEN on an auth exception, and this handler writes
 * with the service-role client. Same defence-in-depth reasoning as the
 * ad-campaign actions — the guard that matters is the one next to the write.
 *
 * `notified_business_at` IS THE FIELD THAT MOVES A ROW OUT OF THE QUEUE, and
 * it means "a human reached the school", not "someone opened the row". Setting
 * it on anything less would hide a request that still needs calling, which is
 * the one failure this queue exists to prevent.
 *
 * STATUS AND CALL ARE RECORDED TOGETHER because a call always has an outcome.
 * 'contacted' means we spoke to them; 'no_response' means we tried and got
 * nobody — and that second one deliberately still stamps the call so the row
 * leaves the pending list and shows up as attempted rather than untouched.
 */

export const dynamic = "force-dynamic";

const MAX_NOTES = 2_000;

/** What a caller may set. Anything else is rejected rather than coerced. */
const ALLOWED_STATUS = ["contacted", "booked", "no_response", "cancelled"] as const;
type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim() as AllowedStatus;
  const calledBy = String(body.called_by ?? "").trim().slice(0, 200) || null;
  const callNotes = String(body.call_notes ?? "").trim().slice(0, MAX_NOTES) || null;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing request id." }, { status: 400 });
  }
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ ok: false, error: "Unknown outcome." }, { status: 400 });
  }

  const db = createAdminClient();

  /**
   * Scoped to tour rows on the phone-call channel. Without this an id from
   * anywhere in booking_requests would let this endpoint stamp a salon's SMS
   * request as hand-called, corrupting the escalation cron's view of it.
   */
  /**
   * `as any` on the table handle, matching app/api/account/booking-requests.
   * `called_by`, `call_notes`, `request_type` and `notify_channel` are added by
   * 20260816180000 and are not in the generated types until that migration is
   * applied and the types regenerated. The filters below are what actually
   * constrain this write; the cast only silences a type lag.
   */
  const { data, error } = await (db.from("booking_requests") as any)
    .update({
      status,
      called_by: calledBy,
      call_notes: callNotes,
      notified_business_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("request_type", "tour")
    .eq("notify_channel", "phone_call")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Couldn't update that request." },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
