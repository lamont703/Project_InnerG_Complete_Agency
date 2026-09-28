import { NextResponse } from "next/server";
import { bookableProvider, checkPhoneCode, clientBook } from "@/lib/calendar/client-booking";
import { originOf } from "@/lib/mcp/oauth-metadata";

/**
 * Book from the website. The code is checked here, at the moment of booking,
 * so a verified phone is spent on exactly one booking.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const pro = await bookableProvider(String(b?.providerId || ""));
  if (!pro) return NextResponse.json({ ok: false, error: "This calendar isn't taking bookings." }, { status: 404 });
  const service = pro.services.find((s) => s.id === b?.serviceId);
  if (!service) return NextResponse.json({ ok: false, error: "Pick a service." }, { status: 400 });
  const start = new Date(String(b?.start || ""));
  if (Number.isNaN(start.getTime())) return NextResponse.json({ ok: false, error: "Pick a time." }, { status: 400 });

  const verified = await checkPhoneCode(b?.phone, b?.code);
  if (!verified.ok) return NextResponse.json({ ok: false, error: verified.reason }, { status: 400 });

  const res = await clientBook({
    pro, service, start,
    name: String(b?.name || ""),
    phone: verified.phone,
    notes: b?.notes ? String(b.notes).slice(0, 300) : null,
    source: "web",
    origin: originOf(req),
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.reason }, { status: 409 });
  return NextResponse.json({ ok: true, appointmentId: res.appointment.id, manageUrl: res.manageUrl });
}
