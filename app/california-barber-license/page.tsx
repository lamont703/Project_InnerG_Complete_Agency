import Link from "next/link";
import { ExternalLink, ArrowRight, GraduationCap, Scissors, Wallet } from "lucide-react";
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
 * California barber licence.
 *
 * THE SCOPE COMPARISON IS THE PAGE. Barbering and cosmetology both take 1,000
 * hours, cost the same, renew the same and are issued by the same board, so a
 * guide that lists hours and fees says nothing a reader could not get from the
 * cosmetology page. What actually differs is the scope, and BPC 7316 makes it
 * concrete: shaving appears in the barbering definition and not in the
 * cosmetology one; nails appear in the cosmetology definition and not in the
 * barbering one. That is the real answer to "which licence should I get", and
 * it is why the board runs a crossover course between exactly these two
 * licences and no others.
 *
 * CAREFUL WITH THE CLAIM. What is verifiable is which practices each
 * definition ENUMERATES. Whether a cosmetologist trimming a beard is outside
 * their scope is an interpretive question this page does not answer — it lists
 * the statute and points at the crossover course, which exists precisely
 * because the scopes are not the same.
 *
 * SHAVING IS ALSO THE EXAM. 22% of the barber written exam, and it has no
 * counterpart on any other paper.
 */

const EXAM = caExam("barber");
const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Barbering")!.hours;
const SHAVING = EXAM.topics.find((t) => t.topic === "Shaving")!;
const COLORING = EXAM.topics.find((t) => t.topic === "Haircoloring")!;

const TITLE = "California Barber License: Hours, Cost & Scope of Practice";
const DESCRIPTION =
  "What a California barber licence takes: 1,000 hours, age 17 and $125 in board fees — and exactly where the barbering scope parts company with cosmetology.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-barber-license`;

