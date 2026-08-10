"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, DollarSign, Star, Loader2, CheckCircle2, Users, Clock, Sparkles } from "lucide-react";
import { fetchSalonSuiteListings, type SalonSuiteListing } from "./actions";
import { submitSalonWaitlist } from "@/app/barbershop-apprentice-jobs-houston/actions";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

const FAQS = [
  {
    q: "Are there private salon suites for rent in Houston right now?",
    a: "We don't have any confirmed suite listings in our system yet — that outreach to Houston salons hasn't started. Join the list below and we'll text you the moment a real suite is confirmed available, instead of you cold-calling salons one at a time.",
  },
  {
    q: "What does a salon suite rental actually require in Texas?",
    a: "A TDLR Mini-Establishment license — the same license that covers any independently-operated, walled-off rented space inside a licensed establishment. See our Booth Rental Requirements guide for the full breakdown.",
  },
  {
    q: "Is renting a salon suite different from a barbershop booth?",
    a: "Legally, no — both fall under the same TDLR Mini-Establishment license. The difference is just the physical setup (a private, enclosed suite vs. an open chair) and typically a higher weekly rent to reflect it.",
  },
  {
    q: "Should I look at barbershop booth rent instead?",
    a: "If you're a barber, yes — we have real, currently-listed barbershop booth availability in Houston today. Salons are still being onboarded.",
  },
];

export default function SalonSuitesForRentHoustonPage() {
  const [listings, setListings] = useState<SalonSuiteListing[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSalonSuiteListings().then((data) => {
      setListings(data);
      setLoading(false);
    });
  }, []);

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitSalonWaitlist({
      name,
      phone,
      email,
      neighborhood: neighborhood || "Houston",
      desiredPayStructure: "Booth Rent",
    });
    setSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3" />
            Live Houston Listings
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Salon Suites for Rent in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Real, currently-listed salon suite availability the moment salons report it — no scraped or stale
            listings.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          submitted ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center mb-10">
              <CheckCircle2 className="w-10 h-10 text-fuchsia-600 mx-auto mb-3" />
              <h2 className="text-lg font-black text-slate-900 mb-1">You&apos;re on the list</h2>
              <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
                We&apos;ll text you the moment a salon suite near you is confirmed available. In the meantime, if
                you&apos;re a barber,{" "}
                <Link href="/barber-booth-rent-houston" className="font-bold text-fuchsia-600 hover:underline">
                  browse real barbershop booth listings
                </Link>
                .
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitWaitlist}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-10 space-y-5"
            >
              <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-5 flex gap-3">
                <Clock className="w-5 h-5 text-fuchsia-700 shrink-0 mt-0.5" />
                <p className="text-sm text-fuchsia-900 leading-relaxed">
                  Straight talk: we don&apos;t have any salon suites confirmed available in Houston yet — that
                  outreach hasn&apos;t started. Leave your info and we&apos;ll text you the moment a real suite is
                  confirmed, instead of you cold-calling salons one at a time.
                </p>
              </div>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Neighborhood or ZIP (optional)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              {submitError && <p className="text-sm text-red-600 font-medium">{submitError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-fuchsia-600/20"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Join the List
              </button>
            </form>
          )
        ) : (
          <div className="space-y-4 mb-16">
            <p className="text-sm font-bold text-slate-700">{listings.length} suite(s) available in Houston:</p>
            {listings.map((suite) => (
              <div
                key={suite.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                {suite.google_images?.[0] && (
                  <img
                    src={suite.google_images[0]}
                    alt={suite.shop_name}
                    className="w-full sm:w-20 h-32 sm:h-20 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">{suite.shop_name}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{suite.formatted_address}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {suite.weekly_rent && (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <DollarSign className="w-3 h-3" /> ${suite.weekly_rent}/wk
                      </span>
                    )}
                    {suite.rating && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-500" /> {suite.rating} ({suite.total_reviews || 0})
                      </span>
                    )}
                    {suite.booth_count_available ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Users className="w-3 h-3" /> {suite.booth_count_available} suite
                        {suite.booth_count_available === 1 ? "" : "s"} open
                      </span>
                    ) : null}
                  </div>
                </div>
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
            Learn the license and contract side in{" "}
            <Link href="/insights/booth-rental-contract-requirements-texas" className="text-fuchsia-600 font-bold hover:underline">
              Booth Rental Requirements in Texas
            </Link>
            .
          </p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/salon-suites-for-rent-houston#faqpage`,
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
