import { NextResponse } from "next/server";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveAgencyProfile } from "@/lib/agency";

/** Save the agency's profile. Agency accounts only; View As cannot write it. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });

  const { data: member } = await (createAdminClient().from("community_members") as any)
    .select("audience").eq("id", ctx.memberId).maybeSingle();
  if (member?.audience !== "agency") {
    return NextResponse.json({ ok: false, error: "This is for agency accounts." }, { status: 403 });
  }

  const res = await saveAgencyProfile(ctx.memberId, await req.json().catch(() => ({})));
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.error }, { status: 400 });
}
