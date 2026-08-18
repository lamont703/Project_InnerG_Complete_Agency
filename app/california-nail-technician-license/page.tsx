import Link from "next/link";
import { ExternalLink, ArrowRight, GraduationCap, Hand, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES, CA_ELIGIBILITY, CA_TRAINING_HOURS } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";
import { AgentInvite } from "@/components/journey/agent-invite";
import { questionsForSlug } from "@/lib/agent-invite-questions";

/**
 * California nail technician / manicurist licence.
 *
 * THE CHEAPEST AND SHORTEST ROUTE INTO THE INDUSTRY, and that is the honest
 * frame for the page: 400 hours against cosmetology's 1,000, and a $35 initial
 * licence against $50. It is the lowest bar the board sets, by both measures.
 *
 * TWO THINGS TO GET RIGHT. The naming — California issues a "manicurist"
 * licence and nobody calls it that (see the renewal page, where the same trap
 * costs people a BreEZe search). And the hours: California is 400, Texas is
 * 600. Of the two figures most likely to be wrongly carried between the
 * states, this is the larger error in proportional terms — a third of the
 * programme.
 *
 * THE SCOPE HAS A LITERAL BOUNDARY, which is unusually concrete for a scope
 * definition: elbow to fingertips, knee to toes (BPC 7316(d)). Worth
 * publishing plainly because it is the kind of line people guess at.
 */

const EXAM = caExam("nail-technician");
const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Manicurist (Nail Care)")!.hours;
const NAIL_CARE = EXAM.topics.find((t) => t.topic === "Nail Care")!;
const SAFETY = EXAM.topics.find((t) => t.topic === "Safety and Infection Control")!;

const TITLE = "California Nail Technician License: Hours, Cost & Scope";
const DESCRIPTION =
  "What a California nail tech licence takes: 400 hours, age 17 and $110 in board fees — the board's lowest bar, filed under a name almost nobody uses.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-nail-technician-license`;

