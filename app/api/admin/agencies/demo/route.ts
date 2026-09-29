import { NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { setupAgencyDemo } from "@/lib/agency";

/** Admin: set up an agency's demo shop. Checked here, not only in the page. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  const { memberId } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(memberId || ""))) return NextResponse.json({ ok: false, error: "Which agency?" }, { status: 400 });
  const res = await setupAgencyDemo(String(memberId));
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: 409 });
}