const FACTS = [
  { label: "Training hours", value: HOURS.toLocaleString(), detail: "Identical to cosmetology. The two licences differ in what they cover, not in how long they take." },
  { label: "Minimum age", value: `${CA_ELIGIBILITY.minimumAge}`, detail: `Plus the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent. No high school diploma required.` },
  { label: "Application + exam", value: `$${CA_FEES.applicationAndExam}`, detail: "Covers the application and your seat at the PSI written exam." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.barber}`, detail: `Then $${CA_FEES.renewalIndividual} every two years, with no continuing education.` },
];

const BARBERING = [
  "Shaving or trimming the beard, or cutting the hair",
  "Facial and scalp massages or treatments with oils, creams, lotions or other preparations, by hand or by mechanical appliance",
  "Singeing, shampooing, arranging, dressing, curling, waving, chemical waving, hair relaxing, dyeing the hair, or applying hair tonics",
  "Applying cosmetic preparations, antiseptics, powders, oils, clays or lotions to the scalp, face or neck",
  "Hairstyling of all textures of hair by standard methods current at the time",
];

const FAQS = [
  {
    q: "How many hours is barber school in California?",
    a: `${HOURS.toLocaleString()} hours, under Business and Professions Code section 7362.5 — the same section and the same figure as cosmetology. The two licences take equally long; they cover different work.`,
  },
  {
    q: "What is the difference between a barber and a cosmetology license in California?",
    a: "Scope. Section 7316 lists shaving and beard trimming in the barbering definition and not in the cosmetology one, and lists nail work, hand and foot treatment and hair removal in the cosmetology definition and not in the barbering one. Both cover cutting, colouring, chemical texture work and scalp and facial treatment. The board runs a crossover course between the two, which is the clearest evidence that neither is a subset of the other.",
  },
  {
    q: "Can a California barber do nails?",
    a: "Nail work is enumerated in the cosmetology scope, not the barbering scope. A barber who wants it can take the cosmetology crossover course rather than a full 1,000-hour programme — that route exists specifically for this.",
  },
  {
    q: "How much does a California barber license cost?",
    a: `$${CA_FEES.applicationAndExam} for the application and examination, then $${CA_FEES.initialLicense.barber} for the licence — $${CA_FEES.applicationAndExam + CA_FEES.initialLicense.barber} in board fees before tuition. Renewal is $${CA_FEES.renewalIndividual} every two years. If you open your own shop, the establishment licence is a separate $${CA_FEES.establishment.initial}.`,
  },
  {
    q: "Is there a practical exam for California barbers?",
    a: `No. California stopped requiring a practical for all licence types on 1 January 2022. The barber exam is ${EXAM.questions} questions, ${EXAM.scored} scored, in ${EXAM.minutes} minutes, written only.`,
  },
  {
    q: "What is on the California barber exam?",
    a: `Under the outline effective 1 April 2026: Safety and Infection Control 31%, Shaving ${SHAVING.pct2025}%, Client Consultation and Hair and Skin Analysis 15%, Haircutting 8%, Haircoloring ${COLORING.pct2025}%, Chemical Texture Services 7%, Hairstyling 5%, Skin Care 5%. Shaving being nearly a quarter of the paper is unique to this licence — no other California exam tests it at all.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california barber license",
    "barber license california requirements",
    "how to become a barber in california",
    "california barber school hours",
    "california barber license cost",
    "barber vs cosmetology license california",
    "california barber scope of practice",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaBarberLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California barber license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          {HOURS.toLocaleString()} hours, age {CA_ELIGIBILITY.minimumAge}, the{" "}
          {CA_ELIGIBILITY.grade.default}th grade, and $
          {CA_FEES.applicationAndExam + CA_FEES.initialLicense.barber} in board fees &mdash; every
          one of which is identical to cosmetology. The question worth answering is not how long it
          takes but which of the two licences covers the work you actually want to do.
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

        {/* The section that answers the question people are actually asking. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Scissors className="h-5 w-5 text-indigo-600" />
            Barber or cosmetology? The statute is specific
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Section 7316 defines both in the same breath, and the lists are not the same. The
            practice of barbering is:
          </p>
          <ul className="mb-5 space-y-2">
            {BARBERING.map((b) => (
              <li key={b} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                {b}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
            <p className="text-sm leading-relaxed text-indigo-950/90">
              <strong className="font-bold">Shaving is in that list and is not in the cosmetology
              one.</strong>{" "}
              Working the other way: nail work, treating the hands and feet, and removing
              superfluous hair are all enumerated in the cosmetology definition and are not
              enumerated in the barbering one. Everything else &mdash; cutting, colouring, chemical
              texture services, scalp and facial treatment &mdash; appears in both.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
              Neither licence is a subset of the other, which is exactly why the board runs a{" "}
              <strong className="font-bold">crossover course</strong> between them. If you already
              hold one, you take the crossover rather than another {HOURS.toLocaleString()} hours.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Getting to the exam
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Be at least {CA_ELIGIBILITY.minimumAge}, have completed the{" "}
            {CA_ELIGIBILITY.grade.default}th grade or its equivalent, and not be subject to denial
            under section 480. Then one of four routes, per BPC 7321.5:
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              A {HOURS.toLocaleString()}-hour barbering course at a board-approved school.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              An approved apprenticeship programme in barbering.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              Practice outside California, credited at {CA_ELIGIBILITY.practiceCredit.months} months
              of work to {CA_ELIGIBILITY.practiceCredit.hours} hours of training &mdash;{" "}
              {CA_ELIGIBILITY.practiceCredit.hours * (12 / CA_ELIGIBILITY.practiceCredit.months)}{" "}
              hours a year for someone already working.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              A barbering crossover course, if you hold or have completed cosmetology.
            </li>
          </ul>
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
                  <td className="py-2 pr-4 text-slate-700">Initial barber licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.barber}</td>
                  <td className="py-2 text-slate-500">After you pass</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Renewal</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.renewalIndividual}</td>
                  <td className="py-2 text-slate-500">Every 2 years</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Barbershop establishment licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.establishment.initial}</td>
                  <td className="py-2 text-slate-500">If you open a shop</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The establishment licence is the one to remember later: it belongs to the shop rather
            than to you, renews on its own date for ${CA_FEES.establishment.renewal}, and lapses
            without affecting your personal licence at all.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">The exam, and shaving</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {EXAM.questions} questions, {EXAM.scored} scored, {EXAM.minutes} minutes, written only.
            Shaving is <strong className="font-bold text-slate-900">{SHAVING.pct2025}%</strong> of
            it &mdash; roughly {Math.round((SHAVING.pct2025 / 100) * EXAM.scored)} scored questions,
            and a subject no other California licensing exam tests at all.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The outline changed on 1 April 2026. Chemical Texture Services fell from 18% to 7% while
            Haircoloring became a topic of its own at {COLORING.pct2025}%, having previously been
            folded inside it &mdash; so the total chemical content barely moved, but how it is
            examined did.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_barber_license_to_exam_changes"
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
            system &mdash; not through barbercosmo.ca.gov.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_barber_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-license"
            data-ig-click="ca_barber_license_to_cos_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The cosmetology licence
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Same hours, same fees, wider scope &mdash; hair, skin and nails.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-barber-license-renewal"
            data-ig-click="ca_barber_license_to_renewal"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Already licensed?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Renewal, plus the shop licence that renews separately.
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
          ; eligibility and routes from BPC 7321.5; scope of practice from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7316
          </a>
          . Fees are the amounts the board reports charging in its 2026 Sunset Review Report, not
          the statutory maximums in BPC 7423. Exam weightings from the board&apos;s 21 November 2025
          letter to approved schools. This is a summary of the law, not legal advice &mdash; confirm
          on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on it.
        </div>
              {/* Questions derived from this route, so a page renamed or added
            to the same convention is handled without a second edit.
            See lib/agent-invite-questions.ts. */}
        <AgentInvite questions={questionsForSlug("california-barber-license")!} />

</main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-barber-license#faqpage`,
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
            "@id": `${SITE_URL}/california-barber-license#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California barber license" },
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
            "@id": `${SITE_URL}/california-barber-license#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Barber license", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
