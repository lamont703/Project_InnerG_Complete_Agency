import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { billingPortal } from "@/lib/billing/stripe";

/** Open Stripe's billing page: card, invoices, cancel. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const res = await billingPortal(ctx.memberId, new URL(req.url).origin);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
