import { NextResponse } from "next/server";
import { appointmentByToken, clientCancel } from "@/lib/calendar/client-booking";

/** Cancel through the link texted to the client. The token is the credential. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const found = await appointmentByToken(String(b?.token || ""));
  if (!found) return NextResponse.json({ ok: false, error: "That link isn't valid." }, { status: 404 });
  const res = await clientCancel({ providerId: found.providerId, appointmentId: found.appointment.id });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.reason }, { status: 409 });
}
