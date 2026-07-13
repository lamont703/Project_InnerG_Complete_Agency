"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, Moon, Clock, MapPin, ArrowRight } from "lucide-react";
import { fetchLateNightBarbers, type LateNightBarberListing } from "./actions";

const FAQS_STATIC = [
  {
    q: "Is there a barber open late near me tonight in Houston?",
    a: "Depends on the night — hours vary by day for most barbers, so check the specific late days listed for each barber below rather than assuming every day matches their latest closing time.",
  },
  {
    q: "How current are these hours?",
    a: "These are the real, currently-listed hours from each barber's own profile, not a generic estimate — but hours can change without notice, so it's worth confirming directly with the barber before heading over late.",
  },
];

export default function LateNightBarbersHoustonPage() {
  const [listings, setListings] = useState<LateNightBarberListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLateNightBarbers().then((result) => {
      setListings(result);
      setLoading(false);
    });
  }, []);

  const latestOverall = listings[0]?.latestCloseLabel;
  const timingFaq = {
    q: "What time do barbershops close in Houston?",
    a: latestOverall
      ? `Most close by early evening, but a real subset stay open much later — the latest currently-listed closing time on this page is ${latestOverall}. See the full ranked list below for who's open latest on which day.`
      : "Hours vary widely — see the real, currently-listed hours on this page.",
  };
  const faqs = [timingFaq, ...FAQS_STATIC];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Moon className="w-3 h-3" />
            Real Houston Hours
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Late Night Barbers in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real Houston barbers with a closing time of 8 PM or later, ranked by how late they're actually open —
            not a generic directory of every shop in the city.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
            <p className="text-sm text-amber-900 leading-relaxed">
              No late-night listings found right now — check back soon, this list updates as barbers update their
              hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">
              {listings.length} Houston barber{listings.length === 1 ? "" : "s"} open until 8 PM or later, ranked by
              closing time:
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
                    <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                      <Clock className="w-3 h-3" /> Until {barber.latestCloseLabel}
                      {barber.lateDays.length > 0 ? ` (${barber.lateDays.join(", ")})` : ""}
                    </span>
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
