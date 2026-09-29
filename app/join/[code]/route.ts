import { NextResponse } from "next/server";
import { approvedAgencyByCode, REF_COOKIE } from "@/lib/agency-partners";
import { normaliseReferralCode } from "@/lib/agency-referral-rules";

/**
 * An approved agency's referral link: shearquery.com/join/<CODE>.
 *
 * Remembers the code for 90 days in a cookie the signup route reads, and puts
 * it in the URL so the signup form can show it. An unknown or unapproved code
 * still lands on the membership page — a dead link is worse than no credit.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const agency = await approvedAgencyByCode(code);
  if (!agency) return NextResponse.redirect(`${origin}/membership`);
  const c = normaliseReferralCode(code)!;
  const res = NextResponse.redirect(`${origin}/membership?via=${c}`);
  res.cookies.set(REF_COOKIE, c, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 90 * 86400, path: "/" });
  return res;
}
