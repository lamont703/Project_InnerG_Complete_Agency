import { NextResponse } from "next/server";
import { appointmentByToken } from "@/lib/calendar/client-booking";
import { openBookingCheckoutUrl } from "@/lib/calendar/payments";

/** "Pay now" on the appointment page: back to the booking's open Stripe Checkout, while the time is still held. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const found = await appointmentByToken(String(b?.token || ""));
  if (!found) return NextResponse.json({ ok: false, error: "That link isn't valid." }, { status: 404 });
  if (found.appointment.status !== "pending_payment") return NextResponse.json({ ok: false, error: "This booking isn't waiting on a payment." }, { status: 409 });
  const url = await openBookingCheckoutUrl(found.appointment.id);
  return url
    ? NextResponse.json({ ok: true, url })
    : NextResponse.json({ ok: false, error: "The time is no longer held. Book again to pick a time." }, { status: 409 });
}
