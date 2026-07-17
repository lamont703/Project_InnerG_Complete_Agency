"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, Sparkles, DollarSign, MapPin, ArrowRight } from "lucide-react";
import { fetchLocProfessionals, type LocProfessionalListing } from "./actions";
import { EzoicAd } from "@/components/shared/ezoic-ad";

const FAQS_STATIC = [
  {
    q: "What's the difference between a barber and a loctician for locs?",
    a: "Both barbers and cosmetologists in Houston list real loc services — barbers more often for men's styles (dreadlocks, fades combined with locs), cosmetologists more often for retwists, sisterlocks, and starter locs. Check each listing's specific service name below.",
  },
  {
    q: "How often should locs be retwisted?",
    a: "It varies by loc size and hair growth, but most professionals list retwist appointments every 4-8 weeks. Check the specific professional's listed service for their recommended schedule.",
  },
];

export default function LocsHoustonPage() {
  const [listings, setListings] = useState<LocProfessionalListing[]>([]);
  const [avgLocPrice, setAvgLocPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocProfessionals().then((result) => {
      setListings(result.listings);
      setAvgLocPrice(result.avgLocPrice);
      setLoading(false);
    });
  }, []);

  const priceFaq = {
    q: "How much do locs cost in Houston?",
    a: avgLocPrice
      ? `Based on real, currently-listed prices from Houston barbers and cosmetologists who offer loc services, the average price is around $${avgLocPrice}. Prices vary widely by service type (starter locs vs. a routine retwist) — see the real listings on this page for current pricing.`
      : "Prices vary widely by service type — see the real, currently-listed prices on this page.",
  };
  const faqs = [priceFaq, ...FAQS_STATIC];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <EzoicAd className="mb-8" />

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3" />
            Real Houston Professionals
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Locs in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real Houston barbers and cosmetologists who list a loc service — retwists, starter locs,
            interlocking — as a named service on their own menu, ranked by real customer ratings.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">
              No loc-service listings found right now — check back soon, this list updates as professionals
              update their service menus.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">
              {listings.length} Houston professional{listings.length === 1 ? "" : "s"} who list a loc service:
            </p>
            {listings.map((pro, i) => (
              <div
                key={pro.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center font-black text-fuchsia-700 text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 truncate">{pro.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      {pro.professionalType}
                    </span>
                  </div>
                  {(pro.metroArea || pro.address) && (
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {pro.metroArea || pro.address}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {pro.locPrice != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <DollarSign className="w-3 h-3" /> ${pro.locPrice} — {pro.locServiceName}
                      </span>
                    )}
                    {pro.rating != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-500" /> {Number(pro.rating).toFixed(1)}
                        {pro.reviewCount ? ` (${pro.reviewCount})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={pro.profileUrl}
                  data-ig-click="outbound_lead"
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                >
                  View Profile
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none text-slate-600 space-y-8 mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 not-prose mb-3">Common Questions</h2>
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-black text-slate-900 not-prose mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
          <p className="not-prose text-sm">
            Looking for a different service, or a different city?{" "}
            <Link href="/tools/barbershop-search" className="text-fuchsia-600 font-bold hover:underline">
              Search the full directory
            </Link>{" "}
            of Texas barbers, salons, and cosmetologists.
          </p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
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
