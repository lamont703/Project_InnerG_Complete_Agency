"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, Baby, DollarSign, MapPin, ArrowRight } from "lucide-react";
import { fetchKidsBarbers, type KidsBarberListing } from "./actions";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

const FAQS_STATIC = [
  {
    q: "What age is considered a kids haircut?",
    a: "It varies by barber — most Houston barbers list their own age cutoff (commonly 10, 12, or 17 and under) directly on their service menu. Check the specific listing below for that barber's exact age range.",
  },
  {
    q: "Should I book ahead for a kids haircut?",
    a: "Some barbers restrict kids' appointments to specific days or hours (a few only take kids cuts on certain weekdays or after a certain time) — check the barber's real listed service name below, and confirm directly with the shop before showing up.",
  },
];

export default function KidsHaircutsHoustonPage() {
  const [listings, setListings] = useState<KidsBarberListing[]>([]);
  const [avgKidsPrice, setAvgKidsPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKidsBarbers().then((result) => {
      setListings(result.listings);
      setAvgKidsPrice(result.avgKidsPrice);
      setLoading(false);
    });
  }, []);

  const priceFaq = {
    q: "How much does a kids haircut cost in Houston?",
    a: avgKidsPrice
      ? `Based on real, currently-listed prices from Houston barbers who offer kids cuts, the average price is around $${avgKidsPrice}. Prices vary by barber and the child's age — see the real listings on this page for current pricing.`
      : "Prices vary by barber — see the real, currently-listed prices on this page.",
  };
  const faqs = [priceFaq, ...FAQS_STATIC];

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Baby className="w-3 h-3" />
            Real Houston Barbers
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Kids Haircuts in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real Houston barbers who list a kids haircut as a named service on their own menu — ranked by real
            customer ratings, with real prices and age ranges.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">
              No kids-cut listings found right now — check back soon, this list updates as barbers update their
              service menus.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">
              {listings.length} Houston barber{listings.length === 1 ? "" : "s"} who list a kids haircut as a real
              service:
            </p>
            {listings.map((barber, i) => (
              <div
                key={barber.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">{barber.name}</h3>
                  {(barber.metroArea || barber.address) && (
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {barber.metroArea || barber.address}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {barber.kidsPrice != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <DollarSign className="w-3 h-3" /> ${barber.kidsPrice} — {barber.kidsServiceName}
                      </span>
                    )}
                    {barber.rating != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-500" /> {Number(barber.rating).toFixed(1)}
                        {barber.reviewCount ? ` (${barber.reviewCount})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                {barber.slug && (
                  <Link
                    href={`/barbers/${barber.slug}`}
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
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-black text-slate-900 not-prose mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
          <p className="not-prose text-sm">
            Looking for a different service, or a different city?{" "}
            <Link href="/tools/barbershop-search?tab=Barbers" className="text-indigo-600 font-bold hover:underline">
              Search the full directory
            </Link>{" "}
            of Texas barbers, salons, and cosmetologists.
          </p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/kids-haircuts-houston#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: faqs.map((faq) => ({
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
