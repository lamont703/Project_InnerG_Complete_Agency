import { NextResponse } from "next/server";
import { sendPhoneCode } from "@/lib/calendar/client-booking";
import { clientIpFrom } from "@/lib/agent-requests";

/** Text a 6-digit code to the client's phone. Rate-limited per phone and per IP. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await sendPhoneCode({ phone: body?.phone, ip: clientIpFrom(req.headers) });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.reason }, { status: 429 });
}
