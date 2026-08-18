import Link from "next/link";
import { ArrowLeft, GraduationCap, DollarSign, CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { findRequirement } from "@/lib/texas-license-requirements";
import { TDLR_SOURCES } from "@/lib/tdlr-sources";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { AgentInvite } from "@/components/journey/agent-invite";
import { questionsForSlug } from "@/lib/agent-invite-questions";

/**
 * Every figure comes from lib/texas-license-requirements.ts, read in turn from
 * the TDLR application page recorded in lib/tdlr-sources.ts. Nothing is carried
 * across from a sibling guide — the hours run 300 to 1,000 and the fees $50 to
 * $580, and the pattern is not what the names suggest.
 */

const REQ = findRequirement('barber-transfer')!;
const SOURCE = TDLR_SOURCES.find((s) => s.id === 'cosmetologist-to-barber');

export const metadata = {
  title: 'Texas Cosmetologist to Class A Barber Crossover Guide (2026)',
  description: "What a Texas cosmetologist to class a barber licence requires — 300 hours, $50 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages.",
  keywords: ["texas cosmetologist to class a barber license requirements", "how to get a cosmetologist to class a barber license in texas", "texas cosmetologist to class a barber license", "cosmetologist to class a barber license texas cost", "texas cosmetologist to class a barber license application", "tdlr license requirements texas", "cosmetologist to class a barber hours texas"],
  openGraph: { title: 'Texas Cosmetologist to Class A Barber Crossover Guide (2026)', description: "What a Texas cosmetologist to class a barber licence requires — 300 hours, $50 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages." },
  alternates: { canonical: `${SITE_URL}/texas-barber-license-transfer-guide` },
};

const FAQS = [
  {
    q: "How many hours do you need for a Texas cosmetologist to class a barber licence?",
    a: "300 hours of instruction at a school licensed in Texas."
  },
  {
    q: "How much does a Texas cosmetologist to class a barber licence cost?",
    a: "$50 to apply, non-refundable, and the licence is valid two years from the date of issue."
  },
  {
    q: "How long is a Texas cosmetologist to class a barber licence valid?",
    a: "Two years from the date of issue, then it renews on a two-year cycle."
  },
  {
    q: "Does my existing licence have to stay active?",
    a: "Yes \u2014 current, active and in good standing throughout the process. If it lapses mid-crossover you lose the shortened route."
  }
];

export default function TexasCosmetologistToClassABarberRequirementsPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link href="/texas/licensing" className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Texas Licensing
        </Link>

        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Texas Cosmetologist to Class A Barber License Requirements
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          The shortened route for someone already licensed in the other trade. 300 hours instead of 1,000, and the reason it exists.
        </p>

        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <GraduationCap className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">300</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Course hours</p>
          </div>
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">17</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Minimum age</p>
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
            <Link href="/texas-cosmetology-license-transfer-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Barber to Cosmetology Operator</Link>
            <Link href="/texas-barber-establishment-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Barber Establishment</Link>
            <Link href="/texas-cosmetology-establishment-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Cosmetology Establishment</Link>
            <Link href="/texas-specialty-establishment-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Specialty Establishment</Link>
            <Link href="/texas-mini-establishment-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Mini-Establishment</Link>
            <Link href="/texas-mobile-establishment-license-requirements-guide" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Mobile Establishment</Link>
          </div>
        </div>

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
              {/* Questions derived from this route, so a page renamed or added
            to the same convention is handled without a second edit.
            See lib/agent-invite-questions.ts. */}
        <AgentInvite questions={questionsForSlug("texas-barber-license-transfer-guide")!} />

</main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-barber-license-transfer-guide#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID), mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
          )) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(
            {
            "@type": "HowTo",
            "@id": `${SITE_URL}/texas-barber-license-transfer-guide#howto`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID), author: authorSchema(), name: 'Texas Cosmetologist to Class A Barber Crossover Guide (2026)', description: "What a Texas cosmetologist to class a barber licence requires — 300 hours, $50 fee, 2-year term — and the exact TDLR process, sourced from the Department's own application pages.", estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: REQ.feeUsd }, step: REQ.conditions.map((c, i) => ({ "@type": "HowToStep", position: i + 1, text: c })) },
          )) }} />
    </div>
  );
}
