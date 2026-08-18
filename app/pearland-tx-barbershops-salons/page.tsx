"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, MapPin, ArrowRight, Scissors } from "lucide-react";
import { fetchPearlandListings, type PearlandListing } from "./actions";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

const FAQS = [
  {
    q: "How many barbershops and salons are in Pearland, TX?",
    a: "Real, currently-tracked count: the number shown at the top of this page, verified directly against real business addresses in Pearland.",
  },
  {
    q: "Is this list the same as a generic directory?",
    a: "No — every listing here is a real business with a real, verified Pearland address, ranked by real customer ratings and review counts, not a paid placement or a scraped list.",
  },
];

export default function PearlandBarbershopsSalonsPage() {
  const [listings, setListings] = useState<PearlandListing[]>([]);
  const [filter, setFilter] = useState<"All" | "Barbershop" | "Salon">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPearlandListings().then((result) => {
      setListings(result);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "All" ? listings : listings.filter((l) => l.category === filter);
  const shopCount = listings.filter((l) => l.category === "Barbershop").length;
  const salonCount = listings.filter((l) => l.category === "Salon").length;

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Scissors className="w-3 h-3" />
            Real Pearland Businesses
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Barbershops &amp; Salons in Pearland, TX
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            {loading ? "Loading real businesses..." : `${shopCount} real barbershops and ${salonCount} real salons in Pearland`}
            , ranked by real customer ratings and review counts.
          </p>
        </div>

        {!loading && (
          <div className="flex justify-center gap-2 mb-8">
            {(["All", "Barbershop", "Salon"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                  filter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">No listings found right now — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            {filtered.map((biz, i) => (
              <div
                key={biz.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 truncate">{biz.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      {biz.category}
                    </span>
                  </div>
                  {biz.address && (
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {biz.address}
                    </p>
                  )}
                  {biz.rating != null && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 mt-1.5">
                      <Star className="w-3 h-3 fill-amber-500" /> {Number(biz.rating).toFixed(1)}
                      {biz.reviewCount ? ` (${biz.reviewCount} reviews)` : ""}
                    </span>
                  )}
                </div>
                {biz.slug && (
                  <Link
                    href={biz.profileUrl}
                    data-ig-click="entity_profile_open"
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
            Looking for a different city?{" "}
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
            "@id": `${SITE_URL}/pearland-tx-barbershops-salons#faqpage`,
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
