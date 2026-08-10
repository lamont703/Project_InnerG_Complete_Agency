/**
 * California written exam content outlines, effective 1 April 2026.
 *
 * WHAT THIS IS. PSI completed a new validation study; the Board of Barbering &
 * Cosmetology sent every approved school a letter dated 21 November 2025
 * carrying the new topic weightings beside the 2020 ones they replace. This
 * file is that comparison, transcribed.
 *
 * WHY IT IS WORTH HAVING IN CODE. It is the most citable thing in the whole
 * California reference set and nobody has published it. Ask any assistant
 * "what's on the California cosmetology exam" today and it answers from the
 * 2020 outline, because that is what the open web contains. A student
 * revising from any pre-2026 book, course or practice deck is revising the
 * wrong proportions — that is a headline, not a footnote.
 *
 * THE HEADLINE IS THE NAIL EXAM. Nail Care fell from 49% to 22% while Safety
 * and Infection Control rose from 38% to 50%. Half the nail technician exam is
 * now infection control, and the subject the licence is named after is under a
 * quarter of it. No other licence moved that far.
 *
 * ONE DISCREPANCY IN THE SOURCE, recorded rather than smoothed over. The
 * letter's opening paragraph lists the affected exams as "Cosmetology,
 * Esthetician, Nail Technician/Manicurist, and Electrologist" — it does not
 * name Barber. But the very first comparison table in the same letter is the
 * National Barber Theory Examination, and Appendix A carries a full 2025
 * barber outline. The tables are the specific statement and the paragraph is
 * the loose summary, so barber is included here. Anything published on this
 * should not claim the board announced a barber change in prose.
 *
 * NOT A PRACTICAL EXAM. California has required no practical since 1 January
 * 2022 (lib/ca-sources.ts, `exam-national`). Every weighting below is written
 * only.
 *
 * Source: "Letter to Schools Regarding PSI Exam Update – Effective April 1,
 * 2026", dated 21 Nov 2025, 20pp. Comparison tables pp.2-3, outlines and exam
 * structures in Appendix A from p.4. Read 2026-08-10.
 */

export interface CaExamTopic {
  topic: string;
  /** Weighting under the outline in force until 31 March 2026. */
  pct2020: number;
  /** Weighting in force from 1 April 2026. */
  pct2025: number;
  /**
   * The board renames topics as well as reweighting them. Where the letter
   * printed an old name in parentheses, it is kept here — a school comparing
   * its syllabus line by line needs the old label to find the row.
   */
  previousName?: string;
}

export interface CaExam {
  /** Licence, as the board names it. */
  license: string;
  /** URL-safe key. */
  slug: "barber" | "cosmetologist" | "esthetician" | "nail-technician" | "electrologist";
  questions: number;
  scored: number;
  /** Unscored pretest items. They count toward the clock, not the score. */
  unscored: number;
  minutes: number;
  topics: CaExamTopic[];
}

