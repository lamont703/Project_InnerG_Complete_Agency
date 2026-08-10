"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, MapPin, ArrowRight, Scissors } from "lucide-react";
import { fetchEastEndShops, type EastEndShopListing } from "./actions";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

const FAQS = [
  {
    q: "How many barbershops are in Houston's East End?",
    a: "Real, currently-tracked count: the number shown at the top of this page, across the 77003, 77011, 77012, 77023, and 77029 zip codes.",
  },
  {
    q: "What is East End Barber's rating?",
    a: "See the ranked list below for East End Barber's real, current rating and review count alongside every other real shop in the neighborhood.",
  },
];

export default function EastEndHoustonBarbershopsPage() {
  const [listings, setListings] = useState<EastEndShopListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEastEndShops().then((result) => {
      setListings(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Scissors className="w-3 h-3" />
            Real Houston Shops
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Barbershops in Houston&apos;s East End
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real barbershops across the East End neighborhood (77003, 77011, 77012, 77023, 77029) — ranked
            by real customer ratings and review counts.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">No shops found right now — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">
              {listings.length} real barbershop{listings.length === 1 ? "" : "s"} in Houston&apos;s East End:
            </p>
            {listings.map((shop, i) => (
              <div
                key={shop.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">{shop.shopName}</h3>
                  {shop.address && (
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {shop.address}
                    </p>
                  )}
                  {shop.rating != null && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 mt-1.5">
                      <Star className="w-3 h-3 fill-amber-500" /> {Number(shop.rating).toFixed(1)}
                      {shop.reviewCount ? ` (${shop.reviewCount} reviews)` : ""}
                    </span>
                  )}
                </div>
                {shop.slug && (
                  <Link
                    href={`/shop/${shop.slug}`}
                    data-ig-click="outbound_lead"
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                  >
                    View Profile
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
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
            Looking for a different neighborhood?{" "}
            <Link href="/tools/barbershop-search" className="text-indigo-600 font-bold hover:underline">
              Search the full directory
            </Link>{" "}
            of Texas barbershops, salons, and cosmetologists.
          </p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/east-end-houston-barbershops#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
          )),
        }}
      />
    </div>
  );
}
