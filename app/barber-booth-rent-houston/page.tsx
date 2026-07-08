"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, DollarSign, Star, Loader2, CheckCircle2, Users, Search, Scissors } from "lucide-react";
import { fetchBoothRentListings, type BoothRentListing } from "./actions";
import { requestShopIntro } from "@/app/barbershop-apprentice-jobs-houston/actions";

const FAQS = [
  {
    q: "How much does a barber booth cost to rent in Houston?",
    a: "Based on live, currently-listed Houston barbershops, weekly booth rent ranges from about $125 to $300, with a median around $180/week. See our full breakdown in Booth Rent vs. Commission.",
  },
  {
    q: "Are these real, currently-available booths?",
    a: "Yes — every listing here is a real Houston barbershop that has reported an open chair and its rent rate. This isn't a scraped or stale job board.",
  },
  {
    q: "Do I need a special license to rent a booth?",
    a: "Yes — Texas requires a TDLR Mini-Establishment license for an independently-operated, physically-separated rented space. See our Booth Rental Requirements guide for the full details.",
  },
  {
    q: "What's the difference between booth rent and commission?",
    a: "Booth rent is a flat weekly fee regardless of what you earn; commission is a percentage split with no fixed fee. Which nets you more depends on your weekly revenue — see our Booth Rent vs. Commission calculator.",
  },
];

export default function BarberBoothRentHoustonPage() {
  const [neighborhood, setNeighborhood] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [listings, setListings] = useState<BoothRentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerLabel, setCenterLabel] = useState<string | null>(null);

  const [selected, setSelected] = useState<BoothRentListing | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const runSearch = async (loc?: string) => {
    setLoading(true);
    const result = await fetchBoothRentListings(loc);
    setListings(result.listings);
    setCenterLabel(result.centerLabel);
    setLoading(false);
  };

  useEffect(() => {
    runSearch();
  }, []);

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await requestShopIntro({
      name,
      phone,
      email,
      neighborhood: centerLabel || "Houston",
      desiredPayStructure: "Booth Rent",
      shopId: selected.id,
    });
    setSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Scissors className="w-3 h-3" />
            Live Houston Listings
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Barber Booth Rent &amp; Chairs for Rent in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real, currently-listed barbershop booths and chairs for rent — weekly rent, chairs available, and a
            direct way to reach the shop. No account needed to browse.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(searchInput);
          }}
          className="flex gap-2 mb-8"
        >
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter by neighborhood or ZIP (optional)"
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors shrink-0"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">
              No booth-rent listings found{centerLabel ? ` near "${centerLabel}"` : ""} right now. Try clearing the
              neighborhood filter, or check back soon — listings change often.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">
              {listings.length} booth{listings.length === 1 ? "" : "s"} available
              {centerLabel ? ` near "${centerLabel}"` : " in Houston"}:
            </p>
            {listings.map((shop) => (
              <div
                key={shop.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                {shop.google_images?.[0] && (
                  <img
                    src={shop.google_images[0]}
                    alt={shop.shop_name}
                    className="w-full sm:w-20 h-32 sm:h-20 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">{shop.shop_name}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{shop.formatted_address}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {shop.weekly_rent && (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <DollarSign className="w-3 h-3" /> ${shop.weekly_rent}/wk
                      </span>
                    )}
                    {shop.distance_miles != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                        <MapPin className="w-3 h-3" /> {shop.distance_miles} mi
                      </span>
                    )}
                    {shop.rating && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-500" /> {shop.rating} ({shop.total_reviews || 0})
                      </span>
                    )}
                    {shop.booth_count_available ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Users className="w-3 h-3" /> {shop.booth_count_available} chair
                        {shop.booth_count_available === 1 ? "" : "s"} open
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelected(shop);
                    setSubmitted(false);
                    setSubmitError(null);
                  }}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                >
                  Contact Shop
                </button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
            <div
              className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {submitted ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <h2 className="text-lg font-black text-slate-900 mb-1">Request sent!</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {selected.shop_name} has your info. Track it anytime at{" "}
                    <Link href="/shop-day-requests" className="font-bold text-indigo-600 hover:underline">
                      /shop-day-requests
                    </Link>
                    .
                  </p>
                  <button
                    onClick={() => setSelected(null)}
                    className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={submitContact} className="space-y-4">
                  <h2 className="text-lg font-black text-slate-900">Contact {selected.shop_name}</h2>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {submitError && <p className="text-sm text-red-600 font-medium">{submitError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="prose prose-sm max-w-none text-slate-600 space-y-8 mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 not-prose mb-3">Common Questions</h2>
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-black text-slate-900 not-prose mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
          <p className="not-prose text-sm">
            Want the full comparison?{" "}
            <Link href="/insights/booth-rent-vs-commission" className="text-indigo-600 font-bold hover:underline">
              Booth Rent vs. Commission
            </Link>{" "}
            breaks down the real numbers, and{" "}
            <Link href="/insights/booth-rental-contract-requirements-texas" className="text-indigo-600 font-bold hover:underline">
              Booth Rental Requirements in Texas
            </Link>{" "}
            covers the license and contract terms.
          </p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
    </div>
  );
}
