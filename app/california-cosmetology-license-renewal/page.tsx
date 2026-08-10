import Link from "next/link";
import { ExternalLink, ArrowRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES } from "@/lib/ca-sources";

/**
 * California cosmetology licence renewal.
 *
 * WHY THIS PAGE FIRST. It is the largest keyword cluster in California by an
 * order of magnitude — roughly 4,000/mo across the renewal phrasings, against
 * 70/mo for "california cosmetology license requirements". The Texas set leads
 * with requirements guides; copying that ordering here would have led with the
 * smallest term.
 *
 * THE INTENT IS NAVIGATIONAL, NOT EDUCATIONAL. Look at what people type:
 * "www barbercosmo ca gov license renewal" (880/mo), "barbercosmo ca gov
 * license renewal" (480), "renew cosmetology license ca online" (590). They
 * are typing the board's URL into Google because they cannot find the renewal
 * button. So the first thing on this page is the button, not an introduction.
 * An essay in front of that is how a page like this loses.
 *
 * AND RENEWAL IS NOT ON THE BOARD'S SITE. It is on BreEZe, the Department of
 * Consumer Affairs system. That single fact is most of the value here.
 *
 * SOURCING. Every figure traces to lib/ca-sources.ts. The fees are the ACTUAL
 * amounts from the 2026 Sunset Review Tables 3-4, not the BPC 7423 statutory
 * caps — the two are equal for renewal, but they are not for the establishment
 * licence ($50 charged against an $80 cap), which is why the distinction is
 * kept. Nothing here is carried over from Texas: California has no continuing
 * education requirement and Texas has four hours every two years.
 */

const TITLE = "California Cosmetology License Renewal: Fee, Cycle & BreEZe";
const DESCRIPTION =
  "Renew a California cosmetology license: the $50 fee, two-year cycle, $25 late fee, and why renewal happens on BreEZe and not on the board's own site.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-cosmetology-license-renewal`;

const FACTS = [
  {
    label: "Renewal fee",
    value: `$${CA_FEES.renewalIndividual}`,
    detail: "The same for every individual licence type — cosmetologist, barber, esthetician, manicurist, electrologist.",
  },
  {
    label: "Renewal cycle",
    value: "Every 2 years",
    detail:
      "Licences expire at midnight on the last day of the month they were issued in — not on a fixed calendar date, so your month is personal to you.",
  },
  {
    label: "Late (delinquency) fee",
    value: `$${CA_FEES.delinquencyIndividual}`,
    detail: "Defined in statute as 50% of the renewal fee, so it moves if the renewal fee ever does.",
  },
  {
    label: "Continuing education",
    value: "None",
    detail: "California requires no CE to renew. If you also hold a Texas licence, that one needs 4 hours every 2 years.",
  },
];

const FAQS = [
  {
    q: "How much does it cost to renew a cosmetology license in California?",
    a: `$${CA_FEES.renewalIndividual}. It is the same $${CA_FEES.renewalIndividual} for barber, esthetician, manicurist and electrologist licences. If you renew after expiry you also pay a $${CA_FEES.delinquencyIndividual} delinquency fee, which the Business and Professions Code sets at 50% of the renewal fee.`,
  },
  {
    q: "Do I need continuing education to renew in California?",
    a: "No. California has no continuing education requirement for barbering and cosmetology licences. The Act and Regulations mention CE once, conditionally — “if applicable, prescribed by this chapter” — and the chapter prescribes none. This is a real difference from Texas, which requires 4 hours every two years.",
  },
  {
    q: "When does my California cosmetology license expire?",
    a: "Two years from issue, at midnight on the last day of the month it was issued in. Two people licensed in the same year can have different renewal months, so check your own licence rather than assuming a common date.",
  },
  {
    q: "Where do I actually renew?",
    a: "On BreEZe (breeze.ca.gov), the Department of Consumer Affairs licensing system — not on barbercosmo.ca.gov. The board's own site is where the rules live; BreEZe is where the transaction happens. That split is why so many people search for the board's URL and still cannot find the renewal button.",
  },
  {
    q: "What if my license has already expired?",
    a: "An expired licence can be renewed within five years of expiry, on payment of all accrued renewal fees plus the delinquency fee. Past five years it can no longer be renewed and a different route applies.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california cosmetology license renewal",
    "renew cosmetology license ca online",
    "barbercosmo ca gov license renewal",
    "board of barbering and cosmetology california license renewal",
    "california cosmetology license renewal online",
    "california beauty license renewal",
    "california cosmetology renewal fee",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE,
    type: "article",
  },
  alternates: { canonical: PAGE },
};

export default function CaliforniaCosmetologyRenewalPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California cosmetology license renewal
        </h1>

        {/* The action first. People arriving here typed the board's URL into
            Google and could not find the button; an introduction in front of it
            would repeat the problem that sent them. */}
        <div className="mb-6 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <p className="text-sm font-black uppercase tracking-widest text-indigo-300">Renew here</p>
          <h2 className="mt-2 text-xl font-black text-white">
            Renewal is on BreEZe &mdash; not on barbercosmo.ca.gov
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The board publishes the rules; the Department of Consumer Affairs runs the transaction.
            If you have been searching the board&apos;s site for a renewal button, that is why you
            could not find one.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_renewal_breeze"
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

        <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            No continuing education to renew
          </h2>
          <p className="text-sm leading-relaxed text-emerald-900/90">
            California requires none. The complete Act and Regulations mentions continuing education
            exactly once, and only conditionally &mdash; &ldquo;if applicable, prescribed by this
            chapter&rdquo; &mdash; and the chapter prescribes none. If you hold a licence in Texas as
            well, note that one is different: 4 hours every two years, including sanitation and human
            trafficking awareness.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Clock className="h-5 w-5 text-indigo-600" />
            Your expiry date is personal to you
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Licences are issued for a two-year period and expire{" "}
            <strong className="font-bold text-slate-900">
              at midnight on the last day of the month of issuance
            </strong>
            . There is no common renewal date, so two people licensed the same year can have
            different deadlines. Check the licence itself rather than assuming.
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
            years, renewal is no longer available and a different route applies. Practising on an
            expired licence is a separate problem from the fee.
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

        {/* The other three renewal pages. Same fee and cycle on all four — what
            differs is the establishment licence for shop owners, the
            manicurist naming trap, and the esthetician spelling. Sending
            someone to the right one is the point of listing them. */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">
            Renewing a different licence?
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                href: "/california-barber-license-renewal",
                name: "Barber",
                note: "Plus the separate barbershop establishment renewal.",
                click: "ca_cos_renewal_to_barber",
              },
              {
                href: "/california-nail-license-renewal",
                name: "Nail technician",
                note: "BreEZe files it under “manicurist”, not “nail”.",
                click: "ca_cos_renewal_to_nail",
              },
              {
                href: "/california-esthetician-license-renewal",
                name: "Esthetician",
                note: "One spelling works in the licence lookup; the other doesn’t.",
                click: "ca_cos_renewal_to_esthetician",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-ig-click={l.click}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                  {l.name}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-exam-intelligence-prep"
            data-ig-click="ca_renewal_to_exam_prep"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Not licensed yet?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                California&apos;s written exam changed on 1 April 2026 &mdash; new topic weightings.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_renewal_to_leaderboard"
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
          . The two happen to match for renewal. Cycle and expiry from{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7415."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            BPC 7415
          </a>
          . Fees and rules change &mdash; confirm on{" "}
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
            "@id": `${SITE_URL}/california-cosmetology-license-renewal#faqpage`,
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
            "@id": `${SITE_URL}/california-cosmetology-license-renewal#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California cosmetology license renewal" },
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
            "@id": `${SITE_URL}/california-cosmetology-license-renewal#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Cosmetology license renewal", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
