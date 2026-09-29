import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { payoutDashboardLink, startPayoutSetup } from "@/lib/billing/connect";

/**
 * An agency's Stripe payout account. POST { action: "setup" } starts or
 * resumes onboarding; POST { action: "dashboard" } opens Stripe's Express
 * dashboard. GET ?resume=1 is Stripe's refresh_url: an expired onboarding
 * link lands here and is sent straight on to a fresh one.
 */
export const dynamic = "force-dynamic";

async function member() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status }) };
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return { error: NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status }) };
  return { memberId: ctx.memberId };
}

export async function POST(req: Request) {
  const m = await member();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));
  const origin = new URL(req.url).origin;
  const res = b?.action === "dashboard" ? await payoutDashboardLink(m.memberId) : await startPayoutSetup(m.memberId, origin);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}

export async function GET(req: Request) {
  const m = await member();
  const origin = new URL(req.url).origin;
  if ("error" in m) return NextResponse.redirect(`${origin}/login?redirect=/account/agency`);
  const res = await startPayoutSetup(m.memberId, origin);
  return NextResponse.redirect(res.ok ? res.url : `${origin}/account/agency?payouts=error`);
}
