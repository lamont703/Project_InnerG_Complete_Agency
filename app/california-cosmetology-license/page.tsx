import Link from "next/link";
import { ExternalLink, ArrowRight, GraduationCap, Route, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES, CA_ELIGIBILITY, CA_TRAINING_HOURS } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";

/**
 * California cosmetology licence — the Tier 3 anchor.
 *
 * THREE QUERIES, ONE PAGE. "california cosmetology license" (720/mo), "beauty
 * license california" (720) and "beautician license california" (720) are the
 * same question asked three ways, and the third is a term California does not
 * use at all. Splitting them into three pages would produce two thin pages
 * about a word; the plan's instruction is that the page must CARRY the
 * colloquial language rather than only the statutory term, so both appear in
 * the prose where a reader would actually meet them.
 *
 * WHAT MAKES IT MORE THAN A FEE TABLE. Two things nobody publishes:
 *
 *   1. There are FOUR routes to the exam, not one. Every summary on the web
 *      describes the 1,000-hour school route and stops. BPC 7321 also allows
 *      out-of-state practice, a barber crossover, and an apprenticeship — and
 *      the out-of-state route converts at a fixed statutory rate of three
 *      months' work to 100 hours of training.
 *   2. The exam changed on 1 April 2026 and the change is severe on this
 *      licence: Haircutting 12% → 3%, Haircoloring 0% → 10%.
 *
 * SOURCING. Hours from BPC 7362.5, eligibility and routes from BPC 7321, fees
 * from the 2026 Sunset Review (charged amounts, not the 7423 caps), exam from
 * the board's 21 Nov 2025 letter. All via lib/ca-sources.ts and
 * lib/ca-exam-2026.ts — nothing is carried over from the Texas pages, where
 * every one of these numbers is different.
 */

const EXAM = caExam("cosmetologist");
const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Cosmetology")!.hours;
const HAIRCUTTING = EXAM.topics.find((t) => t.topic === "Haircutting")!;
const HAIRCOLORING = EXAM.topics.find((t) => t.topic === "Haircoloring")!;

const TITLE = "California Cosmetology License: Hours, Cost & How to Get It";
const DESCRIPTION =
  "What a California cosmetology licence takes: 1,000 hours, age 17, the 10th grade and $125 in board fees — plus the three routes in that aren't school.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-cosmetology-license`;

