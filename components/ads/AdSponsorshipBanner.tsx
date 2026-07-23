"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";

interface AdSponsorshipBannerProps {
  type: "state" | "city";
  cityLabel?: string;
  className?: string;
}

export function AdSponsorshipBanner({
  type,
  cityLabel = "Local Metro",
  className = "",
}: AdSponsorshipBannerProps) {
  const isState = type === "state";
  const imageSrc = isState
    ? "/images/ads/texas_state_sponsor_banner.png"
    : "/images/ads/texas_city_sponsor_banner.png";

  const bannerTitle = isState
    ? "Exclusive Texas Statewide Partner Opportunity"
    : `Exclusive ${cityLabel} Metro Hub Partner Opportunity`;

  const placementLabel = isState
    ? "Texas State Hub Banner"
    : `${cityLabel} City Hub Banner`;

  const mailtoSubject = encodeURIComponent(`Advertising Inquiry - ${placementLabel}`);
  const mailtoBody = encodeURIComponent(
    `Hello ShearQuery Team,\n\nI am interested in reserving the exclusive sponsorship slot for the ${placementLabel}.\n\nPlease provide details on pricing, audience demographics, and availability.\n\nThank you!`
  );

  const sponsorHref = `mailto:sponsorships@innergcomplete.com?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-amber-500/50 group ${className}`}
    >
      <Link href={sponsorHref} className="block relative aspect-[21/9] sm:aspect-[24/7] w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={bannerTitle}
          fill
          priority
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
        />
        
        {/* Subtle overlay gradient for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Floating pill badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-400 text-xs font-bold shadow-lg backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Sponsorship Available</span>
        </div>

        {/* Call to action floating button on bottom right */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all group-hover:scale-105">
          <span>Inquire Now</span>
          <ArrowUpRight className="w-4 h-4 text-slate-950 stroke-[3]" />
        </div>
      </Link>
    </div>
  );
}
