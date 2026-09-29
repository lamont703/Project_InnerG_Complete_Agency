import { NextResponse } from "next/server";
import { assertNotImpersonating, resolveMemberContext } from "@/lib/account/view-as";
import { setAccountTypeOnce } from "@/lib/account-type";

/** Choose an account type, once, while it's empty (lib/account-type.ts). */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
  const blocked = assertNotImpersonating(ctx);
  if (blocked) return NextResponse.json({ ok: false, error: blocked.error }, { status: blocked.status });
  const b = await req.json().catch(() => ({}));
  const res = await setAccountTypeOnce(ctx.memberId, b?.type);
  if (res.ok && res.type === "agency") await (await import("@/lib/agency-partners")).ensureDemoClients(ctx.memberId);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
