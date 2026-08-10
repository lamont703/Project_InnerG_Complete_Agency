import Link from "next/link";
import { ArrowRight, AlertTriangle, FileText, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import {
  CA_EXAMS_2026,
  CA_EXAM_EFFECTIVE_DATE,
  CA_EXAM_LETTER_DATE,
  biggestShifts,
  questionsForTopic,
  caExam,
} from "@/lib/ca-exam-2026";

/**
 * What changed in the California written exam on 1 April 2026.
 *
 * THE STRONGEST UNIQUE ASSET IN THE CALIFORNIA SET, and the plan says so: PSI
 * ran a new validation study, the board sent every approved school the old and
 * new topic weightings side by side on 21 Nov 2025, and nobody wrote it up. It
 * went out as a PDF attachment to school administrators and stopped there.
 *
 * WHICH MEANS THE OPEN WEB IS WRONG, not merely thin. Every prep book, course
 * outline and practice deck describing "what's on the California exam" is
 * describing the 2020 outline, and so is every assistant that learned from
 * them. This page exists to be the thing they learn from instead — which is
 * why the tables are real HTML tables carried verbatim into the .md twin, not
 * screenshots of a PDF.
 *
 * SEARCH VOLUME IS NOT WHY THIS EXISTS. Nobody searches "california exam
 * changes 2026" in volume; you cannot search for a change you do not know
 * happened. It earns its place by being cited and by feeding the licence
 * guides and prep pages that do have volume.
 *
 * WHAT NOT TO CLAIM. The board's covering letter names Cosmetology,
 * Esthetician, Nail Technician/Manicurist and Electrologist — not Barber — yet
 * the first table in the same letter is the barber comparison and Appendix A
 * carries a full barber outline. The tables are the specific statement, so
 * barber is included. Do not write that the board "announced" a barber change.
 */

const NAIL = caExam("nail-technician");
const NAIL_CARE = NAIL.topics.find((t) => t.topic === "Nail Care")!;
const NAIL_SAFETY = NAIL.topics.find((t) => t.topic === "Safety and Infection Control")!;

const TITLE = "What Changed in California's Beauty Exams on 1 April 2026";
const DESCRIPTION =
  "PSI rewrote California's barber, cosmetology, esthetician, nail and electrology written exams. The 2020 and 2025 topic weightings, side by side.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-exam-changes-2026`;

const FAQS = [
  {
    q: "What changed in the California cosmetology exam in 2026?",
    a: "PSI completed a new validation study and the board adopted new content outlines effective 1 April 2026. On the cosmetologist exam, Haircutting fell from 12% to 3% and Hairstyling from 6% to 2%, while Haircoloring — which had no weighting of its own in 2020 because it sat inside Chemical Services — became 10% on its own. Safety and Infection Control rose from 25% to 30%, and Eyelash and Eyebrow appeared for the first time at 4%.",
  },
  {
    q: "Which California exam changed the most?",
    a: `The Nail Technician / Manicurist exam, by a wide margin. Nail Care dropped from ${NAIL_CARE.pct2020}% to ${NAIL_CARE.pct2025}% and Safety and Infection Control rose from ${NAIL_SAFETY.pct2020}% to ${NAIL_SAFETY.pct2025}%. Half the exam is now infection control and the subject the licence is named after is under a quarter of it. Skin Care also appeared from nothing at 10%.`,
  },
  {
    q: "When did the new California exam outlines take effect?",
    a: "1 April 2026. The board notified approved school owners and administrators on 21 November 2025, giving schools roughly four months to adjust training plans. Anyone who sat the exam before 1 April 2026 sat the 2020 outline.",
  },
  {
    q: "Is my study material out of date?",
    a: "If it was written before 2026 and describes how the exam is weighted, yes — the proportions in it are the 2020 ones. The underlying subject matter did not change; how much of the exam each subject accounts for did. That matters most where the shift is large, which is nails, and least where it is a point or two.",
  },
  {
    q: "Is there still a practical exam in California?",
    a: "No. California stopped requiring a practical exam for all licence types on 1 January 2022, and the 2026 change is to the written exam only. Every weighting on this page is written.",
  },
  {
    q: "Do licensed professionals have to retake the exam?",
    a: "No. The new outlines apply to candidates sitting the exam from 1 April 2026 onward. California has no re-examination requirement for renewal, and no continuing education requirement either.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california cosmetology exam changes 2026",
    "psi california exam content outline 2026",
    "what is on the california cosmetology exam",
    "california nail technician exam topics",
    "california barber exam topics 2026",
    "california esthetician exam content outline",
    "california state board exam changes",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaExamChanges2026Page() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Effective 1 April 2026
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          What changed in California&apos;s written exams
        </h1>
        <p className="mb-6 text-base leading-relaxed text-slate-600">
          PSI completed a new validation study and rebuilt the content outlines behind all five
          California licensing exams. The board sent the old and new weightings to approved schools
          on {new Date(CA_EXAM_LETTER_DATE).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} and they
          took effect on{" "}
          <strong className="font-bold text-slate-900">
            {new Date(CA_EXAM_EFFECTIVE_DATE).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </strong>
          . They are reproduced here in full, because outside that letter they are not published
          anywhere.
        </p>

        <ResearchByline
          verifiedOn={VERIFIED_ON}
          what="Weightings transcribed from the board's letter to approved schools, compiled"
        />

        {/* The headline. It is a single licence, and it is dramatic enough to lead with. */}
        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-rose-950">
            <AlertTriangle className="h-5 w-5" />
            The nail exam stopped being mostly about nails
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            Nail Care fell from{" "}
            <strong className="font-bold">{NAIL_CARE.pct2020}%</strong> of the exam to{" "}
            <strong className="font-bold">{NAIL_CARE.pct2025}%</strong>, while Safety and Infection
            Control rose from {NAIL_SAFETY.pct2020}% to{" "}
            <strong className="font-bold">{NAIL_SAFETY.pct2025}%</strong>. On a{" "}
            {NAIL.scored}-question scored exam that is roughly{" "}
            {questionsForTopic(NAIL, NAIL_CARE.pct2020)} nail-care questions becoming{" "}
            {questionsForTopic(NAIL, NAIL_CARE.pct2025)}, and{" "}
            {questionsForTopic(NAIL, NAIL_SAFETY.pct2020)} infection-control questions becoming{" "}
            {questionsForTopic(NAIL, NAIL_SAFETY.pct2025)}.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-rose-950/90">
            No other licence moved half as far. A nail candidate revising from a pre-2026 book is
            spending their time in roughly inverse proportion to the exam in front of them.
          </p>
        </section>

        {/* The whole point of the page: all five, in full, as tables. */}
        <section className="mb-10">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-slate-900">
            <FileText className="h-5 w-5 text-indigo-600" />
            Every licence, 2020 against 2025
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Percentages are the share of the exam each topic accounts for. Where the board renamed a
            topic, the old name is shown underneath &mdash; a school comparing its syllabus line by
            line needs the old label to find the row.
          </p>

          <div className="space-y-8">
            {CA_EXAMS_2026.map((exam) => (
              <div key={exam.slug}>
                <h3 className="mb-1 text-lg font-black text-slate-900">{exam.license}</h3>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {exam.questions} questions &middot; {exam.scored} scored &middot; {exam.minutes}{" "}
                  minutes
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] border-collapse text-sm">
                    <caption className="sr-only">
                      {exam.license} written examination topic weightings, 2020 outline against the
                      2025 outline effective 1 April 2026
                    </caption>
                    <thead>
                      <tr className="border-b border-slate-300 text-left">
                        <th scope="col" className="pb-2 pr-4 font-black text-slate-900">
                          Topic
                        </th>
                        <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">
                          2020
                        </th>
                        <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-900">
                          2025
                        </th>
                        <th scope="col" className="pb-2 text-right font-black text-slate-500">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.topics.map((t) => {
                        const delta = t.pct2025 - t.pct2020;
                        return (
                          <tr key={t.topic} className="border-b border-slate-100 align-top">
                            <td className="py-2 pr-4 text-slate-700">
                              {t.topic}
                              {t.previousName && (
                                <span className="mt-0.5 block text-xs italic text-slate-400">
                                  previously {t.previousName}
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums text-slate-400">
                              {t.pct2020}%
                            </td>
                            <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">
                              {t.pct2025}%
                            </td>
                            <td
                              className={`py-2 text-right font-bold tabular-nums ${
                                delta > 0
                                  ? "text-emerald-700"
                                  : delta < 0
                                    ? "text-rose-700"
                                    : "text-slate-400"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta === 0 ? "—" : `${delta}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {biggestShifts(exam, 5).length > 0 && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Biggest movers:{" "}
                    {biggestShifts(exam, 5)
                      .map(
                        (t) =>
                          `${t.topic} ${t.pct2020}% → ${t.pct2025}%`,
                      )
                      .join(", ")}
                    .
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Clock className="h-5 w-5 text-indigo-600" />
            Exam structure, unchanged
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            The rewrite moved the weightings, not the format. Unscored questions are pretest items
            &mdash; they count toward the clock and not toward the result, and there is no way to
            tell which is which while you are sitting it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">
                    Licence
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-900">
                    Questions
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">
                    Scored
                  </th>
                  <th scope="col" className="pb-2 text-right font-black text-slate-500">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {CA_EXAMS_2026.map((e) => (
                  <tr key={e.slug} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-700">{e.license}</td>
                    <td className="py-2 pr-4 text-right tabular-nums font-bold text-slate-900">
                      {e.questions}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{e.scored}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{e.minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            All written. California stopped requiring a practical exam for every licence type on{" "}
            <strong className="font-bold text-slate-900">1 January 2022</strong>, so there is no
            second, hands-on component behind any of these numbers.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">One thing this page will not say</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            The board&apos;s covering letter lists the affected exams as cosmetology, esthetician,
            nail technician/manicurist and electrologist &mdash; it does not mention barbering. But
            the first comparison table in that same letter is the barber exam, and the appendix
            carries a complete 2025 barber outline. The tables are the specific statement and the
            paragraph is the loose summary, so the barber figures are published here. What we
            won&apos;t claim is that the board announced a barber change in words, because it
            didn&apos;t.
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
            href="/california-cosmetology-exam-intelligence-prep"
            data-ig-click="ca_exam_changes_to_cos_prep"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Cosmetology pass rates by school
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Where candidates from each California school actually land, first attempt.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-barber-exam-intelligence-prep"
            data-ig-click="ca_exam_changes_to_barber_prep"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Barber pass rates by school
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                The same, for the barber written exam.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Weightings, question counts and time limits are transcribed from &ldquo;Notification of
          Update to Examinations&rdquo;, the Board of Barbering &amp; Cosmetology&apos;s{" "}
          {new Date(CA_EXAM_LETTER_DATE).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{" "}
          letter to board-approved school owners and administrators &mdash; comparison tables from
          the body, structures and full outlines from Appendix A. The absence of a practical exam is
          from the board&apos;s{" "}
          <a
            href="https://www.barbercosmo.ca.gov/applicants/national.shtml"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            examination information page
          </a>
          . Confirm against{" "}
          <a
            href="https://www.barbercosmo.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            barbercosmo.ca.gov
          </a>{" "}
          before relying on any figure here.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-exam-changes-2026#faqpage`,
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
            "@id": `${SITE_URL}/california-exam-changes-2026#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California barbering and cosmetology licensing examinations" },
          },
          )),
        }}
      />
      {/* Dataset, per the plan's note that it is worth testing where a page IS
          the data. Five tables of weightings transcribed from a document that
          exists nowhere else on the web is as close to a dataset as anything
          on this site. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "Dataset",
            "@id": `${SITE_URL}/california-exam-changes-2026#dataset`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            name: "California licensing exam content outline weightings, 2020 vs 2025",
            description:
              "Topic weightings for the California barber, cosmetologist, esthetician, nail technician/manicurist and electrologist written examinations, comparing the 2020 content outlines with the 2025 outlines effective 1 April 2026.",
            url: PAGE,
            creator: { "@type": "GovernmentOrganization", name: "California Board of Barbering & Cosmetology" },
            temporalCoverage: `2020/${CA_EXAM_EFFECTIVE_DATE}`,
            spatialCoverage: { "@type": "State", name: "California" },
            dateModified: VERIFIED_ON,
            isAccessibleForFree: true,
            variableMeasured: CA_EXAMS_2026.map((e) => `${e.license} topic weighting`),
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
            "@id": `${SITE_URL}/california-exam-changes-2026#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "2026 exam changes", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
