import { NextResponse } from "next/server";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { sendAgencyInvite } from "@/lib/agency-partners";

/** An approved agency invites a client by email. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  const res = await sendAgencyInvite({ agencyMemberId: ctx.memberId, email: b?.email, businessName: b?.business_name });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.error }, { status: 400 });
}
