import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendarAccess } from "@/lib/feature-access";
import { ensureProvider } from "@/lib/calendar/store";
import { startPaymentsSetup } from "@/lib/calendar/payments";

/**
 * A pro connecting their own Stripe account, so clients pay them directly
 * (lib/calendar/payments.ts). POST starts or resumes Stripe's onboarding and
 * returns its URL; GET ?resume=1 is Stripe's refresh_url, sent straight on to
 * a fresh link. Bank and identity details go on Stripe's pages only.
 */
export const dynamic = "force-dynamic";

async function owner() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status };
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return blocked;
  const { data: m } = await (createAdminClient().from("community_members") as any).select("email").eq("id", ctx.memberId).maybeSingle();
  if (!(await hasCalendarAccess(m?.email))) return { error: "The calendar isn't open to this account yet.", status: 403 };
  return { provider: await ensureProvider(ctx.memberId), email: (m?.email as string) ?? null };
}

export async function POST(req: Request) {
  const o = await owner();
  if ("error" in o) return NextResponse.json({ ok: false, error: o.error }, { status: o.status });
  const res = await startPaymentsSetup(o.provider, o.email, new URL(req.url).origin);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const o = await owner();
  if ("error" in o) return NextResponse.redirect(`${origin}/login?redirect=/account/calendar`);
  const res = await startPaymentsSetup(o.provider, o.email, origin);
  return NextResponse.redirect(res.ok ? res.url : `${origin}/account/calendar?payments=error`);
}