export const CA_EXAMS_2026: CaExam[] = [
  {
    license: "Barber",
    slug: "barber",
    questions: 95,
    scored: 85,
    unscored: 10,
    minutes: 120,
    topics: [
      { topic: "Safety and Infection Control", pct2020: 29, pct2025: 31 },
      {
        topic: "Client Consultation and Hair and Skin Analysis",
        pct2020: 13,
        pct2025: 15,
        previousName: "Hair, Scalp, and Skin Analysis",
      },
      { topic: "Hairstyling", pct2020: 5, pct2025: 5 },
      { topic: "Haircutting", pct2020: 9, pct2025: 8 },
      { topic: "Haircoloring", pct2020: 0, pct2025: 7, previousName: "included in Chemical Services" },
      {
        topic: "Chemical Texture Services",
        pct2020: 18,
        pct2025: 7,
        previousName: "Chemical Services",
      },
      { topic: "Skin Care", pct2020: 2, pct2025: 5 },
      { topic: "Shaving", pct2020: 24, pct2025: 22 },
    ],
  },
  {
    license: "Cosmetologist",
    slug: "cosmetologist",
    questions: 110,
    scored: 100,
    unscored: 10,
    minutes: 120,
    topics: [
      { topic: "Safety and Infection Control", pct2020: 25, pct2025: 30 },
      {
        topic: "Client Consultation and Hair, Skin, and Nail Analysis",
        pct2020: 17,
        pct2025: 19,
        previousName: "Hair, Scalp, Skin, and Nail Analysis",
      },
      { topic: "Hairstyling", pct2020: 6, pct2025: 2 },
      { topic: "Haircutting", pct2020: 12, pct2025: 3 },
      { topic: "Haircoloring", pct2020: 0, pct2025: 10, previousName: "included in Chemical Services" },
      {
        topic: "Chemical Texture Services",
        pct2020: 15,
        pct2025: 12,
        previousName: "Chemical Services",
      },
      { topic: "Skin Care", pct2020: 6, pct2025: 4 },
      { topic: "Eyelash and Eyebrow", pct2020: 0, pct2025: 4 },
      { topic: "Hair Removal", pct2020: 4, pct2025: 8 },
      { topic: "Nail Care", pct2020: 13, pct2025: 8, previousName: "Nails" },
    ],
  },
  {
    license: "Esthetician",
    slug: "esthetician",
    questions: 85,
    scored: 75,
    unscored: 10,
    minutes: 90,
    topics: [
      { topic: "Safety and Infection Control", pct2020: 34, pct2025: 40 },
      { topic: "Client Consultation and Skin Analysis", pct2020: 17, pct2025: 19 },
      { topic: "Skin Care", pct2020: 27, pct2025: 17 },
      { topic: "Makeup", pct2020: 4, pct2025: 3 },
      { topic: "Eyelash and Eyebrow", pct2020: 0, pct2025: 6 },
      { topic: "Hair Removal", pct2020: 13, pct2025: 15 },
    ],
  },
  {
    license: "Nail Technician / Manicurist",
    slug: "nail-technician",
    questions: 65,
    scored: 60,
    unscored: 5,
    minutes: 90,
    topics: [
      { topic: "Safety and Infection Control", pct2020: 38, pct2025: 50 },
      { topic: "Client Consultation and Nail Analysis", pct2020: 13, pct2025: 18 },
      { topic: "Skin Care", pct2020: 0, pct2025: 10 },
      { topic: "Nail Care", pct2020: 49, pct2025: 22, previousName: "Nails" },
    ],
  },
  {
    license: "Electrologist",
    slug: "electrologist",
    questions: 55,
    scored: 50,
    unscored: 5,
    minutes: 90,
    topics: [
      { topic: "Safety and Infection Control", pct2020: 40, pct2025: 36 },
      { topic: "Client Consultation and Hair and Skin Analysis", pct2020: 20, pct2025: 30 },
      {
        topic: "Electrolysis Treatment and Analysis",
        pct2020: 40,
        pct2025: 34,
        previousName: "Analysis and Treatment / Electricity and Equipment",
      },
    ],
  },
];

export const CA_EXAM_EFFECTIVE_DATE = "2026-04-01";
export const CA_EXAM_LETTER_DATE = "2025-11-21";

export function caExam(slug: CaExam["slug"]): CaExam {
  const found = CA_EXAMS_2026.find((e) => e.slug === slug);
  if (!found) throw new Error(`No California exam outline for "${slug}"`);
  return found;
}

/** Topics that moved by at least `minPoints`, biggest move first. */
export function biggestShifts(exam: CaExam, minPoints = 3): CaExamTopic[] {
  return exam.topics
    .filter((t) => Math.abs(t.pct2025 - t.pct2020) >= minPoints)
    .sort((a, b) => Math.abs(b.pct2025 - b.pct2020) - Math.abs(a.pct2025 - a.pct2020));
}

/**
 * Roughly how many scored questions a weighting is worth.
 *
 * A percentage is abstract; "eleven more questions on infection control" is
 * not. PSI weights the outline, so this is the honest reading of what the
 * percentage means — but it is arithmetic on a rounded percentage, so present
 * it as approximate and never as the exam's actual composition.
 */
export function questionsForTopic(exam: CaExam, pct: number): number {
  return Math.round((pct / 100) * exam.scored);
}
