import { NextResponse } from "next/server";
import { appointmentByToken, clientReschedule } from "@/lib/calendar/client-booking";

/** Move a booking through the link texted to the client. The token is the credential. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const found = await appointmentByToken(String(b?.token || ""));
  if (!found) return NextResponse.json({ ok: false, error: "That link isn't valid." }, { status: 404 });
  const start = new Date(String(b?.start || ""));
  if (Number.isNaN(start.getTime())) return NextResponse.json({ ok: false, error: "Pick a time." }, { status: 400 });
  const res = await clientReschedule({ providerId: found.providerId, appointmentId: found.appointment.id, start });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.reason }, { status: 409 });
}
