import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { requestAccess } from "@/lib/agency-support";

/** An agency asks one of its clients to share their account health. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(b?.clientMemberId || ""))) return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  const res = await requestAccess(ctx.memberId, String(b.clientMemberId));
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
