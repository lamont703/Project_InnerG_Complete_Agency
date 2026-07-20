"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Scissors,
  Sparkles,
  MapPin,
  DollarSign,
  Star,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Users,
} from "lucide-react";
import {
  findHiringShopsNearby,
  requestShopIntro,
  submitSalonWaitlist,
  type HiringShopMatch,
  type PayPreference,
} from "./actions";
import { Navbar } from "@/components/layout/navbar";

const FAQS = [
  {
    q: "Where can I find barbershop apprentice jobs in Houston?",
    a: "Enter your neighborhood or ZIP code above and we'll match you against real Houston barbershops that have directly confirmed they're hiring — not scraped or stale job-board listings. You can request a direct intro to any shop with no account needed.",
  },
  {
    q: "Where should I work after cosmetology school in Houston?",
    a: "We're building the same confirmed-hiring matching for salons that already exists for barbershops, but that outreach hasn't started yet — no salon in our system has confirmed an opening. Join the waitlist above and we'll text you the moment one does, instead of you having to cold-call salons one at a time.",
  },
  {
    q: "Are there hair salons hiring new graduates in Houston right now?",
    a: "Not confirmed in our system yet — salon hiring outreach is still being built out. Joining the waitlist puts you first in line the moment a real, confirmed opening shows up near you.",
  },
  {
    q: "Do I need to pick booth rent or commission before searching?",
    a: "No — picking 'No Preference' still returns the closest confirmed-hiring shops. Choosing booth rent or commission just prioritizes shops that match your preference at the top of your results.",
  },
  {
    q: "Is this a real job board or scraped listings?",
    a: "Neither. Every barbershop result has directly confirmed to us that they're currently hiring — through the same outreach that also runs Inner G Complete's Shop Day matching pipeline. If a shop hasn't confirmed, it won't show up as a match.",
  },
];

type Persona = "barber" | "cosmetologist";
type Step = "persona" | "quiz" | "results" | "intro" | "intro-success" | "waitlist" | "waitlist-success";

export default function BarbershopApprenticeJobsPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [step, setStep] = useState<Step>("persona");
  const [neighborhood, setNeighborhood] = useState("");
  const [payPreference, setPayPreference] = useState<PayPreference>("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<HiringShopMatch[]>([]);
  const [searchMeta, setSearchMeta] = useState<{ widened: boolean; centerLabel: string } | null>(null);
  const [selectedShop, setSelectedShop] = useState<HiringShopMatch | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const choosePersona = (p: Persona) => {
    setPersona(p);
    setStep("quiz");
  };

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    const result = await findHiringShopsNearby(neighborhood, payPreference);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setResults(result.matches);
    setSearchMeta({ widened: result.widened, centerLabel: result.centerLabel });
    setStep("results");
  };

  const submitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!neighborhood.trim()) {
      setError("Enter a Houston neighborhood, ZIP code, or address.");
      return;
    }
    if (persona === "barber") {
      await runSearch();
    } else {
      setStep("waitlist");
    }
  };

  const submitIntro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setLoading(true);
    setError(null);
    const result = await requestShopIntro({
      name,
      phone,
      email,
      neighborhood,
      desiredPayStructure: payPreference,
      shopId: selectedShop.id,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("intro-success");
  };

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await submitSalonWaitlist({
      name,
      phone,
      email,
      neighborhood,
      desiredPayStructure: payPreference,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("waitlist-success");
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-10 sm:pb-16">

        {/* Hero */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3" />
            Free — No Account Needed
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Barbershop Apprentice Jobs in Houston
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Tell us your neighborhood and pay-structure preference — we&apos;ll show you barbershops confirmed
            hiring near you right now. Looking for where to work after cosmetology school in Houston? We&apos;ve
            got you too.
          </p>
        </div>

        {/* Step: Persona */}
        {step === "persona" && (
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <button
              onClick={() => choosePersona("barber")}
              className="bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center transition-colors shadow-sm group"
            >
              <Scissors className="w-8 h-8 text-indigo-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-black text-slate-900">I&apos;m a Barber</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Find barbershops hiring near you</p>
            </button>
            <button
              onClick={() => choosePersona("cosmetologist")}
              className="bg-white border-2 border-slate-200 hover:border-fuchsia-400 rounded-2xl p-8 text-center transition-colors shadow-sm group"
            >
              <Sparkles className="w-8 h-8 text-fuchsia-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-black text-slate-900">I&apos;m a Cosmetologist / Stylist</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Find salons hiring near you</p>
            </button>
          </div>
        )}

        {/* Step: Quiz */}
        {step === "quiz" && persona && (
          <form
            onSubmit={submitQuiz}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-10 space-y-6"
          >
            <button
              type="button"
              onClick={() => setStep("persona")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Your Houston neighborhood, ZIP, or address
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="e.g. Midtown, 77004, or a street address"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                Pay structure preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Booth Rent", "Commission", "any"] as PayPreference[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPayPreference(opt)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                      payPreference === opt
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {opt === "any" ? "No Preference" : opt}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-2">
                Not sure which one pays more?{" "}
                <Link href="/insights/booth-rent-vs-commission" className="text-indigo-600 font-bold hover:underline">
                  See the real Houston numbers
                </Link>
                .
              </p>
            </div>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {persona === "barber" ? "Find Shops Hiring Now" : "Find Salons Hiring Now"}
            </button>
          </form>
        )}

        {/* Step: Results (barber) */}
        {step === "results" && (
          <div className="mb-10 space-y-4">
            <button
              type="button"
              onClick={() => setStep("quiz")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Search again
            </button>

            {results.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <p className="text-sm text-amber-900 leading-relaxed">
                  We don&apos;t have any barbershops confirmed hiring in the greater Houston area right now.
                  Openings change fast — check back soon, or{" "}
                  <Link href="/barber-beauty-network" className="font-bold underline">
                    create a Career Passport
                  </Link>{" "}
                  so shops can find you the moment one opens up.
                </p>
              </div>
            ) : (
              <>
                {searchMeta?.widened && (
                  <p className="text-xs text-slate-500 font-medium italic">
                    No exact matches close to &quot;{searchMeta.centerLabel}&quot; — here are the closest
                    confirmed-hiring shops in the greater Houston area.
                  </p>
                )}
                <p className="text-sm font-bold text-slate-700">
                  {results.length} shop{results.length === 1 ? "" : "s"} hiring near &quot;{searchMeta?.centerLabel}
                  &quot;:
                </p>
                {results.map((shop) => (
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
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                          <MapPin className="w-3 h-3" /> {shop.distance_miles} mi
                        </span>
                        {shop.rating && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                            <Star className="w-3 h-3 fill-amber-500" /> {shop.rating} ({shop.total_reviews || 0})
                          </span>
                        )}
                        {shop.rent_type && (
                          <span
                            className={`inline-flex items-center text-[10px] font-black uppercase tracking-wide rounded-full px-2 py-0.5 ${
                              shop.pay_preference_match
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {shop.rent_type}
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
                        setSelectedShop(shop);
                        setStep("intro");
                      }}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                    >
                      Request an Intro
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Step: Intro request form (barber) */}
        {step === "intro" && selectedShop && (
          <form
            onSubmit={submitIntro}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-10 space-y-5"
          >
            <button
              type="button"
              onClick={() => setStep("results")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to results
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-900">Request an intro to {selectedShop.shop_name}</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                We&apos;ll send your info directly to the shop and start a Shop Day request you can track.
              </p>
            </div>
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
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send My Info
            </button>
          </form>
        )}

        {/* Step: Intro success */}
        {step === "intro-success" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center mb-10">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-black text-slate-900 mb-1">Request sent!</h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
              {selectedShop?.shop_name} has your info. You can track the status of your request anytime with your
              phone number at{" "}
              <Link href="/shop-day-requests" className="font-bold text-indigo-600 hover:underline">
                /shop-day-requests
              </Link>
              .
            </p>
          </div>
        )}

        {/* Step: Salon waitlist (honest fallback) */}
        {step === "waitlist" && (
          <form
            onSubmit={submitWaitlist}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-10 space-y-5"
          >
            <button
              type="button"
              onClick={() => setStep("quiz")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-5 flex gap-3">
              <Clock className="w-5 h-5 text-fuchsia-700 shrink-0 mt-0.5" />
              <p className="text-sm text-fuchsia-900 leading-relaxed">
                Straight talk: we don&apos;t have any salons confirmed hiring in Houston yet — that outreach hasn&apos;t
                started. Leave your info and we&apos;ll text you the moment a salon near &quot;{neighborhood}&quot;
                confirms an opening.
              </p>
            </div>
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
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-60 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-fuchsia-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Join the List
            </button>
          </form>
        )}

        {/* Step: Waitlist success */}
        {step === "waitlist-success" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center mb-10">
            <CheckCircle2 className="w-10 h-10 text-fuchsia-600 mx-auto mb-3" />
            <h2 className="text-lg font-black text-slate-900 mb-1">You&apos;re on the list</h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
              We&apos;ll text you the moment a salon near you confirms an opening. In the meantime, browse salons on
              our{" "}
              <Link href="/tools/barbershop-search?tab=Salons" className="font-bold text-fuchsia-600 hover:underline">
                search engine
              </Link>
              .
            </p>
          </div>
        )}

        {/* On-page SEO / FAQ copy — mirrored in FAQPage JSON-LD below */}
        <div className="prose prose-sm max-w-none text-slate-600 space-y-8 mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 not-prose">Common Questions</h2>
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-black text-slate-900 not-prose mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
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
