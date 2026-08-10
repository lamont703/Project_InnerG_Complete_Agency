import Link from "next/link";
import { ExternalLink, ArrowRight, AlertTriangle, CheckCircle2, Type } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { CA_FEES } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";

/**
 * California esthetician licence renewal.
 *
 * SMALLEST OF THE FOUR RENEWAL PAGES at 140/mo, and built anyway — the licence
 * guide terms behind it are not small ("california esthetician license" 590,
 * "aesthetician license california" 590), and a renewal page that ranks feeds
 * the guide cluster that follows in Tier 3.
 *
 * THE SPELLING IS THE HOOK, and it is not a gimmick — the keyword data shows
 * "aesthetician" and "esthetician" running level at 590/mo each. California
 * issues one of those two spellings and searching the other in BreEZe finds
 * nothing. The same class of problem as the manicurist/nail-tech split on the
 * nail page, and it deserves the same treatment: say it before they click.
 *
 * WHAT KEEPS IT OFF THE COSMETOLOGY PAGE. The renewal fee is shared, but the
 * initial licence is $40 rather than $50, the training minimum is 600 hours
 * against Texas's 750, and the 2026 exam rewrite cut Skin Care from 27% to 17%
 * on a licence that exists to do skin care. None of those are true of
 * cosmetology.
 */

const EST_EXAM = caExam("esthetician");
const SKIN_CARE = EST_EXAM.topics.find((t) => t.topic === "Skin Care")!;
const SAFETY = EST_EXAM.topics.find((t) => t.topic === "Safety and Infection Control")!;

const TITLE = "California Esthetician License Renewal: Fee & Cycle";
const DESCRIPTION =
  "Renew a California esthetician license: the $50 fee, two-year cycle, no continuing education, and why the spelling matters when you search for it on BreEZe.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-esthetician-license-renewal`;

const FACTS = [
  {
    label: "Renewal fee",
    value: `$${CA_FEES.renewalIndividual}`,
    detail: "One individual renewal fee across every licence type. Renewal does not discount for the smaller licences.",
  },
  {
    label: "Renewal cycle",
    value: "Every 2 years",
    detail: "Expires at midnight on the last day of the month it was issued in — your month, not a shared date.",
  },
  {
    label: "Late fee",
    value: `$${CA_FEES.delinquencyIndividual}`,
    detail: "Set in statute at 50% of the renewal fee, so it tracks the renewal fee automatically.",
  },
  {
    label: "Continuing education",
    value: "None",
    detail: "No CE hours in California. Texas requires 4 hours every 2 years — a real difference, not a technicality.",
  },
];

