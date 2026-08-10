import Link from "next/link";
import { ExternalLink, ArrowRight, AlertTriangle, CheckCircle2, Store } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES } from "@/lib/ca-sources";

/**
 * California barber licence renewal.
 *
 * WHY IT IS A SEPARATE PAGE FROM COSMETOLOGY. One board licenses both, and the
 * renewal fee, cycle and CE rule are identical — so this could have been a
 * section on the cosmetology page. It is not, for two reasons.
 *
 * First, the searches are separate. "board of barbering and cosmetology
 * california license renewal" is 390/mo, and a barber typing that does not
 * want to land on a page titled cosmetology and have to satisfy themselves it
 * also covers them.
 *
 * Second, and this is what keeps the page from being a duplicate: barbers own
 * shops at a much higher rate than the other licence types, and the
 * ESTABLISHMENT licence is a separate licence with its own renewal, its own
 * fee and its own delinquency fee. Miss it and the shop is unlicensed while
 * the barber is fine. That section is the reason this page earns its URL, and
 * it is also the only place in the whole California fee schedule where the
 * board charges under its statutory cap.
 *
 * SOURCING. Fees from CA_FEES — the amounts the board reports charging in its
 * 2026 Sunset Review Report, not the BPC 7423 caps. See lib/ca-sources.ts.
 */

const TITLE = "California Barber License Renewal: Fee, Cycle & BreEZe";
const DESCRIPTION =
  "Renew a California barber license: the $50 fee, two-year cycle, no continuing education, and the separate barbershop establishment renewal most people miss.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-barber-license-renewal`;

const FACTS = [
  {
    label: "Barber licence renewal",
    value: `$${CA_FEES.renewalIndividual}`,
    detail: "Identical to cosmetology, esthetics, nails and electrology — the board charges one individual renewal fee.",
  },
  {
    label: "Renewal cycle",
    value: "Every 2 years",
    detail: "Expires at midnight on the last day of the month it was issued in, so your deadline is personal to you.",
  },
  {
    label: "Barbershop renewal",
    value: `$${CA_FEES.establishment.renewal}`,
    detail: "A separate licence with its own renewal. Yours being current does not keep the shop current.",
  },
  {
    label: "Continuing education",
    value: "None",
    detail: "California requires no CE. Texas requires 4 hours every 2 years — do not assume the states match.",
  },
];

const FAQS = [
  {
    q: "How much is it to renew a barber license in California?",
    a: `$${CA_FEES.renewalIndividual} for the barber licence itself. If you also hold a barbershop establishment licence, that is a separate $${CA_FEES.establishment.renewal} renewal. Renew either one late and a delinquency fee applies — $${CA_FEES.delinquencyIndividual} on the barber licence, $${CA_FEES.establishment.delinquency} on the establishment.`,
  },
  {
    q: "Does renewing my barber license also renew my barbershop?",
    a: "No, and this is the mistake worth avoiding. The establishment licence is issued to the shop, not to you, and it renews separately on its own date. A barber can be perfectly current while the shop they own has lapsed — the board treats operating an establishment on an expired licence as its own violation.",
  },
  {
    q: "Do California barbers need continuing education?",
    a: "No. There is no continuing education requirement for any barbering or cosmetology licence in California. The Act and Regulations mentions CE once and conditionally — “if applicable, prescribed by this chapter” — and the chapter prescribes none.",
  },
  {
    q: "Where do I renew — barbercosmo.ca.gov?",
    a: "No. The Board of Barbering & Cosmetology publishes the rules at barbercosmo.ca.gov, but the renewal transaction happens on BreEZe (breeze.ca.gov), the Department of Consumer Affairs licensing system. Searching the board's site for a renewal button is why so many people end up typing the board's URL into Google.",
  },
  {
    q: "My barber license expired. Can I still renew it?",
    a: "Yes, within five years of expiry, on payment of all accrued renewal fees plus the delinquency fee. Beyond five years the licence can no longer be renewed. Renewing late fixes the licence — it does not retroactively authorise work done while it was expired.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california barber license renewal",
    "renew barber license california",
    "board of barbering and cosmetology california license renewal",
    "ca board of barbering and cosmetology license renewal",
    "barbercosmo ca gov license renewal",
    "california barbershop license renewal",
    "barber license renewal fee california",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaBarberRenewalPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California barber license renewal
        </h1>

        {/* Navigational intent: lead with the button, not an introduction. */}
        <div className="mb-6 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <p className="text-sm font-black uppercase tracking-widest text-indigo-300">Renew here</p>
          <h2 className="mt-2 text-xl font-black text-white">
            Renewal is on BreEZe &mdash; not on barbercosmo.ca.gov
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The board writes the rules; the Department of Consumer Affairs runs the transaction.
            That split is why the renewal button is not where most people look for it.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_barber_renewal_breeze"
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

        {/* The section that makes this page worth having. */}
        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-indigo-950">
            <Store className="h-5 w-5" />
            If you own the shop, that is a second licence
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950/90">
            The establishment licence belongs to the barbershop, not to the barber, and it renews on
            its own schedule for{" "}
            <strong className="font-bold">${CA_FEES.establishment.renewal}</strong> &mdash; with a{" "}
            <strong className="font-bold">${CA_FEES.establishment.delinquency}</strong> delinquency
            fee if it lapses. Renewing your own licence does nothing for it. The two dates drift
            apart because they were issued at different times, and the shop is the one nobody gets a
            reminder about.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
            One detail worth knowing if you are budgeting: the initial establishment licence is{" "}
            <strong className="font-bold">${CA_FEES.establishment.initial}</strong>, while the
            statute permits up to{" "}
            <strong className="font-bold">${CA_FEES.establishment.statutoryCap}</strong>. It is the
            only fee in California&apos;s entire barbering and cosmetology schedule charged below its
            legal ceiling, which means it is also the one most able to rise without a change in the
            law.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            No continuing education to renew
          </h2>
          <p className="text-sm leading-relaxed text-emerald-900/90">
            California requires none &mdash; not for barbers, not for any licence type the board
            issues. This is a genuine difference rather than a technicality: a barber licensed in
            Texas owes 4 hours every two years, including sanitation and human trafficking
            awareness. Anyone holding both licences is on two different sets of rules.
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
            years, renewal is no longer available. Note that this is the licence being restored, not
            the intervening period being excused &mdash; work performed on an expired licence is a
            separate matter from the fee.
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
            data-ig-click="ca_barber_renewal_to_cos"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Cosmetology renewal
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Same board, same fee, same cycle &mdash; the cosmetology version of this page.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-barber-exam-intelligence-prep"
            data-ig-click="ca_barber_renewal_to_exam_prep"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Not licensed yet?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                The barber written exam changed on 1 April 2026 &mdash; new topic weightings.
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
          . Cycle and expiry from{" "}
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
            "@id": `${SITE_URL}/california-barber-license-renewal#faqpage`,
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
            "@id": `${SITE_URL}/california-barber-license-renewal#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California barber license renewal" },
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
            "@id": `${SITE_URL}/california-barber-license-renewal#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Barber license renewal", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
