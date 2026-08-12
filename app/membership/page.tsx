import type { Metadata } from "next";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { CommunityMembershipForm } from "@/components/forms/CommunityMembershipForm";
import { MembershipHeading, MembershipBenefits } from "@/components/membership/membership-intro";
import { SITE_URL } from "@/lib/site";

/**
 * Metadata stays fixed across audiences, and the canonical stays /membership.
 *
 * `?for=student` changes what a person reads, not what Google indexes. Making
 * the title vary per audience would mean generateMetadata with searchParams,
 * which makes the route dynamic and creates a set of near-duplicate URLs
 * competing to be canonical — the exact consolidation problem this repo has
 * already spent a domain migration on. The audience is a conversion surface,
 * not a landing page.
 */
export const metadata: Metadata = {
  title: "Free Community Membership — Verified Badge on Your Listing",
  description:
    "Join Inner G Complete's free community membership — barbers, stylists, and beauty professionals claim their listing and earn a verified badge on their ShearQuery profile, showing clients and shops it's owner-verified.",
  alternates: {
    canonical: `${SITE_URL}/membership`,
  },
};

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* mb-6 on mobile, not mb-12 — every pixel here pushed the form
              further below the fold on a phone. */}
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-12">
            <Suspense
              fallback={
                <>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
                    <Sparkles className="w-3 h-3" />
                    Free Community Tier
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight mb-4">
                    Join the ShearQuery Community
                  </h1>
                </>
              }
            >
              <MembershipHeading />
            </Suspense>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            {/* order-2 on mobile: the form has to be the first thing on a phone.
                On a real visit the first input sat at y=1176 in an 844px viewport,
                so the page offered nothing to do without scrolling a full screen. */}
            <div className="order-2 lg:order-1 lg:col-span-3">
              <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
                <MembershipBenefits />
              </Suspense>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-black text-slate-900 mb-1">Create Your Free Membership</h2>
              <p className="text-sm text-slate-500 mb-6">Takes about a minute.</p>
              {/* The form reads claim_type/claim_id from the query string
                  (handed over by ClaimShopButton), so useSearchParams needs a
                  Suspense boundary or this page can't be statically rendered. */}
              <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
                <CommunityMembershipForm />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