const FAQS = [
  {
    q: "How much does it cost to renew an esthetician license in California?",
    a: `$${CA_FEES.renewalIndividual}. That is the same renewal fee as cosmetology, barbering, nails and electrology — the board does not scale renewal by licence type. It is worth noting because the FIRST esthetician licence is $${CA_FEES.initialLicense.esthetician}, less than the $${CA_FEES.initialLicense.cosmetology} a cosmetologist pays, so the two only diverge at the start.`,
  },
  {
    q: "Is it esthetician or aesthetician in California?",
    a: "California licenses an “esthetician”, without the a. Both spellings are correct English and both are searched about equally often, but only one of them matches the record in BreEZe or in the board's license lookup. If a search returns nothing, try the other spelling before concluding the licence is missing.",
  },
  {
    q: "Do California estheticians need continuing education?",
    a: "No. There is no continuing education requirement for any licence the Board of Barbering & Cosmetology issues. The Act and Regulations mentions CE once, conditionally — “if applicable, prescribed by this chapter” — and the chapter prescribes none.",
  },
  {
    q: "Where do I renew my esthetician license?",
    a: "On BreEZe (breeze.ca.gov), the Department of Consumer Affairs licensing system — not on barbercosmo.ca.gov, which carries the rules but not the transaction.",
  },
  {
    q: "What happens if I let my esthetician license expire?",
    a: "It can be renewed within five years of expiry, on payment of all accrued renewal fees plus the delinquency fee. Past five years, renewal is no longer available. Restoring the licence is separate from the question of work performed while it was expired.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california esthetician license renewal",
    "aesthetician license renewal california",
    "renew esthetician license california",
    "california esthetician license renewal fee",
    "barbercosmo ca gov license renewal",
    "esthetician license renewal ca online",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaEstheticianRenewalPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California esthetician license renewal
        </h1>

        <div className="mb-6 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <p className="text-sm font-black uppercase tracking-widest text-indigo-300">Renew here</p>
          <h2 className="mt-2 text-xl font-black text-white">
            Renewal is on BreEZe &mdash; not on barbercosmo.ca.gov
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The board publishes the rules; the Department of Consumer Affairs runs the transaction.
            If you have been looking for a renewal button on the board&apos;s site, that is why there
            isn&apos;t one.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_esthy_renewal_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Fees and rules read from the board's own sources, compiled" />

        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{f.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.detail}</p>
            </div>
          ))}
        </div>

        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-indigo-950">
            <Type className="h-5 w-5" />
            Esthetician, not aesthetician &mdash; when you are searching
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950/90">
            Both spellings are correct English and Californians search them about equally often. The
            board only uses one:{" "}
            <strong className="font-bold">esthetician</strong>, no leading a. The Act, the fee
            schedule, the licence record and BreEZe all agree on that spelling, and the licence
            lookup will not quietly correct you.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
            It matters exactly once &mdash; when a search comes back empty and the natural
            conclusion is that something has gone wrong with the record. Try the other spelling
            first.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            No continuing education to renew
          </h2>
          <p className="text-sm leading-relaxed text-emerald-900/90">
            California requires none. If you trained or previously held a licence in Texas, that
            state is different &mdash; 4 hours every two years, including sanitation and human
            trafficking awareness. The two states also differ on training: California requires 600
            hours for the esthetician licence where Texas requires 750, which is why hours do not
            transfer on assumption.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">
            The 2026 exam cut skin care almost in half
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Renewal does not require re-examination, so this changes nothing about your own licence.
            It is here for anyone who teaches, hires or mentors candidates: on{" "}
            <strong className="font-bold text-slate-900">1 April 2026</strong> PSI&apos;s new content
            outlines took effect, and on the esthetician exam the largest single subject shrank.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-black text-slate-900">Topic</th>
                  <th className="pb-2 pr-4 text-right font-black text-slate-500">2020</th>
                  <th className="pb-2 text-right font-black text-slate-900">2025</th>
                </tr>
              </thead>
              <tbody>
                {EST_EXAM.topics.map((t) => {
                  const delta = t.pct2025 - t.pct2020;
                  return (
                    <tr key={t.topic} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-700">{t.topic}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-400">{t.pct2020}%</td>
                      <td
                        className={`py-2 text-right font-bold tabular-nums ${
                          delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-700"
                        }`}
                      >
                        {t.pct2025}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Skin Care fell from {SKIN_CARE.pct2020}% to {SKIN_CARE.pct2025}% while Safety and
            Infection Control rose to {SAFETY.pct2025}% &mdash; two of every five questions. Eyelash
            and Eyebrow appears for the first time at 6%, having had no weighting at all in the 2020
            outline. The exam is {EST_EXAM.questions} questions ({EST_EXAM.scored} scored) in{" "}
            {EST_EXAM.minutes} minutes, written only.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            If it has already expired
          </h2>
          <p className="text-sm leading-relaxed text-amber-900/90">
            An expired licence can still be renewed for up to{" "}
            <strong className="font-bold">five years</strong> after expiry, on payment of every
            accrued renewal fee plus the ${CA_FEES.delinquencyIndividual} delinquency fee. Past five
            years, renewal is no longer available.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black text-slate-900">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{f.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-license-renewal"
            data-ig-click="ca_esthy_renewal_to_cos"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Cosmetology renewal
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                If you hold the full cosmetology licence rather than the esthetician one.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_esthy_renewal_to_leaderboard"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                California school pass rates
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                State board results by school, from the Board of Barbering &amp; Cosmetology.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Fees are the amounts the board reports charging in its 2026 Sunset Review Report to the
          Legislature (Tables 3&ndash;4, data as of 17 November 2025), not the statutory maximums in{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7423."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            BPC 7423
          </a>
          . Training hours from{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7364."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            BPC 7364
          </a>
          , and exam weightings from the board&apos;s 21 November 2025 letter to approved schools.
          Confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on a figure here.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California esthetician license renewal" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Esthetician license renewal", item: PAGE },
            ],
          }),
        }}
      />
    </div>
  );
}
