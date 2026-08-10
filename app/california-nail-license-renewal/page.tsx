import Link from "next/link";
import { ExternalLink, ArrowRight, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";

/**
 * California nail / manicurist licence renewal.
 *
 * VOLUME. "california nail license renewal" is 720/mo — level with the
 * cosmetology renewal term and ahead of every barber phrasing. It is the
 * second-largest single query in the California set, which is not what the
 * shape of the industry would lead you to guess.
 *
 * THE NAMING PROBLEM IS THE PAGE. Nobody searching this calls it a manicurist
 * licence, and the board does. The Act and the fee schedule issue a
 * "manicurist" licence; PSI's exam paperwork says "Nail Technician /
 * Manicurist"; every real person says nail tech. Somebody who reaches BreEZe
 * looking for the word "nail" and finds "Manicurist" concludes they are in the
 * wrong place — after we sent them there. Saying so before they click is worth
 * more than any fee table on the page.
 *
 * WHY IT IS NOT A DUPLICATE OF THE COSMETOLOGY PAGE. Renewal is $50 for every
 * licence type, so the headline number is shared. What is not shared: the
 * initial licence is $35, the lowest the board charges, and the April 2026
 * exam rewrite hit this licence harder than any other — Nail Care fell from
 * 49% to 22%. Those two facts are specific to nails.
 */

const NAIL_EXAM = caExam("nail-technician");
const NAIL_CARE = NAIL_EXAM.topics.find((t) => t.topic === "Nail Care")!;
const NAIL_SAFETY = NAIL_EXAM.topics.find((t) => t.topic === "Safety and Infection Control")!;

const TITLE = "California Nail Technician License Renewal: Fee & Cycle";
const DESCRIPTION =
  "Renew a California nail technician license: the $50 fee, two-year cycle, no continuing education, and why BreEZe files it as a manicurist license.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-nail-license-renewal`;

const FACTS = [
  {
    label: "Renewal fee",
    value: `$${CA_FEES.renewalIndividual}`,
    detail: "The board charges one individual renewal fee across every licence type, nails included.",
  },
  {
    label: "Renewal cycle",
    value: "Every 2 years",
    detail: "Expires at midnight on the last day of the month it was issued in — not a fixed calendar date.",
  },
  {
    label: "Late fee",
    value: `$${CA_FEES.delinquencyIndividual}`,
    detail: "Statute sets the delinquency fee at 50% of the renewal fee, so the two move together.",
  },
  {
    label: "Continuing education",
    value: "None",
    detail: "No CE hours to renew in California. Texas requires 4 hours every 2 years — the states differ.",
  },
];

const FAQS = [
  {
    q: "How much is it to renew a nail technician license in California?",
    a: `$${CA_FEES.renewalIndividual}, the same as every other individual licence the Board of Barbering & Cosmetology issues. Renew after the expiry date and there is an additional $${CA_FEES.delinquencyIndividual} delinquency fee. Note that the FIRST licence is cheaper than the others at $${CA_FEES.initialLicense.manicurist} — renewal is where the price becomes the same for everyone.`,
  },
  {
    q: "Why can't I find my nail license on BreEZe?",
    a: "Because California does not call it a nail license. The Barbering and Cosmetology Act and the board's fee schedule both issue a “manicurist” license, and that is the wording BreEZe uses. PSI's exam paperwork splits the difference with “Nail Technician / Manicurist”. Look for manicurist and you will find it.",
  },
  {
    q: "Do nail techs need continuing education in California?",
    a: "No. California requires no continuing education for any barbering or cosmetology licence. The Act mentions CE once, conditionally — “if applicable, prescribed by this chapter” — and the chapter prescribes none.",
  },
  {
    q: "Does my license expire on a set date each year?",
    a: "No. It runs two years from issue and expires at midnight on the last day of the month it was issued in. Two people licensed in the same year can have different renewal months, so read the licence rather than assuming a shared deadline.",
  },
  {
    q: "My nail license expired years ago — is it gone?",
    a: "Not necessarily. An expired licence can be renewed within five years of expiry, on payment of all accrued renewal fees plus the delinquency fee. Past five years it can no longer be renewed and a different route back applies.",
  },
  {
    q: "The exam changed in 2026 — does that affect renewal?",
    a: `No. The new PSI content outlines that took effect on 1 April 2026 apply to candidates sitting the exam, not to renewing licensees — there is no re-examination requirement in California. It matters only if someone in your salon is still studying: the nail exam changed more than any other, with Nail Care dropping from ${NAIL_CARE.pct2020}% to ${NAIL_CARE.pct2025}% and Safety and Infection Control rising from ${NAIL_SAFETY.pct2020}% to ${NAIL_SAFETY.pct2025}%.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california nail license renewal",
    "nail technician license renewal california",
    "manicurist license renewal california",
    "renew nail license ca online",
    "california manicurist license renewal fee",
    "barbercosmo ca gov license renewal",
    "nail tech license california renewal",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaNailRenewalPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California nail technician license renewal
        </h1>

        <div className="mb-6 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <p className="text-sm font-black uppercase tracking-widest text-indigo-300">Renew here</p>
          <h2 className="mt-2 text-xl font-black text-white">
            Renewal is on BreEZe &mdash; look for &ldquo;Manicurist&rdquo;
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Two things trip people up at once. Renewal is not on barbercosmo.ca.gov &mdash; it is on
            BreEZe, the Department of Consumer Affairs system. And once you are there, the licence is
            not filed under &ldquo;nail&rdquo;.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_nail_renewal_breeze"
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

        {/* The naming problem, in full. */}
        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-indigo-950">
            <Search className="h-5 w-5" />
            California licenses a &ldquo;manicurist&rdquo;, not a nail tech
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950/90">
            Three names are in circulation for one licence, and only one of them is the one you have
            to type:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-indigo-950/90">
            <li>
              <strong className="font-bold">Manicurist</strong> &mdash; the legal name. It is what
              the Barbering and Cosmetology Act calls the licence and what the board&apos;s fee
              schedule bills for. This is the term BreEZe uses.
            </li>
            <li>
              <strong className="font-bold">Nail Technician / Manicurist</strong> &mdash; what PSI
              calls it on the exam paperwork.
            </li>
            <li>
              <strong className="font-bold">Nail tech</strong> &mdash; what everyone actually says,
              and what nobody at the board wrote down.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
            It is a naming difference and nothing more &mdash; there is one licence, not three. But
            it is the reason a renewal that should take four minutes turns into a conviction that
            the record is missing.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            No continuing education to renew
          </h2>
          <p className="text-sm leading-relaxed text-emerald-900/90">
            California requires none. The Act and Regulations mentions continuing education exactly
            once, and only conditionally &mdash; &ldquo;if applicable, prescribed by this
            chapter&rdquo; &mdash; and the chapter prescribes none. A Texas nail licence is
            different: 4 hours every two years.
          </p>
        </section>

        {/* Genuinely nail-specific, and the strongest reason to keep reading. */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">
            The nail exam changed more than any other in 2026
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            This does not affect your renewal &mdash; California has no re-examination requirement,
            and a renewing licensee never sits it again. It is here because if you train, hire or
            mentor anyone still working toward the licence, the ground moved under them on{" "}
            <strong className="font-bold text-slate-900">1 April 2026</strong>, and the nail exam
            moved furthest.
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
                {NAIL_EXAM.topics.map((t) => {
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
            Half the exam is now infection control, and nail care &mdash; the subject the licence is
            named after &mdash; is under a quarter of it. Anyone revising from pre-2026 material is
            revising the old proportions. The exam is {NAIL_EXAM.questions} questions (
            {NAIL_EXAM.scored} scored) in {NAIL_EXAM.minutes} minutes, written only; California
            dropped the practical entirely on 1 January 2022.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_nail_renewal_to_exam_changes"
              className="font-bold text-indigo-600 hover:underline"
            >
              All five licences, 2020 against 2025
            </Link>
            .
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
            data-ig-click="ca_nail_renewal_to_cos"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Cosmetology renewal
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                If you hold the full cosmetology licence rather than the manicurist one.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_nail_renewal_to_leaderboard"
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
          . Exam weightings are from the board&apos;s 21 November 2025 letter to approved schools on
          the PSI examination update. Cycle and expiry from{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7415."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            BPC 7415
          </a>
          . Confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on a figure here.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-nail-license-renewal#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "Article",
            "@id": `${SITE_URL}/california-nail-license-renewal#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California manicurist license renewal" },
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/california-nail-license-renewal#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Nail technician license renewal", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
