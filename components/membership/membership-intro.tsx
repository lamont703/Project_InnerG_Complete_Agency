"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  BadgeCheck,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
  GraduationCap,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { audienceFromParam, AUDIENCES, LIVE_AUDIENCES, type AudienceBenefit } from "@/lib/audiences";

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

const ICONS: Record<AudienceBenefit["icon"], LucideIcon> = {
  sparkles: Sparkles,
  "badge-check": BadgeCheck,
  users: Users,
  "check-circle": CheckCircle2,
  calendar: Calendar,
  "map-pin": MapPin,
  "graduation-cap": GraduationCap,
  "bar-chart": BarChart3,
};

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

  const a = AUDIENCES[audienceFromParam(params.get("for"))];

  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
        <Sparkles className="w-3 h-3" />
        {a.eyebrow}
      </span>
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight mb-4">
        {a.headline}
      </h1>
      <p className="text-slate-600 text-base sm:text-lg leading-relaxed">{a.subhead}</p>
    </>
  );
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
      {/* The switcher is the honest way to serve several audiences off one
          URL: someone who followed a student link but owns a shop can say so
          in one tap, instead of bouncing off copy aimed at somebody else.
          Hidden mid-claim — they already told us why they're here. */}
      {!isClaiming && (
        <div className="flex flex-wrap gap-2">
          {LIVE_AUDIENCES.map((a) => {
            const isActive = a.id === activeId;
            return (
              <Link
                key={a.id}
                href={`/membership?for=${a.id}`}
                scroll={false}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a.label}
              </Link>
            );
          })}
        </div>
      )}

      {active.benefits.map((benefit) => {
        const Icon = ICONS[benefit.icon];
        return (
          <div
            key={benefit.title}
            className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-1.5">{benefit.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{benefit.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
