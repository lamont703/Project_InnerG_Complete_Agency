import Link from "next/link";
import { Star, ArrowRight, Award, MapPin, Scissors, Building2, UserCheck, GraduationCap, ShoppingBag, Armchair, DollarSign, Compass } from "lucide-react";
import type { CaliforniaHubData } from "@/lib/california-hub-data";
import { Navbar } from "@/components/layout/navbar";
import { SponsorshipBanner } from "@/components/ads/SponsorshipBanner";
import { directoryHrefForSection } from "@/lib/directory-config";

// Genuinely statewide California resources (not tied to one city). These are
// California-specific by design — the exam-prep pages point at the CA Board of
// Barbering & Cosmetology's own data, NOT the Texas exam/regulator.
const CALIFORNIA_STATEWIDE_LINKS: { href: string; label: string }[] = [
  { href: "/california-school-leaderboard", label: "California School Pass-Rate Leaderboard" },
  { href: "/california-cosmetology-exam-intelligence-prep", label: "California Cosmetology Exam Prep" },
  { href: "/california-barber-exam-intelligence-prep", label: "California Barber Exam Prep" },
  { href: "/directory", label: "Full Directory (A–Z)" },
];
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

// California twin of components/texas-hub/TexasHubDirectory.tsx — same
// section layout/card design at statewide scope, with a "Browse California
// Cities" grid in place of the zip-code drilldown. Deliberately omits the
// Texas version's "Statewide Resources" block: those links (exam prep,
// licensing guide, continuing education) are Texas-specific pages that
// have no California equivalent yet — nothing to link to until they exist.
// Qualifying cities (real page) get a solid card linking to their hub;
// non-qualifying ones (not enough real data yet) get a muted card linking
// to the search tool instead — never a dead or thin-content link.
export function CaliforniaHubDirectory({
  data,
  title,
  subtitle,
  backHref,
  backLabel,
}: {
  data: CaliforniaHubData;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
}) {
  const qualifyingCities = data.cities.filter((c) => c.qualifies);
  const otherCities = data.cities.filter((c) => !c.qualifies);

  return (
    <div className="min-h-screen bg-slate-50 light flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12 flex-1 w-full">

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

        {/* Exclusive California State Sponsorship Banner */}
        <div className="mb-8">
          <SponsorshipBanner type="state" scope="California" />
        </div>

        {/* Browse California Cities */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Browse California Cities</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {qualifyingCities.length} cities with enough real, verified businesses for their own directory — the rest
            link straight to the search engine until they do.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {qualifyingCities.map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
              >
                <p className="font-bold text-slate-900 text-sm">{c.city}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.total.toLocaleString()} businesses ({c.shops} shops, {c.salons} salons)
                </p>
              </Link>
            ))}
          </div>
          {otherCities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Not enough data yet</p>
              <div className="flex flex-wrap gap-2">
                {otherCities.map((c) => (
                  <Link
                    key={c.slug}
                    href={c.href}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-500"
                  >
                    {c.city}
                    <span className="text-slate-400 font-medium">({c.total})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

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
                  href={directoryHrefForSection(section.key)}
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

        {/* Statewide Resources */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mt-8">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Statewide Resources</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Tools and guides that apply across California, not just one city.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CALIFORNIA_STATEWIDE_LINKS.map((link) => (
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

        <div className="text-center mt-10">
          <Link href={backHref} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
