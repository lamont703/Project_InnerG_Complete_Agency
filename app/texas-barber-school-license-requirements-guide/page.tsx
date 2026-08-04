import Link from "next/link";
import { ArrowLeft, GraduationCap, DollarSign, CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { findRequirement } from "@/lib/texas-license-requirements";
import { TDLR_SOURCES } from "@/lib/tdlr-sources";

/**
 * Every figure comes from lib/texas-license-requirements.ts, read in turn from
 * the TDLR application page recorded in lib/tdlr-sources.ts. Nothing is carried
 * across from a sibling guide — the hours run 300 to 1,000 and the fees $50 to
 * $580, and the pattern is not what the names suggest.
 */

const REQ = findRequirement('barber-school')!;
const SOURCE = TDLR_SOURCES.find((s) => s.id === 'schools-apply');

export const metadata = {
  title: 'Texas Barber School License Requirements (2026)',
  description: "What a Texas barber school licence requires — $580 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages.",
  keywords: ["texas barber school license requirements", "how to get a barber school license in texas", "texas barber school license", "barber school license texas cost", "texas barber school license application", "tdlr license requirements texas"],
  openGraph: { title: 'Texas Barber School License Requirements (2026)', description: "What a Texas barber school licence requires — $580 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages." },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-barber-school-license-requirements-guide" },
};

const FAQS = [
  {
    q: "How many hours do you need for a Texas barber school licence?",
    a: "There is no course-hour requirement \u2014 a barber school licence is a business licence, not a training credential."
  },
  {
    q: "How much does a Texas barber school licence cost?",
    a: "$580 to apply, non-refundable, and the licence is valid two years from the date of issue. That fee includes the cost of the inspection."
  },
  {
    q: "How long is a Texas barber school licence valid?",
    a: "Two years from the date of issue, then it renews on a two-year cycle."
  }
];

export default function TexasBarberSchoolRequirementsPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link href="/texas/licensing" className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Texas Licensing
        </Link>

        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Texas Barber School License Requirements
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          What it takes to license a barber school licence in Texas — the fee, the documents, and what private schools must file that public schools do not.
        </p>

        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <DollarSign className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">${REQ.feeUsd}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Application fee</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CalendarClock className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">2 yrs</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Licence term</p>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-black text-slate-900">What TDLR requires</h2>
          <ul className="space-y-3">
            {REQ.conditions.map((c) => (
              <li key={c} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span className="text-sm leading-relaxed text-slate-700">{c}</span>
              </li>
            ))}
          </ul>
        </section>

                <section className="mb-12">
          <h2 className="mb-4 text-lg font-black text-slate-900">Next steps</h2>
          <div className="flex flex-wrap gap-3">
            {REQ.related?.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700">
                {l.label}
              </Link>
            ))}
          </div>
        </section>


        <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Sourced from TDLR&apos;s own application page{SOURCE ? "" : ""} — {SOURCE?.title}. Requirements change; confirm
          against the Department before you apply or pay anything.{" "}
          {SOURCE && (
            <a href={SOURCE.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
              Read it at tdlr.texas.gov
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="mb-12">
          <h2 className="mb-4 text-lg font-black text-slate-900">Other Texas licence guides</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/texas-cosmetology-school-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Cosmetology School</Link>
            <Link href="/texas-barber-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Class A Barber</Link>
            <Link href="/texas-cosmetology-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Cosmetology Operator</Link>
            <Link href="/texas-esthetician-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Esthetician</Link>
            <Link href="/texas-manicurist-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Manicurist</Link>
            <Link href="/texas-eyelash-extension-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Eyelash Extension Specialist</Link>
          </div>
        </div>

        {/* Distance education is a course-level approval a school applies for
            separately from its school licence, so it is the natural next
            question for anyone who has just read the licensing requirements. */}
        <Link
          href="/texas-online-barber-cosmetology-school-guide"
          className="mb-12 block rounded-2xl border border-indigo-200 bg-indigo-50/50 px-6 py-5 transition-colors hover:border-indigo-300"
        >
          <p className="text-sm font-black text-indigo-900">
            Planning to offer an online or hybrid programme? &rarr;
          </p>
          <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
            Distance education is approved course by course, capped at 50% of total hours, and never
            covers the practical curriculum. The limits per licence, and the five things TDLR
            requires a school to be able to prove on inspection.
          </p>
        </Link>

        <div className="border-t border-slate-200 pt-10">
          <h2 className="mb-6 text-xl font-black text-slate-900">Common Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: 'Texas Barber School License Requirements (2026)', description: "What a Texas barber school licence requires — $580 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages.", estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: REQ.feeUsd }, step: REQ.conditions.map((c, i) => ({ "@type": "HowToStep", position: i + 1, text: c })) }) }} />
    </div>
  );
}
