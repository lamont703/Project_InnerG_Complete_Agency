import Link from "next/link";
import { ExternalLink, ArrowRight, GraduationCap, Zap, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { CA_FEES, CA_ELIGIBILITY, CA_TRAINING_HOURS } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";

/**
 * California electrologist licence — the other licence with no Texas
 * equivalent, and the one that breaks every rule the other five follow.
 *
 * THREE WAYS IT IS THE ODD ONE OUT, all verified rather than inferred:
 *
 *   1. EDUCATION. BPC 7330(b) asks for the 12th grade or an accredited senior
 *      high school course of study. The other five ask for the 10th. Every
 *      summary of California's requirements on the web says "17 and 10th
 *      grade", which is wrong for this licence. It was caught because the
 *      electrologist application form asks a different question from the other
 *      five, then confirmed in the statute — so it is law, not a form quirk.
 *   2. THE OUT-OF-STATE ROUTE HAS A FLOOR. 7330(d)(2) requires 18 months of
 *      practice. The other five sections state no minimum period.
 *   3. IT IS THE ONLY LICENCE THAT SHRANK IN 2026. Every other exam raised
 *      Safety and Infection Control; electrology cut it from 40% to 36% and
 *      moved the weight into consultation and analysis.
 *
 * THE NEEDLE-ONLY RULE IS THE COMMERCIAL POINT. BPC 7316(g) defines
 * electrolysis as removing or destroying hair "by the use of an electric
 * needle only", and BPC 7320.5 makes any licensee's use of a laser a
 * misdemeanour. So the licence whose entire purpose is permanent hair removal
 * is statutorily confined to a needle while laser hair removal advertises
 * everywhere. Anyone considering this licence needs that stated plainly before
 * they enrol, not after.
 */

const EXAM = caExam("electrologist");
const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Electrologist")!.hours;
const SAFETY = EXAM.topics.find((t) => t.topic === "Safety and Infection Control")!;
const CONSULT = EXAM.topics.find((t) => t.topic.startsWith("Client Consultation"))!;

const TITLE = "California Electrologist License: 600 Hours, 12th Grade";
const DESCRIPTION =
  "California's electrologist licence: 600 hours, and the only one of the six that requires the 12th grade rather than the 10th. Plus the needle-only rule.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-electrologist-license`;

const FACTS = [
  { label: "Training hours", value: `${HOURS}`, detail: "The same as esthetics and hairstyling, and well under cosmetology's 1,000." },
  { label: "Education", value: "12th grade", detail: "The only California beauty licence that asks for it. The other five ask for the 10th grade." },
  { label: "Application + exam", value: `$${CA_FEES.applicationAndExam}`, detail: "The standard fee, same as barbering, cosmetology, esthetics and nails." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.electrologist}`, detail: `Then $${CA_FEES.renewalIndividual} every two years, with no continuing education.` },
];

const FAQS = [
  {
    q: "What are the requirements for an electrologist license in California?",
    a: `You must be at least ${CA_ELIGIBILITY.minimumAge}, have completed the 12th grade or an accredited senior high school course of study or its equivalent, and not be subject to denial under section 480. Then either ${HOURS} hours of electrolysis training at a board-approved school, 18 months of practice outside California, or the board's apprenticeship programme in electrology. The education bar is the part to note — Business and Professions Code section 7330 asks for the 12th grade where every other licence asks for the 10th.`,
  },
  {
    q: "Do you need a high school diploma to be an electrologist in California?",
    a: "Effectively yes, unlike the other five licences. Section 7330(b) requires completion of the 12th grade or an accredited senior high school course of study in the public schools of this state, or its equivalent. Cosmetology, barbering, hairstyling, esthetics and nails all require only the 10th grade — which is why the widely repeated summary of “17 and the 10th grade” as California's requirement is wrong for exactly one licence.",
  },
  {
    q: "Can a California electrologist use a laser?",
    a: "No. Section 7316(g) defines electrolysis as removing hair from or destroying hair on the human body by the use of an electric needle ONLY, and includes thermolysis within that definition. Separately, section 7320.5 makes any licensee's use of a laser in the treatment of a human being a misdemeanor — a criminal offence, not a licensing matter. Laser hair removal sits outside this licence entirely.",
  },
  {
    q: "How much does a California electrologist license cost?",
    a: `$${CA_FEES.applicationAndExam} for the application and examination and $${CA_FEES.initialLicense.electrologist} for the licence — $${CA_FEES.applicationAndExam + CA_FEES.initialLicense.electrologist} in board fees, the same as barbering and cosmetology. Renewal is $${CA_FEES.renewalIndividual} every two years, with no continuing education requirement.`,
  },
  {
    q: "What is on the California electrologist exam?",
    a: `${EXAM.questions} questions, ${EXAM.scored} scored, in ${EXAM.minutes} minutes, written only — the shortest exam the board sets. Under the outline effective 1 April 2026: Safety and Infection Control ${SAFETY.pct2025}%, Client Consultation and Hair and Skin Analysis ${CONSULT.pct2025}%, Electrolysis Treatment and Analysis 34%.`,
  },
  {
    q: "Can I qualify on experience from another state?",
    a: `Yes, but electrology alone sets a floor: section 7330(d)(2) requires 18 months of practice outside California, credited at ${CA_ELIGIBILITY.practiceCredit.months} months of work to ${CA_ELIGIBILITY.practiceCredit.hours} hours of training. The equivalent sections for the other five licences state no minimum period at all.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california electrologist license",
    "electrologist license california requirements",
    "how to become an electrologist in california",
    "california electrolysis license hours",
    "california electrologist exam",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaElectrologistLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California electrologist license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          {HOURS} hours and ${CA_FEES.applicationAndExam + CA_FEES.initialLicense.electrologist} in
          board fees, which puts it in line with the rest. Everything else about this licence is
          different from the other five &mdash; including the education requirement, which almost
          every guide to California licensing gets wrong.
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
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-indigo-950">
            <GraduationCap className="h-5 w-5" />
            The 12th grade, not the 10th
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950/90">
            Section 7330(b) requires completion of{" "}
            <strong className="font-bold">
              the 12th grade or an accredited senior high school course of study
            </strong>{" "}
            in the public schools of this state, or its equivalent. Cosmetology, barbering,
            hairstyling, esthetics and nails all ask for the 10th grade.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
            &ldquo;Age 17 and the 10th grade&rdquo; is how California&apos;s requirement is
            summarised almost everywhere, and it is wrong for exactly one licence in six. If you are
            planning around not having finished high school, this is the one where that matters.
          </p>
        </section>

        {/* The commercial reality of the licence. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Zap className="h-5 w-5 text-indigo-600" />
            An electric needle, and nothing else
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Section 7316(g) defines electrolysis as removing hair from, or destroying hair on, the
            human body{" "}
            <strong className="font-bold text-slate-900">by the use of an electric needle only</strong>
            . The definition covers electrolysis and thermolysis, and stops there.
          </p>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
            <p className="text-sm leading-relaxed text-rose-950/90">
              Section 7320.5 closes the other door in one sentence: any licensee who uses a laser in
              the treatment of any human being is guilty of a{" "}
              <strong className="font-bold">misdemeanor</strong>. So the licence whose entire purpose
              is permanent hair removal is confined by statute to a needle, while laser hair removal
              is advertised on every high street under an entirely different body of law.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-rose-950/90">
              That is not a footnote about this licence &mdash; it is the market it operates in, and
              it belongs in the decision to enrol rather than in a surprise afterwards.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">Getting to the exam</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              A <strong className="font-bold text-slate-900">{HOURS}-hour</strong> electrolysis
              course at a board-approved school. Regulation puts epilation by single- and
              multiple-needle insertion, galvanic technique and thermolysis inside the required
              curriculum.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <strong className="font-bold text-slate-900">18 months</strong> of practice outside
              California, credited at {CA_ELIGIBILITY.practiceCredit.months} months of work to{" "}
              {CA_ELIGIBILITY.practiceCredit.hours} hours of training. Electrology is the only
              licence whose statute puts a minimum period on this route.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              The board&apos;s apprenticeship programme in electrology, under Article 4 of the Act.
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
                  <td className="py-2 pr-4 text-slate-700">Initial electrologist licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.electrologist}</td>
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
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">
            The only exam that got less safety, not more
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {EXAM.questions} questions, {EXAM.scored} scored, {EXAM.minutes} minutes &mdash; the
            shortest paper the board sets. And it moved against the trend on 1 April 2026: every
            other California exam raised its Safety and Infection Control weighting, while
            electrology cut it from {SAFETY.pct2020}% to {SAFETY.pct2025}% and put the weight into
            Client Consultation and Hair and Skin Analysis, which rose from {CONSULT.pct2020}% to{" "}
            {CONSULT.pct2025}%.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_electrologist_to_exam_changes"
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
            Applications run through BreEZe, the Department of Consumer Affairs system. The board
            publishes a separate electrologist application.
          </p>
          <a
            href="https://www.breeze.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_electrologist_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-esthetician-license"
            data-ig-click="ca_electrologist_to_esthy_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The esthetician licence
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Same {HOURS} hours, the 10th grade, and waxing rather than needles.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_electrologist_to_leaderboard"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                California school pass rates
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                State board results by school, from the board&apos;s own data.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Training hours from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7366." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7366
          </a>
          ; eligibility, the 12th-grade requirement and the 18-month route from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7330." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7330
          </a>
          ; scope from BPC 7316(g) and the laser prohibition from BPC 7320.5. Fees from the
          board&apos;s 2026 Sunset Review Report, not the statutory maximums in BPC 7423. This is a
          summary of the law, not legal advice &mdash; confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on it.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-electrologist-license#faqpage`,
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
            "@id": `${SITE_URL}/california-electrologist-license#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California electrologist license" },
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
            "@id": `${SITE_URL}/california-electrologist-license#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Electrologist license", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
