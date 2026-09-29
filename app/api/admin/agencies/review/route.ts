import { NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { reviewAgency } from "@/lib/agency-partners";

/** Admin: approve or reject an agency as a partner. Checked here, not only in the page. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(b?.memberId || "")) || !["approve", "reject"].includes(b?.action)) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const res = await reviewAgency(String(b.memberId), b.action, b?.note ? String(b.note).slice(0, 300) : null);
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: 409 });
}
