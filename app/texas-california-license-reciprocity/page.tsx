import Link from "next/link";
import { ArrowRight, AlertTriangle, ExternalLink, XCircle, ArrowLeftRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  RECIPROCITY_ROWS,
  TEXAS_ROUTE,
  CALIFORNIA_ROUTE,
  NO_COUNTERPART,
  gap,
} from "@/lib/license-reciprocity";

/**
 * Texas ↔ California only, deliberately.
 *
 * A fifty-state grid is 2,450 pages of mostly-identical copy, which is the
 * scaled-content pattern applied to ourselves. These are the two states we hold
 * data for, and the comparison is genuinely specific: four of the ten
 * credentials across the two states have no counterpart at all.
 *
 * The lake says 20,593 Texas licensees hold a mailing address outside Texas —
 * the fifth-largest bucket in the state, ahead of Travis County. That is the
 * measured audience for this page.
 */

export const metadata = {
  title: "Texas ↔ California License Reciprocity (2026): The Real Rules",
  description:
    "Neither state grants reciprocity. What actually happens moving between Texas and California, hours compared per licence, and four credentials with no counterpart.",
  keywords: [
    "texas california cosmetology license reciprocity",
    "can i use my texas barber license in california",
    "california cosmetology license reciprocity texas",
    "transfer cosmetology license to texas",
    "transfer barber license to california",
    "out of state cosmetology license texas",
    "barber license reciprocity states",
    "texas out of state license equivalence",
  ],
  openGraph: {
    title: "Texas ↔ California License Reciprocity (2026): The Real Rules",
    description:
      "Neither state grants reciprocity. Hours compared per licence, both directions, and the four credentials that have no counterpart in the other state.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-california-license-reciprocity" },
};

const FAQS = [
  {
    q: "Does Texas have cosmetology license reciprocity with California?",
    a: "No — and neither does California with Texas. Both states run an equivalence review rather than a transfer. TDLR calls it licence by equivalence and treats your out-of-state licence as evidence of training; California has you apply to sit its exam and reviews your hours to decide whether you qualify. Neither grants a licence on the strength of the other's.",
  },
  {
    q: "Can I use my Texas barber license in California?",
    a: "Not directly. Both states require 1,000 hours for a barber licence, so on paper your training matches — but you still apply to California's Board to sit its examination rather than transferring the licence. The hours parity means you are unlikely to be told to complete more school; the exam is not waived.",
  },
  {
    q: "I'm a Texas eyelash extension specialist moving to California. What happens?",
    a: "California does not license eyelash extension as a standalone credential. Eyelash work sits inside esthetician or cosmetologist scope, so your 320 Texas hours have no direct counterpart and the realistic route is a 600-hour California esthetician licence. Hair weaving is the same story — Texas licenses it at 300 hours, California does not license it separately at all.",
  },
  {
    q: "Does California credit my work experience toward its hour requirement?",
    a: "Yes. Every three months of licensed practice counts as 100 hours of training, recorded on Form C. It only counts for time after you were licensed. Texas does not publish an equivalent conversion.",
  },
  {
    q: "I trained through a Texas apprenticeship. Will California accept it?",
    a: "No. The California Board states it does not accept apprentice hours. If you took the apprentice route in Texas, that training does not carry into a California application regardless of how long you have practised.",
  },
  {
    q: "Which direction is easier for specialty licence holders?",
    a: "Moving to California, on hours alone. California asks 600 hours for esthetician against Texas's 750, and 400 for manicurist against Texas's 600 — so a Texas specialist arrives with more training than California requires. Going the other way, a California esthetician is 150 hours short of the Texas requirement and a California manicurist 200 short.",
  },
];

function HoursCell({ hours, note }: { hours: number | null; note?: string }) {
  if (hours === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
        <XCircle className="h-3.5 w-3.5" />
        No such licence
      </span>
    );
  }
  return (
    <span className="text-sm font-black tabular-nums text-slate-900">
      {hours.toLocaleString()} hrs
      {note ? <span className="ml-2 block text-xs font-medium text-slate-500">{note}</span> : null}
    </span>
  );
}

export default function TexasCaliforniaReciprocityPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Texas &harr; California Licence Reciprocity
        </h1>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          The short version: there isn&apos;t any. Neither state transfers a barbering or cosmetology
          licence from the other. Here is what actually happens instead, in both directions, per
          licence type.
        </p>

        <div className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            &ldquo;Reciprocity&rdquo; describes something that does not exist here
          </h2>
          <p className="text-sm leading-relaxed text-amber-900/90">
            It is the word everyone searches, so it is the word on this page — but neither TDLR nor
            the California Board operates one. Both run an <strong>equivalence review</strong>: they
            look at what you trained in and decide whether it is enough for their own exam. A licence
            in one state is evidence, not a substitute.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">Hours required, side by side</h2>
          <p className="mb-5 text-sm font-medium text-slate-500">
            Where a row says &ldquo;no such licence&rdquo;, the question is not whether your hours
            transfer — it is whether your credential exists in that state at all.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Licence</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Texas</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">California</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Moving TX &rarr; CA</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Moving CA &rarr; TX</th>
                </tr>
              </thead>
              <tbody>
                {RECIPROCITY_ROWS.map((row) => {
                  const toCa = gap(row, "txToCa");
                  const toTx = gap(row, "caToTx");
                  return (
                    <tr key={row.key} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4">
                        {row.txGuide ? (
                          <Link href={row.txGuide} className="text-sm font-bold text-indigo-600 hover:underline">
                            {row.label}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">{row.label}</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><HoursCell hours={row.tx.hours} note={row.tx.note} /></td>
                      <td className="px-5 py-4"><HoursCell hours={row.ca.hours} note={row.ca.note} /></td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {toCa === null ? "—" : toCa === 0 ? "Hours already met" : `${toCa} hrs short`}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {toTx === null ? "—" : toTx === 0 ? "Hours already met" : `${toTx} hrs short`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            &ldquo;Hours already met&rdquo; means your training meets the destination state&apos;s
            minimum. It does not mean the exam is waived — neither state waives its exam.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-black text-slate-900">
            Four credentials with no counterpart
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {NO_COUNTERPART.map((row) => (
              <div key={row.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-1 text-sm font-black text-slate-900">{row.label}</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  {row.tx.hours === null ? row.tx.note : row.ca.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 grid gap-5 sm:grid-cols-2">
          {[TEXAS_ROUTE, CALIFORNIA_ROUTE].map((route) => (
            <div key={route.state} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900">Moving to {route.state}</h2>
              </div>
              <p className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500">
                {route.authority} &middot; {route.routeName}
              </p>
              <ul className="mb-4 space-y-2.5">
                {route.steps.map((s) => (
                  <li key={s} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                    <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-indigo-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <a href={route.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline">
                Read the official page
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </section>

        <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Compiled from TDLR&apos;s out-of-state and application pages and the California Board of
          Barbering and Cosmetology&apos;s licence requirements, read August 2026. Both states decide
          equivalence per applicant, so treat this as the shape of the process rather than a ruling on
          your own case — and confirm before you move.
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
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Table", about: "Texas and California barbering and cosmetology licence training hours compared", name: "Texas vs California licence hour requirements (2026)" }) }} />
    </div>
  );
}
