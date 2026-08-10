import Link from "next/link";
import { ExternalLink, ArrowRight, Ban, Wallet, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES, CA_ELIGIBILITY, CA_TRAINING_HOURS } from "@/lib/ca-sources";

/**
 * California hairstylist licence — a licence with no Texas equivalent.
 *
 * WHY BUILD A PAGE WITH NO KEYWORD DATA. There is no volume for
 * "california hairstylist license" in the research, and that is the point:
 * this licence is barely known to exist. It sits between the 1,000-hour
 * cosmetology licence and nothing, at 600 hours, and anyone who only ever
 * intends to cut and style is currently doing 400 hours they may not need.
 * Zero competition, real utility, and nothing to copy from the Texas pages
 * because Texas does not issue it.
 *
 * THE DEFINING CONSTRAINT IS CHEMICAL WORK, and BPC 7316(h) is precise about
 * it: hairstyling includes "nonchemically straightening the hair" and lists no
 * colouring, no permanent waving, no relaxing. Compare 7316(b)(1), which gives
 * cosmetology "waving, machineless permanent waving, permanent waving...
 * bleaching, tinting, coloring, straightening, dyeing". That is the entire
 * trade-off: 400 fewer hours, no chemical services.
 *
 * TWO HONEST GAPS, both stated on the page rather than papered over:
 *
 *   1. The board's own 2026 Sunset Review fee table lists the hairstylist EXAM
 *      FEE as "None" where every other licence pays $75. That is what the
 *      document says. Why is not explained in it, and this page does not
 *      guess.
 *   2. The hairstylist exam is absent from PSI's 1 April 2026 content-outline
 *      rewrite, which covers the other five. So there is no published
 *      weighting for it — hence no exam table here, where every sibling page
 *      has one.
 */

const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Hairstylist")!.hours;
const COS_HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Cosmetology")!.hours;

const TITLE = "California Hairstylist License: The 600-Hour Alternative";
const DESCRIPTION =
  "California issues a hairstylist licence at 600 hours — 400 fewer than cosmetology. What it covers, what it doesn't, and why the board lists no exam fee for it.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-hairstylist-license`;

