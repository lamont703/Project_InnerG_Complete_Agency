import { NextResponse } from "next/server";
import { approvedAgencyByCode, REF_COOKIE } from "@/lib/agency-partners";
import { normaliseReferralCode } from "@/lib/agency-referral-rules";

/**
 * An approved agency's link to the Monday LIVE training: shearquery.com/live/<CODE>.
 *
 * Same cookie as their /join/<CODE> link (90 days), so if this person creates a
 * ShearQuery account on this browser the agency is credited at signup, the
 * usual way. The code also rides into the registration itself, which credits
 * the agency even when they sign up later on another device
 * (lib/agency-partners.ts attributeSignup, source "event").
 *
 * An unknown or unapproved code still lands on the registration page — a dead
 * link in someone's Instagram bio is worse than no credit.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const agency = await approvedAgencyByCode(code);
  if (!agency) return NextResponse.redirect(`${origin}/live-training`);
  const c = normaliseReferralCode(code)!;
  const res = NextResponse.redirect(`${origin}/live-training?via=${c}&src=agency`);
  res.cookies.set(REF_COOKIE, c, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 90 * 86400, path: "/" });
  return res;
}
