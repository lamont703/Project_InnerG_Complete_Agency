import { NextResponse } from "next/server";
import { appointmentByToken } from "@/lib/calendar/client-booking";
import { createTipCheckout } from "@/lib/calendar/payments";
import { originOf } from "@/lib/mcp/oauth-metadata";

/** A tip from the appointment link, paid straight to the pro's own Stripe account. The token is the credential. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const token = String(b?.token || "");
  const found = await appointmentByToken(token);
  if (!found?.pro) return NextResponse.json({ ok: false, error: "That link isn't valid." }, { status: 404 });
  if (!["booked", "confirmed", "completed"].includes(found.appointment.status)) {
    return NextResponse.json({ ok: false, error: "Tips can be added to a booked or completed appointment." }, { status: 409 });
  }
  const res = await createTipCheckout({ provider: found.pro.provider, appointment: found.appointment, tipCents: Number(b?.cents), token, origin: originOf(req) });
  return res.ok ? NextResponse.json({ ok: true, url: res.url }) : NextResponse.json({ ok: false, error: res.error }, { status: 409 });
}
