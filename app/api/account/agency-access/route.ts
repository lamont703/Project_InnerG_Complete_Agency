import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { setAgencyAccess } from "@/lib/agency-support";

/** The owner switches their agency's read-only access on or off. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  if (typeof b?.on !== "boolean") return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  const res = await setAgencyAccess(ctx.memberId, b.on);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
