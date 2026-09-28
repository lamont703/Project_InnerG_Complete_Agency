import { NextResponse } from "next/server";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { disconnectMemberInstagram } from "@/lib/instagram-member";

/**
 * Remove the member's stored Instagram token. The grant also shows in the
 * owner's Instagram settings under apps and websites, where they can remove
 * ShearQuery on Instagram's side too.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });
  await disconnectMemberInstagram(ctx.memberId);
  return NextResponse.json({ ok: true });
}
