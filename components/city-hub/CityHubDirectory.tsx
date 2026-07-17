import Link from "next/link";
import { Star, ArrowRight, Award, MapPin, Scissors, Building2, UserCheck, GraduationCap, ShoppingBag, Armchair, DollarSign } from "lucide-react";
import type { CityHubData } from "@/lib/city-hub-data";
import { EzoicAd } from "@/components/shared/ezoic-ad";

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
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

// Generalized version of app/houston/HoustonDirectory.tsx — same section
// layout, card design, and zip-code drilldown chip grid, now that
// city-hub-data.ts computes zipCounts for every city, not just Houston.
// cityLabel feeds the "View All" search-tool link's query param; citySlug
// feeds the zip-chip hrefs (`/${citySlug}/${zip}`).
export function CityHubDirectory({
  data,
  title,
  subtitle,
  cityLabel,
  citySlug,
  backHref,
  backLabel,
  zipQuerySuffix,
}: {
  data: CityHubData;
  title: string;
  subtitle: string;
  cityLabel: string;
  citySlug: string;
  backHref: string;
  backLabel: string;
  /** Appended to "View All" search links so a per-zip page's links stay scoped, e.g. " 77099". */
  zipQuerySuffix?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <EzoicAd className="mb-8" />

        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">{title}</h1>
          <p className="text-slate-600">{subtitle}</p>
        </div>

        {(data.avgSchoolScore != null || data.openChairs > 0 || data.medianWeeklyRent != null) && (
          <div className="max-w-2xl mx-auto mb-10 flex flex-wrap gap-3 justify-center">
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
                  href={`/tools/barbershop-search?tab=${encodeURIComponent(section.searchTab)}&q=${encodeURIComponent(cityLabel + (zipQuerySuffix || ""))}`}
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
                    href={`/${citySlug}/${z.zip}`}
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
