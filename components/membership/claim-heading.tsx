"use client";

import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

/**
 * The heading, which answers the tap that got someone here.
 *
 * Everyone arriving from a "Is this your shop?" button asked one specific
 * question — can I claim THIS business — and the page replied "Join the
 * ShearQuery Community". A real visitor did exactly that on an iPhone and
 * left after three seconds without the shop's name ever appearing on screen.
 *
 * A client component rather than reading searchParams on the page, because
 * that would make the whole route dynamic. The generic heading renders
 * server-side and is replaced on hydration when a claim is in progress, so a
 * plain /membership visit is unaffected.
 */
export function ClaimHeading() {
  const params = useSearchParams();
  const claimName = params.get("claim_name");
  const claimType = params.get("claim_type");

  if (!claimName) {
    return (
      <>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
          <Sparkles className="w-3 h-3" />
          Free Community Tier
        </span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight mb-4">
          Join the ShearQuery Community
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Free membership for barbers, stylists, and beauty professionals. Sign up in under a
          minute, claim your listing, and earn the verified badge on your ShearQuery profile.
        </p>
      </>
    );
  }

  // "school" reads oddly as "your school listing"; the rest are businesses.
  const noun =
    claimType === "cosmetology_school" || claimType === "barber_school" ? "school" : "listing";

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