const FACTS = [
  { label: "Training hours", value: HOURS.toLocaleString(), detail: "The board's minimum for a full cosmetology course. Barbering is the same; the specialty licences are far lower." },
  { label: "Minimum age", value: `${CA_ELIGIBILITY.minimumAge}`, detail: `And the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent — not a high school diploma.` },
  { label: "Application + exam", value: `$${CA_FEES.applicationAndExam}`, detail: "One fee covering the application and your seat at the PSI written exam." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.cosmetology}`, detail: `Then $${CA_FEES.renewalIndividual} every two years to renew, with no continuing education.` },
];

const ROUTES = [
  {
    name: "A course at a board-approved school",
    detail: `${HOURS.toLocaleString()} hours. The route almost everyone takes, and the only one most guides mention. You file a Proof of Training document from the school with your application.`,
  },
  {
    name: "Practice outside California",
    detail: `Work already done elsewhere converts at a rate fixed in statute: every ${CA_ELIGIBILITY.practiceCredit.months} months of practice counts as ${CA_ELIGIBILITY.practiceCredit.hours} hours of training. That is ${CA_ELIGIBILITY.practiceCredit.hours * (12 / CA_ELIGIBILITY.practiceCredit.months)} hours a year, so roughly two and a half years of documented work reaches the ${HOURS.toLocaleString()}-hour bar without a day in a California classroom.`,
  },
  {
    name: "Crossover from a barber licence",
    detail: "If you already hold a California barber licence — or completed a barbering course — you take a cosmetology crossover course rather than the full programme. This exists in both directions and only between these two licences.",
  },
  {
    name: "An apprenticeship",
    detail: "California runs a formal apprenticeship pathway under Article 4 of the Act — paid, and open to barbering, cosmetology and electrology only. It is a real alternative to school, but not a shorter one: 3,200 on-the-job hours plus 220 in class.",
  },
];

const FAQS = [
  {
    q: "How many hours do you need for a cosmetology license in California?",
    a: `${HOURS.toLocaleString()} hours of practical training and technical instruction, set by Business and Professions Code section 7362.5. Do not carry a figure across from another state — California requires 600 hours for esthetics where Texas requires 750, and 400 for nails where Texas requires 600.`,
  },
  {
    q: "Is a “beauty license” the same as a cosmetology license in California?",
    a: "Yes in practice — California does not issue anything called a beauty license or a beautician license. Those are how people describe it; the board issues a cosmetologist licence, and it is the broadest of the six, covering hair, skin and nails. If you only want to do one of those, the narrower specialty licences take far fewer hours.",
  },
  {
    q: "How much does a California cosmetology license cost?",
    a: `$${CA_FEES.applicationAndExam} for the application and examination, then $${CA_FEES.initialLicense.cosmetology} for the licence itself once you pass — $${CA_FEES.applicationAndExam + CA_FEES.initialLicense.cosmetology} in board fees before tuition. After that it is $${CA_FEES.renewalIndividual} every two years, with no continuing education to buy.`,
  },
  {
    q: "Do you need a high school diploma?",
    a: `No. The requirement is completion of the ${CA_ELIGIBILITY.grade.default}th grade in public schools or its equivalent, plus a minimum age of ${CA_ELIGIBILITY.minimumAge}. A diploma is not required for this licence — although electrology, uniquely, does ask for the 12th grade.`,
  },
  {
    q: "Is there a practical exam?",
    a: "No. California stopped requiring a practical exam for all licence types on 1 January 2022. There is one written exam, administered by PSI: 110 questions, 100 of them scored, in two hours.",
  },
  {
    q: "Did the cosmetology exam change recently?",
    a: `Yes, on 1 April 2026. Haircutting fell from ${HAIRCUTTING.pct2020}% of the exam to ${HAIRCUTTING.pct2025}% and Haircoloring rose from ${HAIRCOLORING.pct2020}% to ${HAIRCOLORING.pct2025}%, having previously been folded inside Chemical Services. Safety and Infection Control is now 30%. Material written before 2026 describes the old proportions.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california cosmetology license",
    "beauty license california",
    "beautician license california",
    "cosmetology license california requirements",
    "how to get a cosmetology license in california",
    "california cosmetology license hours",
    "california cosmetology license cost",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaCosmetologyLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California cosmetology license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          Most people call it a beauty license or a beautician license. California doesn&apos;t issue
          either &mdash; the board issues a{" "}
          <strong className="font-bold text-slate-900">cosmetologist</strong> licence, and it is the
          broadest of the six, covering hair, skin and nails on one certificate. Here is what it
          costs, what it takes, and the three ways in that aren&apos;t cosmetology school.
        </p>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Statute, fee schedule and exam outlines read from the board's own sources, compiled" />

        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{f.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.detail}</p>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Who the board will admit to the exam
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Three conditions, and then one of four qualifying routes. The first two are lower than
            people expect: you must be at least{" "}
            <strong className="font-bold text-slate-900">{CA_ELIGIBILITY.minimumAge}</strong>, and
            you must have completed the{" "}
            <strong className="font-bold text-slate-900">
              {CA_ELIGIBILITY.grade.default}th grade
            </strong>{" "}
            in public schools or its equivalent. A high school diploma is not required. The third is
            that you must not be subject to denial under Business and Professions Code section 480,
            which is the provision covering criminal convictions.
          </p>
        </section>

        {/* The section that separates this page from every other guide. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Route className="h-5 w-5 text-indigo-600" />
            Four routes to the exam, not one
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            Nearly every guide describes the school route and stops there. The statute lists four,
            and the second one matters enormously to anyone who has already been working.
          </p>
          <ol className="space-y-4">
            {ROUTES.map((r, i) => (
              <li key={r.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Route {i + 1}
                </p>
                <h3 className="mt-1 text-base font-black text-slate-900">{r.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{r.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Wallet className="h-5 w-5 text-indigo-600" />
            What the board charges
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Fee</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-900">Amount</th>
                  <th scope="col" className="pb-2 font-black text-slate-500">When</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Application and examination</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.applicationAndExam}</td>
                  <td className="py-2 text-slate-500">Before you sit</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Initial cosmetologist licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.cosmetology}</td>
                  <td className="py-2 text-slate-500">After you pass</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Renewal</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.renewalIndividual}</td>
                  <td className="py-2 text-slate-500">Every 2 years</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Establishment licence, if you open a salon</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.establishment.initial}</td>
                  <td className="py-2 text-slate-500">Separate licence</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            ${CA_FEES.applicationAndExam + CA_FEES.initialLicense.cosmetology} in board fees to get
            licensed, and ${CA_FEES.renewalIndividual} every two years to keep it. Tuition is the
            real cost and the board has nothing to do with it &mdash; but there is no continuing
            education requirement in California, so the recurring cost genuinely is just the renewal
            fee.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">The exam, and what changed in 2026</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            One written exam, no practical &mdash; California dropped the practical for every licence
            type on 1 January 2022. PSI administers it: {EXAM.questions} questions, {EXAM.scored}{" "}
            scored, {EXAM.minutes} minutes.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            On <strong className="font-bold text-slate-900">1 April 2026</strong> the content outline
            was rebuilt. Haircutting dropped from {HAIRCUTTING.pct2020}% of the exam to{" "}
            {HAIRCUTTING.pct2025}%, Hairstyling from 6% to 2%, and Haircoloring became a topic in its
            own right at {HAIRCOLORING.pct2025}% having previously sat inside Chemical Services.
            Safety and Infection Control is now 30% &mdash; close to a third of the paper.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_cos_license_to_exam_changes"
              className="font-bold text-indigo-600 hover:underline"
            >
              The full 2020-vs-2025 tables for all five licences
            </Link>
            .
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

        <div className="mb-8 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <h2 className="text-xl font-black text-white">Apply on BreEZe</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Applications and renewals both run through BreEZe, the Department of Consumer Affairs
            system &mdash; not through barbercosmo.ca.gov, which carries the rules but not the
            transaction.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_cos_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* All six licences, ordered by hours. Cosmetology is the widest and the
            most searched, so this page is where someone comparing them lands —
            the hours column is the comparison they actually came for. */}
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-black text-slate-900">
            The other five licences, by hours
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/california-barber-license", name: "Barber", hours: "1,000 hrs", note: "Same hours, adds shaving, drops nails.", click: "ca_cos_license_to_barber" },
              { href: "/california-esthetician-license", name: "Esthetician", hours: "600 hrs", note: "Skin only — and a hard statutory limit on lasers.", click: "ca_cos_license_to_esthy" },
              { href: "/california-hairstylist-license", name: "Hairstylist", hours: "600 hrs", note: "Cut and style, no chemical services at all.", click: "ca_cos_license_to_hairstylist" },
              { href: "/california-electrologist-license", name: "Electrologist", hours: "600 hrs", note: "The only one requiring the 12th grade.", click: "ca_cos_license_to_electrologist" },
              { href: "/california-nail-technician-license", name: "Nail technician", hours: "400 hrs", note: "The shortest and cheapest route in.", click: "ca_cos_license_to_nail" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-ig-click={l.click}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-black text-slate-900 group-hover:text-indigo-700">
                    {l.name}
                  </span>
                  <span className="shrink-0 text-xs font-black tabular-nums text-slate-400">
                    {l.hours}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_cos_license_to_leaderboard"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Which school, though?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                California schools ranked by their actual state board pass rates.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-cosmetology-license-renewal"
            data-ig-click="ca_cos_license_to_renewal"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Already licensed?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Renewal: the fee, the cycle, and where the button actually is.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Training hours from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7362.5" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7362.5
          </a>
          ; eligibility and the four routes from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7321." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7321
          </a>
          . Fees are the amounts the board reports charging in its 2026 Sunset Review Report to the
          Legislature, not the statutory maximums in BPC 7423. Exam weightings from the board&apos;s
          21 November 2025 letter to approved schools. Confirm on{" "}
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
            "@id": `${SITE_URL}/california-cosmetology-license#faqpage`,
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
            "@id": `${SITE_URL}/california-cosmetology-license#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California cosmetologist license" },
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
            "@id": `${SITE_URL}/california-cosmetology-license#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Cosmetology license", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
