import Image from "next/image";
import Link from "next/link";
import { Star, ArrowUpRight, MapPin, BadgeCheck } from "lucide-react";

// Shared presentational component behind the shop- and salon-page sponsored
// ad spots (see ShopSponsoredAd.tsx / SalonSponsoredAd.tsx for the per-entity
// data). It renders a real, quality-grade ad for a real entity in our
// database so prospective advertisers can see exactly what a paid placement
// looks like, while the click target is an advertising inquiry email (same
// sponsorships@innergcomplete.com mailto mechanism as the state/city hub
// banners in AdSponsorshipBanner.tsx) — not a link to the featured entity.
// That dual purpose is intentional: the card demonstrates production-quality
// creative, and the CTA converts the viewer into an advertising lead.

export interface FeaturedEntity {
  /** Slug of the featured entity — used to suppress the ad on its own page. */
  slug: string;
  name: string;
  city: string;
  rating: number;
  reviews: number;
  taglineChips: string[];
  image: string;
}

interface SponsoredEntityAdProps {
  featured: FeaturedEntity;
  /** Badge text, e.g. "Featured Barbershop" / "Featured Salon". */
  entityLabel: string;
  /** Names which placement this is, for the email subject line + body, e.g.
   *  "Shop Page Ad (Sauccy Fades Feature)". */
  placementLabel: string;
  /** Current page's entity slug — when it matches the featured slug the ad
   *  hides itself (never advertise an entity on its own page). */
  currentSlug?: string;
}

export function SponsoredEntityAd({ featured, entityLabel, placementLabel, currentSlug }: SponsoredEntityAdProps) {
  if (currentSlug && currentSlug === featured.slug) return null;

  const mailtoSubject = encodeURIComponent(`Advertising Inquiry - ${placementLabel}`);
  const mailtoBody = encodeURIComponent(
    `Hello ShearQuery Team,\n\nI saw the sponsored placement on a ${placementLabel} and I'm interested in advertising my business the same way.\n\nPlease send details on pricing, audience reach, and availability for a sponsored placement.\n\nThank you!`
  );
  const sponsorHref = `mailto:sponsorships@innergcomplete.com?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="mb-8">
      {/* "Sponsored" disclosure sits above the card, not inside it, so the
          creative below reads as a genuine ad while staying clearly labeled. */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sponsored</span>
        <span className="text-[11px] font-medium text-slate-400">Ad</span>
      </div>

      <Link
        href={sponsorHref}
        className="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-amber-500/50"
        aria-label={`Advertise your business with a sponsored placement like this ${featured.name} feature`}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Featured entity photo */}
          <div className="relative h-44 sm:h-auto sm:w-56 sm:shrink-0 overflow-hidden">
            <Image
              src={featured.image}
              alt={`${featured.name} — sponsored feature`}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/80 via-slate-950/10 to-transparent pointer-events-none" />
          </div>

          {/* Ad body — real, quality creative for the featured entity */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{entityLabel}</span>
            </div>

            <h3 className="text-xl font-black leading-tight">{featured.name}</h3>

            <div className="mt-1.5 flex items-center gap-3 flex-wrap text-sm">
              <span className="inline-flex items-center gap-1 font-bold text-white">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {featured.rating.toFixed(1)}
                <span className="text-slate-400 font-medium">({featured.reviews} reviews)</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {featured.city}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {featured.taglineChips.map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] font-bold rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 px-2.5 py-1"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* CTA — aimed at prospective advertisers, not entity visitors */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 leading-snug">
                This is a sponsored placement demo.{" "}
                <span className="text-slate-200 font-semibold">Want your business featured here?</span>
              </p>
              <span className="inline-flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all group-hover:scale-105">
                Advertise With Us
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
