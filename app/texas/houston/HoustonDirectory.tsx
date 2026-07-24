import Link from "next/link";
import { Star, ArrowRight, Award, MapPin, Scissors, Building2, UserCheck, GraduationCap, ShoppingBag, Armchair, DollarSign, Compass, CalendarDays } from "lucide-react";
import type { HoustonData } from "./data";
import { Navbar } from "@/components/layout/navbar";
import { AdSponsorshipBanner } from "@/components/ads/AdSponsorshipBanner";
import { directoryHrefForSection } from "@/lib/directory-config";

// These are all real, previously-orphaned Houston-area landing pages (no
// internal links pointed at them from anywhere in the app before this) —
// surfaced here rather than on /texas since they're neighborhood/service
// pages specific to this one metro, not statewide content. Keeps the same
// "solid card = real content" convention as the qualifying-city cards on
// /texas. Katy and Pearland moved out to their own city hub pages (see
// components/city-hub/CityHubDirectory.tsx's CITY_SERVICE_LINKS) since
// they're qualifying cities in their own right, not Houston sub-pages.
const HOUSTON_SERVICE_LINKS: { href: string; label: string }[] = [
  { href: "/best-barbershops-in-houston", label: "Best Barbershops in Houston" },
  { href: "/best-salons-in-houston", label: "Best-Rated Salons in Houston" },
  { href: "/east-end-houston-barbershops", label: "East End Houston Barbershops" },
  { href: "/hair-extensions-houston", label: "Hair Extensions in Houston" },
  { href: "/kids-haircuts-houston", label: "Kids Haircuts in Houston" },
  { href: "/late-night-barbers-houston", label: "Late-Night Barbers in Houston" },
  { href: "/locs-houston", label: "Locs Specialists in Houston" },
  { href: "/precision-fade-haircuts-houston", label: "Precision Fade Haircuts in Houston" },
  { href: "/cosmetology-schools-houston", label: "Cosmetology & Barber Schools in Houston" },
  { href: "/barber-booth-rent-houston", label: "Barber Booth Rent in Houston" },
  { href: "/salon-suites-for-rent-houston", label: "Salon Suites for Rent in Houston" },
  { href: "/barbershop-apprentice-jobs-houston", label: "Barbershop Apprentice Jobs in Houston" },
];

const ZIP_SIGNAL_COLORS = {
  "Talent-Rich": "bg-green-500",
  "Balanced": "bg-blue-400",
  "Competitive": "bg-red-500",
  "Hiring, No Local Talent": "bg-amber-500",
} as const;

const SECTION_ICONS: Record<string, any> = {
  shops: Scissors,
  salons: Building2,
  barbers: UserCheck,
  cosmetologists: UserCheck,
  barberSchools: GraduationCap,
  cosmetSchools: GraduationCap,
  stores: ShoppingBag,
  events: CalendarDays,
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

export function HoustonDirectory({
  data,
  title,
  subtitle,
  backHref,
  backLabel,
  zipQuerySuffix,
  showServiceLinks,
}: {
  data: HoustonData;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  /** Appended to "View All" search links so a per-zip page's links stay scoped, e.g. " 77099". */
  zipQuerySuffix?: string;
  /** Only the top-level /houston page shows this — repeating it on every /houston/[zip] subpage would be noise. */
  showServiceLinks?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">{title}</h1>
          <p className="text-slate-600">{subtitle}</p>
        </div>

        {(data.avgSchoolScore != null || data.openChairs > 0 || data.medianWeeklyRent != null) && (
          <div className="max-w-2xl mx-auto mb-8 flex flex-wrap gap-3 justify-center">
            {data.avgSchoolScore != null && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5">
                <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-sm text-slate-600">
                  Schools average a{" "}
                  <span className={`font-black ${scoreColor(data.avgSchoolScore)}`}>{Math.round(data.avgSchoolScore)}</span>{" "}
                  2026 score
                </p>
              </div>
            )}
            {data.openChairs > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5">
                <Armchair className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-slate-600">
                  <span className="font-black text-slate-900">{data.openChairs.toLocaleString()}</span> open chairs right now
                </p>
              </div>
            )}
            {data.medianWeeklyRent != null && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5">
                <DollarSign className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-slate-600">
                  <span className="font-black text-slate-900">${data.medianWeeklyRent.toLocaleString()}</span>/wk median booth rent
                </p>
              </div>
            )}
          </div>
        )}

        {/* Exclusive Houston City Sponsorship Banner */}
        <div className="mb-8">
          <AdSponsorshipBanner type="city" cityLabel="Houston" />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {data.sections.map((section) => (
            <div key={section.key} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {SECTION_ICONS[section.key] && (() => {
                    const Icon = SECTION_ICONS[section.key];
                    return <Icon className="w-5 h-5 text-slate-700" />;
                  })()}
                  <h2 className="text-lg font-black text-slate-900">{section.label}</h2>
                  <span className="text-sm font-bold text-slate-400">({section.count.toLocaleString()})</span>
                </div>
                <Link
                  href={directoryHrefForSection(section.key, "houston")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors p-4 block"
                    >
                      <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.rating != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {Number(item.rating).toFixed(1)}
                            {item.reviews ? <span className="text-slate-400 font-medium">({item.reviews})</span> : null}
                          </span>
                        )}
                        {item.score != null && (
                          <span className={`text-xs font-black ${scoreColor(item.score)}`}>
                            {Math.round(item.score)} score
                          </span>
                        )}
                        {item.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {section.count > 0
                    ? `${section.count} here — browse them all in the search engine.`
                    : "None found yet."}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Explore Houston Services */}
        {showServiceLinks && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mt-8">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Explore Houston Services</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Neighborhood and service-specific guides across the Houston metro.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {HOUSTON_SERVICE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
                >
                  <p className="font-bold text-slate-900 text-sm">{link.label}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Browse by Zip Code */}
        {data.zipCounts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mt-8">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Browse by Zip Code</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Dot color is an inferred opportunity signal: professionals-per-venue density plus which shops/salons
              are actively hiring — not a lookup, a computed read on each zip's labor market.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {data.zipCounts.map((z) => {
                const dot = z.signal ? ZIP_SIGNAL_COLORS[z.signal.label] : "bg-slate-300";
                const signalPart = z.signal
                  ? `${z.signal.label} — ${z.signal.professionals} professionals, ${z.signal.venues} venues (${z.signal.hiringVenues} hiring)`
                  : "Not enough data to classify";
                const rentPart = z.openChairs > 0 || z.medianWeeklyRent != null
                  ? ` | ${z.openChairs} open chairs${z.medianWeeklyRent != null ? `, $${z.medianWeeklyRent}/wk median rent` : ""}`
                  : "";
                const title = signalPart + rentPart;
                return (
                  <Link
                    key={z.zip}
                    href={`/texas/houston/${z.zip}`}
                    title={title}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors text-sm font-bold text-slate-700"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    {z.zip}
                    <span className="text-slate-400 font-medium">({z.count})</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
              {(Object.keys(ZIP_SIGNAL_COLORS) as (keyof typeof ZIP_SIGNAL_COLORS)[]).map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ZIP_SIGNAL_COLORS[label]}`} />
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full shrink-0 bg-slate-300" />
                Not enough data
              </span>
            </div>
          </div>
        )}

        <div className="text-center mt-10">
          <Link href={backHref} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
