import { NextResponse } from "next/server";
import { register } from "@/lib/live-training/store";
import { sessionStart } from "@/lib/live-training/schedule";
import { whenLong } from "@/lib/live-training/messages";
import { clientIpFrom } from "@/lib/agent-requests";
import { cookies } from "next/headers";
import { REF_COOKIE } from "@/lib/agency-partners";

/** Registration for the weekly LIVE training (/live-training). Public. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  // The agency that sent them: ?via= carried through the form, else the /live/<CODE> or /join/<CODE> cookie.
  const agencyCode = (typeof b?.via === "string" && b.via) || (await cookies()).get(REF_COOKIE)?.value || null;
  const res = await register({
    agencyCode,
    firstName: b?.firstName, email: b?.email, phone: b?.phone || undefined, smsConsent: b?.smsConsent === true,
    audience: b?.audience, source: b?.source,
    ip: clientIpFrom(req.headers), userAgent: req.headers.get("user-agent"),
  });
  if (!res.ok) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ...res, startsAt: sessionStart(res.sessionDate).toISOString(), when: whenLong(res.sessionDate) });
}