const FACTS = [
  { label: "Training hours", value: `${HOURS}`, detail: "The shortest programme the board approves. Texas requires 600 for the same licence — a third more." },
  { label: "Minimum age", value: `${CA_ELIGIBILITY.minimumAge}`, detail: `Plus the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent. No high school diploma required.` },
  { label: "Application + exam", value: `$${CA_FEES.applicationAndExam}`, detail: "Flat across every licence type — the shortest programme pays the same exam fee as the longest." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.manicurist}`, detail: `The lowest initial licence fee the board charges. Renewal is $${CA_FEES.renewalIndividual}, same as everyone.` },
];

const FAQS = [
  {
    q: "How many hours is nail school in California?",
    a: `${HOURS} hours of nail care training, under Business and Professions Code section 7365. It is the shortest route to any licence the board issues. Do not assume it matches another state — Texas requires 600 hours for the same licence, half again as long.`,
  },
  {
    q: "What is a nail technician license called in California?",
    a: "A manicurist licence. The Barbering and Cosmetology Act and the board's fee schedule both use that word; PSI's exam paperwork says “Nail Technician / Manicurist”; everyone else says nail tech. There is one licence, not three, but the board's systems only answer to “manicurist”.",
  },
  {
    q: "How much does a California nail license cost?",
    a: `$${CA_FEES.applicationAndExam} for the application and examination, then $${CA_FEES.initialLicense.manicurist} for the licence — $${CA_FEES.applicationAndExam + CA_FEES.initialLicense.manicurist} in board fees, the cheapest entry the board offers. Renewal is $${CA_FEES.renewalIndividual} every two years, the same as every other licence type, with no continuing education.`,
  },
  {
    q: "What can a California nail technician legally do?",
    a: "Trimming, polishing, colouring, tinting, cleansing, manicuring and pedicuring the nails, and massaging, cleansing or beautifying from the elbow to the fingertips and from the knee to the toes. That anatomical boundary is written into section 7316(d) — work above the elbow or above the knee is outside the licence.",
  },
  {
    q: "Should I get a nail license or a cosmetology license?",
    a: `The nail licence is ${HOURS} hours and covers nails; cosmetology is 1,000 hours and covers hair, skin and nails. There is no crossover course between them — that route exists only between barbering and cosmetology — so upgrading later means the full 1,000-hour programme rather than a top-up. If hair is a real possibility, that arithmetic matters at the point of enrolling, not later.`,
  },
  {
    q: "What is on the California nail exam?",
    a: `${EXAM.questions} questions, ${EXAM.scored} scored, ${EXAM.minutes} minutes, written only. Under the outline effective 1 April 2026 it is Safety and Infection Control ${SAFETY.pct2025}%, Nail Care ${NAIL_CARE.pct2025}%, Client Consultation and Nail Analysis 18%, Skin Care 10%. That is a dramatic change from 2020, when Nail Care was ${NAIL_CARE.pct2020}% and Safety ${SAFETY.pct2020}% — the exam is now half infection control.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "nail tech license california",
    "california manicurist license",
    "nail technician license california requirements",
    "how to get a nail license in california",
    "california nail school hours",
    "california nail license cost",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaNailTechnicianLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California nail technician license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          {HOURS} hours and ${CA_FEES.applicationAndExam + CA_FEES.initialLicense.manicurist} in
          board fees &mdash; the shortest and cheapest licence California issues, by both measures.
          The catch is not the requirements. It is that the board files it under a word almost
          nobody uses.
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

        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-indigo-950">
            California licenses a &ldquo;manicurist&rdquo;
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950/90">
            The Act calls it a manicurist licence and so does the fee schedule, so that is the word
            on your application, in the BreEZe licence lookup, and on the certificate. PSI splits the
            difference on the exam paperwork with &ldquo;Nail Technician / Manicurist&rdquo;. Nobody
            in a salon says either. It is one licence under three names, and the only one that
            matters is the board&apos;s.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Hand className="h-5 w-5 text-indigo-600" />
            The scope has an anatomical boundary
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Section 7316(d) is unusually literal about where the licence stops. Nail care is
            trimming, polishing, colouring, tinting, cleansing, manicuring and pedicuring the nails,
            plus massaging, cleansing or beautifying{" "}
            <strong className="font-bold text-slate-900">
              from the elbow to the fingertips or the knee to the toes
            </strong>
            .
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Above the elbow or above the knee is outside the licence &mdash; that work belongs to
            esthetics or cosmetology. It is worth knowing precisely, because it is exactly the kind
            of line a busy salon guesses at.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Getting to the exam
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Be at least {CA_ELIGIBILITY.minimumAge}, have completed the{" "}
            {CA_ELIGIBILITY.grade.default}th grade or its equivalent, and not be subject to denial
            under section 480. Then one of three routes, per BPC 7326: a {HOURS}-hour nail care
            course at a board-approved school, prior practice outside California credited at{" "}
            {CA_ELIGIBILITY.practiceCredit.months} months to {CA_ELIGIBILITY.practiceCredit.hours}{" "}
            hours of training, or the board&apos;s apprenticeship programme in nail care.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm leading-relaxed text-amber-900/90">
              <strong className="font-bold">There is no crossover into cosmetology.</strong> The
              crossover course runs between barbering and cosmetology only. Deciding later that you
              want hair means the full 1,000-hour cosmetology programme, not a top-up on your{" "}
              {HOURS} &mdash; which is worth knowing before you enrol rather than after.
            </p>
          </div>
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
                  <td className="py-2 pr-4 text-slate-700">Initial manicurist licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.manicurist}</td>
                  <td className="py-2 text-slate-500">After you pass</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Renewal</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.renewalIndividual}</td>
                  <td className="py-2 text-slate-500">Every 2 years</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Note the shape of it: the initial licence is the board&apos;s cheapest at $
            {CA_FEES.initialLicense.manicurist}, but the exam fee is the same $
            {CA_FEES.applicationAndExam} everyone pays and renewal is the same $
            {CA_FEES.renewalIndividual}. The discount for the shortest programme applies exactly
            once.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">
            The exam changed more than any other in 2026
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {EXAM.questions} questions, {EXAM.scored} scored, {EXAM.minutes} minutes, written only.
            On 1 April 2026 Nail Care fell from {NAIL_CARE.pct2020}% of the paper to{" "}
            {NAIL_CARE.pct2025}% while Safety and Infection Control rose from {SAFETY.pct2020}% to{" "}
            {SAFETY.pct2025}%. Half the exam is now infection control and the subject the licence is
            named after is under a quarter of it &mdash; the largest shift on any California exam.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_nail_license_to_exam_changes"
              className="font-bold text-indigo-600 hover:underline"
            >
              All five licences, 2020 against 2025
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
            system &mdash; and remember to search for &ldquo;manicurist&rdquo;.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_nail_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-license"
            data-ig-click="ca_nail_license_to_cos_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The cosmetology licence
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                1,000 hours and it includes nails &mdash; the comparison worth making first.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-nail-license-renewal"
            data-ig-click="ca_nail_license_to_renewal"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Already licensed?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Renewal: the fee, the cycle, and the name to search for.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Training hours from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7365." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7365
          </a>
          ; eligibility from BPC 7326; scope from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7316
          </a>
          . Fees are the amounts the board reports charging in its 2026 Sunset Review Report, not
          the statutory maximums in BPC 7423. Exam weightings from the board&apos;s 21 November 2025
          letter to approved schools. Confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on a figure here.
        </div>
              {/* Questions derived from this route, so a page renamed or added
            to the same convention is handled without a second edit.
            See lib/agent-invite-questions.ts. */}
        <AgentInvite questions={questionsForSlug("california-nail-technician-license")!} />

</main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-nail-technician-license#faqpage`,
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
            "@id": `${SITE_URL}/california-nail-technician-license#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California manicurist license" },
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
            "@id": `${SITE_URL}/california-nail-technician-license#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Nail technician license", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