const FACTS = [
  { label: "Training hours", value: `${HOURS}`, detail: `${COS_HOURS - HOURS} fewer than the ${COS_HOURS.toLocaleString()}-hour cosmetology programme — the whole reason the licence exists.` },
  { label: "Minimum age", value: `${CA_ELIGIBILITY.minimumAge}`, detail: `Plus the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent, same as cosmetology.` },
  { label: "Exam fee", value: "None", detail: "The board's own fee table lists no examination fee for this licence, where every other type pays $75." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.hairstylist}`, detail: `Same as cosmetology and barbering. Renewal is $${CA_FEES.renewalIndividual} every two years.` },
];

const INCLUDED = [
  "Styling all textures of hair by standard methods current at the time",
  "Arranging, blow drying, cleansing, curling, cutting, dressing, extending, shampooing and waving",
  "Nonchemically straightening the hair, using electrical and nonelectrical devices",
];

const EXCLUDED = [
  "Haircolouring, tinting, bleaching and dyeing",
  "Permanent waving and machineless permanent waving",
  "Chemical relaxing and chemical straightening",
  "Skin care, nail care and hair removal",
];

const FAQS = [
  {
    q: "What is a hairstylist license in California?",
    a: `A licence covering hair styling and cutting at ${HOURS} training hours instead of the ${COS_HOURS.toLocaleString()} a cosmetology licence takes. It is defined in Business and Professions Code section 7316(h) and is specific to California — most states, including Texas, do not issue anything equivalent.`,
  },
  {
    q: "Can a California hairstylist do color?",
    a: "No. Section 7316(h) describes hairstyling as styling, arranging, blow drying, cleansing, curling, cutting, dressing, extending, shampooing, waving and NONCHEMICALLY straightening the hair. Colouring, bleaching, tinting, dyeing, permanent waving and chemical relaxing all appear in the cosmetology definition and not in the hairstyling one. That restriction is the trade for the shorter programme.",
  },
  {
    q: "Is the hairstylist license worth it instead of cosmetology?",
    a: `It depends entirely on chemical services. If you intend to colour or perm, it is not — you would need the full ${COS_HOURS.toLocaleString()}-hour cosmetology programme, and there is no crossover course from hairstyling to top up. If you genuinely only cut and style, it saves ${COS_HOURS - HOURS} hours of tuition and time.`,
  },
  {
    q: "How much does a California hairstylist license cost?",
    a: `The board's 2026 Sunset Review fee table lists the initial licence at $${CA_FEES.initialLicense.hairstylist} and the examination fee as “None” — where barbering, cosmetology, esthetics, nails and electrology each pay $${CA_FEES.applicationAndExam} for application and examination. The report states the amounts without explaining the difference, so confirm the current position with the board before budgeting on it.`,
  },
  {
    q: "How do I qualify for the hairstylist exam?",
    a: `Be at least ${CA_ELIGIBILITY.minimumAge}, have completed the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent, and not be subject to denial under section 480. Then either complete a ${HOURS}-hour hairstyling course at a board-approved school, or qualify on practice outside California — credited at ${CA_ELIGIBILITY.practiceCredit.months} months of work to ${CA_ELIGIBILITY.practiceCredit.hours} hours of training. Section 7322 lists only those two routes; there is no apprenticeship pathway for this licence.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california hairstylist license",
    "hairstylist license california requirements",
    "california hairstylist vs cosmetology license",
    "600 hour hairstylist license california",
    "how to become a hairstylist in california",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaHairstylistLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California hairstylist license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          California issues a licence most people in the industry have never heard of: hairstylist,
          at <strong className="font-bold text-slate-900">{HOURS} hours</strong> against
          cosmetology&apos;s {COS_HOURS.toLocaleString()}. Texas has no equivalent and neither do
          most states. If you only ever intend to cut and style, you may be signing up for{" "}
          {COS_HOURS - HOURS} hours you do not need &mdash; and if you intend to colour, this
          licence is the wrong one and cannot be topped up.
        </p>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Statute and the board's fee schedule read from the board's own sources, compiled" />

        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{f.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.detail}</p>
            </div>
          ))}
        </div>

        {/* The whole decision, in one comparison. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Ban className="h-5 w-5 text-rose-600" />
            The trade is chemical services
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            Section 7316(h) defines hairstyling, and the word doing the work is{" "}
            <em>nonchemically</em>. Everything a cosmetologist may do with a chemical is absent from
            the definition.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-emerald-800">
                In scope
              </h3>
              <ul className="space-y-2 text-sm leading-relaxed text-emerald-950/90">
                {INCLUDED.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-rose-800">
                Not in scope
              </h3>
              <ul className="space-y-2 text-sm leading-relaxed text-rose-950/90">
                {EXCLUDED.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            There is no crossover course from hairstyling into cosmetology &mdash; that route runs
            between barbering and cosmetology only. Deciding two years in that you want to colour
            means starting the {COS_HOURS.toLocaleString()}-hour programme, not adding to the{" "}
            {HOURS}. That makes this a decision to get right at enrolment, which is exactly when
            nobody explains the licence exists.
          </p>
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
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-900">Hairstylist</th>
                  <th scope="col" className="pb-2 text-right font-black text-slate-500">Every other licence</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Application and examination</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">None</td>
                  <td className="py-2 text-right tabular-nums text-slate-500">${CA_FEES.applicationAndExam}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Initial licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.hairstylist}</td>
                  <td className="py-2 text-right tabular-nums text-slate-500">${CA_FEES.initialLicense.manicurist}&ndash;${CA_FEES.initialLicense.cosmetology}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Renewal</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.renewalIndividual}</td>
                  <td className="py-2 text-right tabular-nums text-slate-500">${CA_FEES.renewalIndividual}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Say what isn't known. */}
        <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-amber-900">
            <HelpCircle className="h-5 w-5" />
            Two things we could not establish
          </h2>
          <p className="text-sm leading-relaxed text-amber-900/90">
            <strong className="font-bold">The exam fee.</strong> The board&apos;s 2026 Sunset Review
            Report to the Legislature prints the hairstylist examination fee as &ldquo;None&rdquo;
            beside ${CA_FEES.applicationAndExam} for every other licence type. That is what the
            document says; it does not say why, and we are not going to guess at a reason. Confirm
            with the board before treating it as free.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
            <strong className="font-bold">What is on the exam.</strong> PSI rebuilt the content
            outlines for barbering, cosmetology, esthetics, nails and electrology effective 1 April
            2026. Hairstyling is not among them, so there is no published topic weighting for it
            &mdash; which is why this page has no exam table where its sibling pages do.
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
            Applications run through BreEZe, the Department of Consumer Affairs system. The board
            publishes a separate hairstylist application and its own candidate bulletin.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_hairstylist_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-license"
            data-ig-click="ca_hairstylist_to_cos_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The cosmetology licence
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {COS_HOURS.toLocaleString()} hours, and the one that includes chemical services.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-barber-license"
            data-ig-click="ca_hairstylist_to_barber_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The barber licence
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {COS_HOURS.toLocaleString()} hours, chemical services included, plus shaving.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Training hours from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7363." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7363
          </a>
          ; eligibility from BPC 7322; scope from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7316(h)
          </a>
          . Fees from the board&apos;s 2026 Sunset Review Report to the Legislature, Tables 3&ndash;4.
          Confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on a figure here &mdash; particularly the exam fee.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-hairstylist-license#faqpage`,
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
            "@id": `${SITE_URL}/california-hairstylist-license#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California hairstylist license" },
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
            "@id": `${SITE_URL}/california-hairstylist-license#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Hairstylist license", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
