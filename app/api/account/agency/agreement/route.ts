import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { acceptPartnerAgreement } from "@/lib/agency-partners";

/** An agency accepts the partner agreement, with its typed name as signature. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  if (b?.agree !== true) return NextResponse.json({ ok: false, error: "Tick the box to agree." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const res = await acceptPartnerAgreement(ctx.memberId, b?.name, ip);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
