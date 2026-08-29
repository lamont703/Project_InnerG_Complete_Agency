"use client";

import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { audienceFromParam, AUDIENCES } from "@/lib/audiences";
import {
  AudienceHeading,
  AudienceSwitcher,
  AudienceBenefitList,
} from "./audience-content";

/**
 * The membership page, addressed to whoever actually arrived.
 *
 * Replaces claim-heading.tsx, which solved the same problem for exactly one
 * case: someone tapping "Is this your shop?" was being answered with "Join the
 * ShearQuery Community". That case is preserved verbatim below — a claim in
 * progress still outranks everything, because it is the most specific thing we
 * know about why this person is here.
 *
 * What's new is the case underneath it. The kit-list and licensing guides are
 * where the traffic is, and they bring students: people months from a licence
 * who own no listing. Every one of the three benefits this page has ever
 * listed is owner-side, so a student read it and correctly concluded it was
 * addressed to somebody else.
 *
 * CLIENT COMPONENTS, for the reason claim-heading.tsx already established:
 * reading searchParams on the page itself would make the whole route dynamic.
 * The default audience renders server-side and is swapped on hydration, so a
 * plain /membership visit is unchanged — and the canonical stays /membership
 * rather than spawning a set of near-duplicate URLs for Google to choose
 * between.
 */

export function MembershipHeading() {
  const params = useSearchParams();
  const claimName = params.get("claim_name");
  const claimType = params.get("claim_type");

  /*
   * Arriving from a booking notification is the most specific reason anyone
   * lands here: a real customer is waiting on them right now. The generic claim
   * copy ("keep its details right") is true and completely beside the point at
   * that moment, so this branch answers the text they just received.
   */
  const fromBooking = params.get("src") === "booking";

  // A claim in progress answers the question that got them here. Unchanged.
  if (claimName) {
    const noun =
      claimType === "cosmetology_school" || claimType === "barber_school" ? "school" : "listing";

    if (fromBooking) {
      return (
        <>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-3">
            <Sparkles className="w-3 h-3" />
            You have a booking request
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            See who&apos;s asking for {claimName}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Someone requested an appointment and we texted you the details. Create a free account to
            see every request in one place, mark what you booked, and get the verified badge on your
            listing. No card, no trial.
          </p>
        </>
      );
    }

    return (
      <>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-3">
          <Sparkles className="w-3 h-3" />
          Free — no card, no trial
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
          Claim {claimName}
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Create a free account to verify you own this {noun}. You&apos;ll get the verified badge on
          the profile and be able to keep its details right.
        </p>
      </>
    );
  }

  return <AudienceHeading audience={AUDIENCES[audienceFromParam(params.get("for"))]} />;
}

export function MembershipBenefits() {
  const params = useSearchParams();
  /*
   * Someone who followed a booking-request text IS an owner — that is the one
   * thing the link proves. Without this the page showed them the default
   * `professional` benefits (verified badge, industry community, free always),
   * all true and none of them the reason they tapped. The owner set leads with
   * the appointment-requests benefit, which is what they came for.
   */
  const activeId = params.get("src") === "booking" ? "owner" : audienceFromParam(params.get("for"));
  const active = AUDIENCES[activeId];
  const isClaiming = Boolean(params.get("claim_name"));

  return (
    <div className="space-y-6">
      {/* Hidden mid-claim — they already told us why they're here. On the hub
          the switcher stays in `query` form so every existing ?for= link, ad
          and email keeps landing exactly where it used to. */}
      {!isClaiming && <AudienceSwitcher activeId={activeId} variant="query" />}
      <AudienceBenefitList audience={active} />
    </div>
  );
}
