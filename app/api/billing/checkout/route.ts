import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { startCheckout } from "@/lib/billing/stripe";

/** Start a Stripe Checkout for Manage or Autopilot. The plan changes only when Stripe's webhook says it's paid. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  const res = await startCheckout(ctx.memberId, b?.plan, new URL(req.url).origin);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
