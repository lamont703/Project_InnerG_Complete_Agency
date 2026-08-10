import Link from "next/link";
import { ExternalLink, ArrowRight, GraduationCap, Ban, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { CA_FEES, CA_ELIGIBILITY, CA_TRAINING_HOURS } from "@/lib/ca-sources";
import { caExam } from "@/lib/ca-exam-2026";

/**
 * California esthetician licence.
 *
 * TWO SPELLINGS, 590/mo EACH. "california esthetician license" and
 * "aesthetician license california" run level. One page carries both, because
 * they are the same question and California uses exactly one of the spellings.
 *
 * THE LASER SECTION IS WHY THIS PAGE EXISTS. Everything else here is a fee
 * table anyone could assemble. But BPC 7320.5 says, in one sentence, that any
 * licensee who uses a laser on a human being is guilty of a MISDEMEANOR — a
 * criminal offence, not a licensing violation — and BPC 7316(c) draws the
 * boundary of skin care at treatments "that do not result in the ablation or
 * destruction of the live tissue". Estheticians work next to medspas offering
 * exactly those services, the distinction between what the spa may do under
 * medical supervision and what the esthetician licence permits is genuinely
 * confusing, and getting it wrong is a criminal matter. Nobody writes this up
 * plainly. That is the page.
 *
 * HOURS DO NOT TRANSFER FROM TEXAS. California is 600, Texas is 750. This is
 * the single figure most likely to be carried across by mistake — see the
 * warning at the top of lib/ca-sources.ts.
 */

const EXAM = caExam("esthetician");
const HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Esthetician (Skin Care)")!.hours;
const SKIN_CARE = EXAM.topics.find((t) => t.topic === "Skin Care")!;

const TITLE = "California Esthetician License: Hours, Cost & Scope";
const DESCRIPTION =
  "What a California esthetician licence takes: 600 hours, age 17 and $115 in board fees — plus the laser rule that makes one common treatment a misdemeanour.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-esthetician-license`;

const FACTS = [
  { label: "Training hours", value: `${HOURS}`, detail: "Texas requires 750 for the same licence. Hours do not transfer on assumption — check before enrolling anywhere." },
  { label: "Minimum age", value: `${CA_ELIGIBILITY.minimumAge}`, detail: `Plus the ${CA_ELIGIBILITY.grade.default}th grade or its equivalent. No high school diploma required.` },
  { label: "Application + exam", value: `$${CA_FEES.applicationAndExam}`, detail: "The same fee every licence type pays, regardless of how many hours it took." },
  { label: "First licence", value: `$${CA_FEES.initialLicense.esthetician}`, detail: `Cheaper than the $${CA_FEES.initialLicense.cosmetology} cosmetology licence — but renewal is $${CA_FEES.renewalIndividual} for both.` },
];

const FAQS = [
  {
    q: "How many hours is esthetician school in California?",
    a: `${HOURS} hours, under Business and Professions Code section 7364. This is one of the figures most often got wrong by carrying a number across state lines: Texas requires 750 hours for the same licence, and a school comparison that quietly assumes the states match will be 150 hours out.`,
  },
  {
    q: "Is it esthetician or aesthetician in California?",
    a: "California licenses an “esthetician”. Both spellings are correct English and both are searched about equally often, but only the one without the leading a matches the board's records, its application forms and the BreEZe licence lookup.",
  },
  {
    q: "Can a California esthetician use a laser?",
    a: "No, and this one is unusually serious. Business and Professions Code section 7320.5 states that any licensee who uses a laser in the treatment of any human being is guilty of a misdemeanor — a criminal offence rather than a licensing matter. Section 7316 separately excludes lasers and light waves from the hair removal an esthetician may perform.",
  },
  {
    q: "What can an esthetician actually do in California?",
    a: "Facials, massage, stimulation, exfoliation, cleansing and beautifying of the face, scalp, neck, hands, arms, feet, legs and upper body; tinting and perming eyelashes and brows and applying lashes; and hair removal by depilatory, tweezers, sugaring, nonprescription chemical, waxing or mechanical device. The statutory limit on all of it is that the treatment must not result in the ablation or destruction of live tissue.",
  },
  {
    q: "How much does a California esthetician license cost?",
    a: `$${CA_FEES.applicationAndExam} for the application and exam, then $${CA_FEES.initialLicense.esthetician} for the licence — $${CA_FEES.applicationAndExam + CA_FEES.initialLicense.esthetician} in board fees. Renewal is $${CA_FEES.renewalIndividual} every two years, with no continuing education requirement in California.`,
  },
  {
    q: "How hard is the California esthetician exam?",
    a: `It is ${EXAM.questions} questions, ${EXAM.scored} scored, in ${EXAM.minutes} minutes, written only — California dropped the practical exam entirely on 1 January 2022. Note that the outline changed on 1 April 2026: Skin Care fell from ${SKIN_CARE.pct2020}% to ${SKIN_CARE.pct2025}% and Safety and Infection Control rose to 40%, so two of every five questions are now infection control.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california esthetician license",
    "aesthetician license california",
    "esthetician license california requirements",
    "how to become an esthetician in california",
    "california esthetician hours",
    "california esthetician license cost",
    "can estheticians use lasers in california",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaEstheticianLicensePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California esthetician license
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          {HOURS} hours, age {CA_ELIGIBILITY.minimumAge}, the{" "}
          {CA_ELIGIBILITY.grade.default}th grade, and ${CA_FEES.applicationAndExam + CA_FEES.initialLicense.esthetician}{" "}
          in board fees. The part worth reading twice is not any of those numbers &mdash; it is what
          the licence does not permit, because one common treatment is a criminal offence rather
          than a licensing violation.
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

        {/* The section this page is for. */}
        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-rose-950">
            <Ban className="h-5 w-5" />
            Lasers are a misdemeanour, not a licensing issue
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            Business and Professions Code section 7320.5 is one sentence long:{" "}
            <em>
              any licensee who uses a laser in the treatment of any human being is guilty of a
              misdemeanor
            </em>
            . Not a citation, not a suspension &mdash; a criminal offence. And note the word
            <strong className="font-bold"> licensee</strong>: it binds every licence the board
            issues, not only estheticians.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-rose-950/90">
            Section 7316 draws the same line from the other direction. Skin care is defined as
            improving the appearance or well-being of the skin by means{" "}
            <em>that do not result in the ablation or destruction of the live tissue</em>, and the
            hair removal an esthetician may perform is listed as depilatories, tweezers, sugaring,
            nonprescription chemicals, waxing and devices &mdash;{" "}
            <em>except by the use of lasers or light waves, which are commonly known as rays</em>.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-rose-950/90">
            This matters because estheticians work alongside medspas that do offer these treatments,
            under medical supervision and a different body of law entirely. The spa next door being
            allowed to do it does not extend the esthetician licence, and the difference is not one
            the board treats as a technicality.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">What the licence does cover</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Section 7316(c) defines the practice of skin care as any combination of:
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              Facials, massage, stimulation, exfoliation, cleansing and beautifying of the face,
              scalp, neck, hands, arms, feet, legs and upper body &mdash; by hand or with esthetic
              devices, cosmetic products, antiseptics, lotions, tonics or creams.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              Tinting and perming eyelashes and brows, and applying eyelashes. This sits in the
              cosmetology scope too, which is why both licences can offer it.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              Removing superfluous hair by depilatory, tweezers, sugaring, nonprescription chemical,
              waxing, or devices and appliances &mdash; excluding lasers and light waves.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Getting to the exam
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Be at least {CA_ELIGIBILITY.minimumAge}, have completed the{" "}
            {CA_ELIGIBILITY.grade.default}th grade or its equivalent, and not be subject to denial
            under section 480. Then one of three routes: a {HOURS}-hour skin care course at a
            board-approved school, prior practice outside California &mdash; credited at{" "}
            {CA_ELIGIBILITY.practiceCredit.months} months of work to{" "}
            {CA_ELIGIBILITY.practiceCredit.hours} hours of training &mdash; or the board&apos;s
            apprenticeship programme in skin care.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            There is no crossover course into esthetics. That route exists only between barbering
            and cosmetology; a cosmetologist already holds the skin care scope, and everyone else
            starts from the {HOURS} hours.
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
                  <td className="py-2 pr-4 text-slate-700">Initial esthetician licence</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">${CA_FEES.initialLicense.esthetician}</td>
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
            The initial licence is ${CA_FEES.initialLicense.esthetician} against $
            {CA_FEES.initialLicense.cosmetology} for cosmetology &mdash; but renewal is $
            {CA_FEES.renewalIndividual} for every licence type, so the discount applies once and
            never again.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">The exam changed in April 2026</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {EXAM.questions} questions, {EXAM.scored} scored, {EXAM.minutes} minutes, written only.
            On 1 April 2026 PSI&apos;s new content outline took effect and Skin Care &mdash; the
            subject the licence exists for &mdash; fell from {SKIN_CARE.pct2020}% of the exam to{" "}
            {SKIN_CARE.pct2025}%, while Safety and Infection Control rose to 40%. Eyelash and Eyebrow
            appears for the first time at 6%.{" "}
            <Link
              href="/california-exam-changes-2026"
              data-ig-click="ca_esthy_license_to_exam_changes"
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
            data-ig-click="ca_esthy_license_breeze"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Go to BreEZe
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_esthy_license_to_leaderboard"
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
            href="/california-esthetician-license-renewal"
            data-ig-click="ca_esthy_license_to_renewal"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Already licensed?
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Renewal: the fee, the cycle, and the spelling that finds your record.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Training hours from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7364." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7364
          </a>
          ; eligibility from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7324." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7324
          </a>
          ; scope of practice and the laser prohibition from{" "}
          <a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316." target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            BPC 7316
          </a>{" "}
          and BPC 7320.5. Fees are the amounts the board reports charging in its 2026 Sunset Review
          Report, not the statutory maximums in BPC 7423. This is a summary of the law, not legal
          advice &mdash; confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before relying on it.
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
            about: { "@type": "Thing", name: "California esthetician license" },
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
              { "@type": "ListItem", position: 2, name: "Esthetician license", item: PAGE },
            ],
          }),
        }}
      />
    </div>
  );
}
