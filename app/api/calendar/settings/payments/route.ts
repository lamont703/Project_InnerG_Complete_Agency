import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendarAccess } from "@/lib/feature-access";
import { getProvider } from "@/lib/calendar/store";
import { savePaymentRules } from "@/lib/calendar/payments";

/** The pro saving their payment and cancellation rules from /account/calendar. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const { data: m } = await (createAdminClient().from("community_members") as any).select("email").eq("id", ctx.memberId).maybeSingle();
  if (!(await hasCalendarAccess(m?.email))) return NextResponse.json({ ok: false, error: "The calendar isn't open to this account yet." }, { status: 403 });
  const provider = await getProvider(ctx.memberId);
  if (!provider) return NextResponse.json({ ok: false, error: "Set up your calendar first." }, { status: 404 });
  const res = await savePaymentRules(provider, await req.json().catch(() => ({})));
  if (!res.ok) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true, notInEffect: res.terms.notInEffect });
}
