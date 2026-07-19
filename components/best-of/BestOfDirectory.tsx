import Link from "next/link";
import { Star, ArrowRight, Award, MapPin, TrendingUp, HelpCircle } from "lucide-react";
import { EzoicAd } from "@/components/shared/ezoic-ad";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FAQSection } from "@/components/insights/faq-section";

export interface BestOfEntry {
  name: string;
  address: string;
  rating: number;
  reviews: number;
  slug: string;
}

// Shared render layer for the 8 "Best Barbershops in {City}" / "Best-Rated
// Salons in {City}" pages (Houston, Austin, San Antonio, Dallas) — same
// visual pattern as components/city-hub/CityHubDirectory.tsx, applied to a
// single ranked category instead of a whole city's sections. Each page.tsx
// supplies its own real, per-city data plus differentiated copy
// (intro/neighborhoodNote/faqs); this component only renders it, so the
// design stays consistent across all 8 without producing 8 templated
// copies of the same JSX.
export function BestOfDirectory({
  city,
  category,
  profileBasePath,
  searchTab,
  totalQualifying,
  minRating,
  minReviews,
  intro,
  neighborhoodNote,
  topRated,
  mostReviewed,
  faqs,
  updatedLabel,
}: {
  city: string;
  category: "Barbershops" | "Salons";
  profileBasePath: string;
  searchTab: string;
  totalQualifying: number;
  minRating: number;
  minReviews: number;
  intro: string;
  neighborhoodNote: string;
  topRated: BestOfEntry[];
  mostReviewed: BestOfEntry[];
  faqs: { question: string; answer: string }[];
  updatedLabel: string;
}) {
  const singular = category === "Barbershops" ? "Barbershop" : "Salon";
  const top = topRated[0];

  return (
    <div className="min-h-screen bg-slate-50 light flex flex-col">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16 flex-1 w-full">
        <EzoicAd className="mb-8" />

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Link href={`/texas/${city.toLowerCase().replace(/\s+/g, "-")}`} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
            {city}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Best {category}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 leading-tight">
          Best {category} in {city} ({new Date().getFullYear()})
        </h1>
        <p className="text-slate-600 leading-relaxed mb-6">{intro}</p>

        <div className="flex flex-wrap gap-3 mb-10">
          {top && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-slate-600">
                Top-rated: <span className="font-black text-slate-900">{top.name}</span> ({top.rating.toFixed(1)}★,{" "}
                {top.reviews.toLocaleString()} reviews)
              </p>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-slate-600">
              <span className="font-black text-slate-900">{totalQualifying.toLocaleString()}</span> real {category.toLowerCase()} rated {minRating.toFixed(1)}+ with {minReviews}+ reviews
            </p>
          </div>
        </div>

        {/* Top Rated */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Top Rated</h2>
            </div>
            <Link
              href={`/tools/barbershop-search?tab=${encodeURIComponent(searchTab)}&q=${encodeURIComponent(city)}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Ranked by real Google rating, then review count as a tiebreaker — highest rating first.
          </p>
          <ol className="space-y-2">
            {topRated.map((entry, i) => (
              <li key={entry.slug}>
                <Link
                  href={`${profileBasePath}/${entry.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                >
                  <span className="text-lg font-black text-slate-300 w-6 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{entry.name}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {entry.address}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1 justify-end">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {entry.rating.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-400">{entry.reviews.toLocaleString()} reviews</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <EzoicAd className="my-8" />

        {/* Neighborhood note — genuine per-city differentiation */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 mb-8 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">{neighborhoodNote}</p>
        </div>

        {/* Most Reviewed */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Most Reviewed</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            The {category.toLowerCase()} {city} residents visit most, by real review volume (4.0★ and up) — a
            different signal than raw rating: proven, high-traffic popularity.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mostReviewed.map((entry) => (
              <Link
                key={entry.slug}
                href={`${profileBasePath}/${entry.slug}`}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors p-4 block"
              >
                <p className="font-bold text-slate-900 text-sm truncate">{entry.name}</p>
                <p className="text-xs text-slate-500 truncate mb-1.5">{entry.address}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {entry.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{entry.reviews.toLocaleString()} reviews</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="pt-8 border-t border-slate-200 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Methodology &amp; Currency</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed italic">
            Every name, address, rating, and review count above is pulled directly from real, live Google-sourced
            data on this platform — not a survey, sponsorship, or editorial guess. "Top Rated" requires at least{" "}
            {minReviews} reviews to qualify, so a single five-star review can't outrank an established {singular.toLowerCase()}.
            Ratings and review counts shift over time; this page was last verified {updatedLabel}. Browse the full,
            live-updated list in the{" "}
            <Link href={`/tools/barbershop-search?tab=${encodeURIComponent(searchTab)}&q=${encodeURIComponent(city)}`} className="text-indigo-600 font-bold hover:underline not-italic">
              {city} search engine
            </Link>
            .
          </p>
        </div>

        <FAQSection faqs={faqs} />

        <div className="text-center mt-10">
          <Link href={`/texas/${city.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            ← Back to {city} Hub
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
