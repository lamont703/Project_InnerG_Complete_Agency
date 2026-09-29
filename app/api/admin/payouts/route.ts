import { NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { createServerClient } from "@/lib/supabase/server";
import { recordPayout, resyncCommissions } from "@/lib/commissions";
import { payAgencyViaStripe } from "@/lib/billing/connect";

/**
 * Admin: record a payout made by hand, or re-run every payment through the
 * commission ledger. Checked here, not only in the page.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (b?.action === "resync") return NextResponse.json({ ok: true, ...(await resyncCommissions()) });
  if (!["paid", "stripe"].includes(b?.action) || !/^[0-9a-f-]{36}$/i.test(String(b?.agencyMemberId || ""))) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const { data: { user } } = await (await createServerClient()).auth.getUser();
  const res = b.action === "stripe"
    ? await payAgencyViaStripe(String(b.agencyMemberId), user?.email ?? null)
    : await recordPayout(String(b.agencyMemberId), b?.note ? String(b.note) : null, user?.email ?? null);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
