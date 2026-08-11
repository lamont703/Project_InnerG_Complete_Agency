import Link from "next/link";
import { BadgeCheck, ArrowRight } from "lucide-react";

/**
 * The owner-side pitch, on the page an owner is most likely to look at: their
 * own listing.
 *
 * WHY IT BELONGS BESIDE THE REVIEW TRAFFIC. This page now draws people searching
 * "<business name> reviews", and a meaningful share of them are the owner
 * checking what shows up for their own name. That is the cheapest owner
 * acquisition moment on the site, and it was going unused.
 *
 * WHAT IT PROMISES IS WHAT THE CONNECT FLOW ACTUALLY DOES. Google Business
 * Profile API quota was granted and re-verified working on 2026-08-11 (six
 * locations readable), so "your Google reviews on your profile" is a real
 * capability rather than a roadmap item. Connecting also auto-verifies ownership
 * by matching the location's place_id to this row — see lib/google-business.ts.
 *
 * ONE GATE REMAINS AND THE COPY MUST NOT HIDE IT: OAuth verification for
 * non-test users has not passed, so an owner who is not on the test list still
 * meets Google's "hasn't verified this app" interstitial. Promising a smooth
 * connect and delivering a warning screen would cost more trust than the strip
 * earns, so the flow says so on the way in rather than here.
 *
 * Hidden once claimed. An owner who already connected does not need selling to,
 * and a visitor does not need to read a pitch aimed at someone else.
 */
export function OwnerGbpStrip({ isClaimed, businessName }: { isClaimed: boolean; businessName: string }) {
  if (isClaimed) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900">
        <BadgeCheck className="h-4 w-4 text-blue-700" />
        Is this your business?
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        Connect {businessName}&apos;s Google Business Profile and this page shows your live Google
        reviews, hours and photos instead of whatever was last scraped. Connecting also proves
        ownership automatically, so there is no separate claim to wait on.
      </p>
      <Link
        href="/account/manage-listing"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:underline"
      >
        Connect your Google Business Profile
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
