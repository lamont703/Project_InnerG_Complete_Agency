import { NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { setMemberPlan } from "@/lib/member-plan";
import { isPlan } from "@/lib/plans";

/** Admin: set a member's plan by hand, until checkout exists. Checked here, not only in the page. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(b?.memberId || "")) || !isPlan(b?.plan)) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const res = await setMemberPlan(String(b.memberId), b.plan);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
