import "server-only";

/**
 * The order a member is moved through, and what to say at each step.
 *
 * WHY THIS FILE EXISTS SEPARATELY. The suggestion engine knows WHO is worth
 * contacting; this knows WHERE they are meant to end up. Those drifted apart in
 * the first version — the drafts each argued for a feature in isolation, so a
 * member with nothing claimed and a member stalled on the audit got equally
 * generic pitches, and neither was pushed anywhere in particular.
 *
 * ONE SEQUENCE, AND THE NEXT STEP IS THE FIRST THING NOT DONE:
 *
 *   1. claim the listing        it is not theirs until they do
 *   2. connect Google           unlocks the tools, and proves ownership
 *   3. run the profile audit    the first thing that hands back a finding
 *   4. booking requests         the first thing that earns them money
 *   5. featured placement       only worth offering once the rest works
 *
 * NOTHING SKIPS. Offering featured placement to somebody who has not claimed
 * their listing is how a funnel becomes noise — and the reason it happens is
 * that the later steps are the ones we most want to sell.
 */

export type FunnelStep =
  | "claim_listing"
  | "connect_google"
  | "run_audit"
  | "booking_requests"
  | "featured";

export const FUNNEL_ORDER: FunnelStep[] = [
  "claim_listing",
  "connect_google",
  "run_audit",
  "booking_requests",
  "featured",
];

export interface StepBrief {
  step: FunnelStep;
  label: string;
  /** What it does FOR THEM, in their terms. Never a feature name. */
  benefit: string;
  /** Where they go to do it. */
  href: string;
  /** Roughly what it costs them, because "how long will this take" is the real objection. */
  effort: string;
}

export const STEP_BRIEFS: Record<FunnelStep, StepBrief> = {
  claim_listing: {
    step: "claim_listing",
    label: "Claim the listing",
    benefit:
      "control what their listing says, get the verified badge, and start receiving appointment requests from it",
    href: "/account/add-business",
    effort: "a couple of minutes",
  },
  connect_google: {
    step: "connect_google",
    label: "Connect Google Business Profile",
    benefit:
      "fix hours and categories, reply to reviews and post updates without leaving ShearQuery",
    href: "/api/google-business/start",
    effort: "about a minute",
  },
  run_audit: {
    step: "run_audit",
    label: "Run the profile audit",
    benefit:
      "see exactly what a customer sees on Google before they walk in, and what is missing",
    href: "/account/gbp-audit",
    effort: "it runs itself",
  },
  booking_requests: {
    step: "booking_requests",
    label: "Turn on appointment requests",
    benefit:
      "get a text with the customer's name and number when someone wants an appointment, and answer with one letter",
    href: "/account/booking-requests",
    effort: "already on once the listing is claimed",
  },
  featured: {
    step: "featured",
    label: "Featured placement",
    benefit: "show up first in their own city on the pages people actually search",
    href: "/membership",
    effort: "a conversation",
  },
};

/** The first step they have not completed. Null when they are through it all. */
export function nextStep(done: {
  claimed: boolean;
  googleConnected: boolean;
  auditRun: boolean;
  bookingRequests: boolean;
}): FunnelStep | null {
  if (!done.claimed) return "claim_listing";
  if (!done.googleConnected) return "connect_google";
  if (!done.auditRun) return "run_audit";
  if (!done.bookingRequests) return "booking_requests";
  // Featured is never auto-suggested. It is the one step that costs money, and
  // an agent that pushes the paid tier unprompted is the fastest way to make
  // every other suggestion read as a sales pitch.
  return null;
}
