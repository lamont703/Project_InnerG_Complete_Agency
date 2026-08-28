import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CommunityMembershipForm } from "@/components/forms/CommunityMembershipForm";
import {
  AudienceHeading,
  AudienceSwitcher,
  AudienceBenefitList,
  AudienceFaqs,
  AudienceNextLinks,
} from "@/components/membership/audience-content";
import { landingAudiences, type Audience } from "@/lib/audiences";
import { SITE_URL } from "@/lib/site";

/**
 * One membership page per audience.
 *
 * WHAT THIS CHANGES, AND WHAT IT DELIBERATELY DOES NOT. /membership keeps
 * working exactly as before, keeps its own canonical, and keeps honouring
 * `?for=` — every link, ad and lifecycle email already pointing at it lands
 * where it always did. These pages are additive: a place to send a school, a
 * student or an owner where the whole page is about them, rather than a hub
 * with a switcher on it.
 *
 * WHY PATHS ARE ALLOWED TO CARRY THEIR OWN METADATA WHEN `?for=` WAS NOT. The
 * note on /membership rules out per-audience metadata there, and it is right —
 * but for the URL reason, not the rendering one. generateMetadata over
 * searchParams spawns an unbounded set of near-duplicate URLs hanging off one
 * path, none of which can hold a canonical of its own. A path set is finite,
 * enumerable (see generateStaticParams below) and each member is a real URL
 * that can be canonical to itself.
 *
 * NOT because these prerender — THEY DO NOT, and nothing in this app does.
 * app/layout.tsx awaits headers(), which opts every route out of static
 * rendering; the build reports `ƒ` for all of them, /membership included.
 * Measured, not assumed, after a first version of this comment claimed the
 * opposite. generateStaticParams still earns its place: it is the single
 * definition of which segments are valid, and it is what would prerender these
 * if the root layout ever stopped reading headers.
 *
 * THE CANONICAL IS SELF-REFERENTIAL, not /membership. Pointing these at the hub
 * would ask Google to drop them, which defeats the point of having them.
 * Google's guidance is explicit that the canonical page should carry one:
 * "Do include a rel="canonical" link on the canonical page itself (also known
 * as a self-referential canonical)."
 *   https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
 *
 * WHAT IS NOT GUARANTEED, AND MUST NOT BE ASSUMED. A canonical is a signal, not
 * an instruction — Google "chooses the page that ... is objectively the most
 * complete and useful for search users", and clusters pages when "the primary
 * content [is] very similar". So these pages hold together only for as long as
 * each one has real content of its own. That is enforced in the type: an
 * audience cannot have a landing page without FAQs and links specific to it
 * (see AudienceLanding in lib/audiences.ts). If a future audience gets a page
 * by copying another one's, this stops working and the fix is content, not
 * markup.
 *   https://developers.google.com/search/docs/crawling-indexing/canonicalization
 *
 * Neither doc addresses audience-segmented siblings directly — checked, not
 * assumed. The reasoning above is ours, built on what they do say.
 */

function findAudience(path: string): Audience | undefined {
  return landingAudiences().find((a) => a.landing!.path === path);
}

export function generateStaticParams() {
  return landingAudiences().map((a) => ({ audience: a.landing!.path }));
}

export async function generateMetadata(props: {
  params: Promise<{ audience: string }>;
}): Promise<Metadata> {
  const { audience } = await props.params;
  const a = findAudience(audience);
  if (!a?.landing) return {};

  return {
    title: a.landing.metaTitle,
    description: a.landing.metaDescription,
    alternates: { canonical: `${SITE_URL}/membership/${a.landing.path}` },
  };
}

export default async function AudienceMembershipPage(props: {
  params: Promise<{ audience: string }>;
}) {
  const { audience } = await props.params;
  const a = findAudience(audience);
  // An unknown segment is a 404, not a silent fallback to the default
  // audience. A wrong URL that renders a plausible page is how a broken link
  // survives for months.
  if (!a?.landing) notFound();

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-12">
            <AudienceHeading audience={a} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            {/* order-2 on mobile, matching /membership: the form has to be the
                first thing on a phone, or the page offers nothing to do
                without scrolling a full screen. */}
            <div className="order-2 lg:order-1 lg:col-span-3 space-y-6">
              <AudienceSwitcher activeId={a.id} variant="path" />
              <AudienceBenefitList audience={a} />
            </div>

            <div className="order-1 lg:order-2 lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-black text-slate-900 mb-1">{a.ctaLabel}</h2>
              <p className="text-sm text-slate-500 mb-6">Takes about a minute.</p>
              {/* The form reads claim_type/claim_id and ?for= from the query
                  string, so useSearchParams needs a boundary here even though
                  the audience itself came from the path. `audience` is passed
                  as the page's default and an explicit ?for= still wins — see
                  the note on CommunityMembershipFormProps. */}
              <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
                <CommunityMembershipForm
                  source={`membership-${a.landing.path}`}
                  audience={a.id}
                />
              </Suspense>
            </div>
          </div>

          <div className="max-w-3xl">
            <AudienceFaqs audience={a} />
            <AudienceNextLinks audience={a} />
          </div>

          <p className="mt-14 text-sm text-slate-500">
            Not who you are?{" "}
            <Link href="/membership" className="font-bold text-blue-700 hover:underline">
              See every membership option
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
