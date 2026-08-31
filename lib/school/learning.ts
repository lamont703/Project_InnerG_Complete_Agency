/**
 * Self-paced distance learning: what a student did, and how well it is evidenced.
 *
 * PURE. No database, no React, no clock of its own. Everything it needs arrives
 * as an argument, for the same reason lib/school/hours.ts works that way — the
 * numbers here end up in front of a regulator, and a function that reads a
 * clock or a table cannot be tested against the awkward cases.
 *
 * THE ONE IDEA WORTH READING BEFORE THE CODE. A distance hour has two different
 * measurements and this module never merges them:
 *
 *   CLOCKED minutes  — the punch. How long the session was open.
 *   ENGAGED minutes  — distinct minutes in which the lesson page reported
 *                      somebody actually there.
 *
 * A student who clocks in and walks away has three clocked hours and twelve
 * engaged minutes. Averaging those, or quietly reporting the smaller one as the
 * hour total, would both be wrong: the punch is the record and stays the
 * record, and the engagement is the evidence sitting next to it. An instructor
 * signing off gets to see both and decide.
 */

export interface LessonSection {
  id: string;
  position: number;
  title: string;
  hasQuestion: boolean;
}

export interface SectionProgress {
  sectionId: string;
  punchId: string | null;
  completedAt: string;
  answerIndex: number | null;
  correct: boolean | null;
}

/**
 * The share of a session that must show engagement before this school treats
 * the session as self-evidencing.
 *
 * THIS NUMBER IS OURS, NOT A REGULATOR'S, and that distinction matters more
 * than the value. NACCAS VI.02 element 1 requires participation that is
 * "measurable" and instructor-validated; it sets no percentage, and neither
 * does 16 TAC §83.202. Anyone who reads 0.6 here as a compliance threshold has
 * been misled, so it is named for what it is: a school policy, set so that the
 * sign-off queue can sort the obvious from the questionable, and adjustable
 * without anybody thinking a rule changed.
 *
 * Deliberately not enforced anywhere. It colors a badge and orders a queue. It
 * does not refuse a punch, void an hour, or block a signature — a low ratio is
 * a reason for an instructor to look, not a verdict the system is entitled to
 * reach on its own.
 */
export const ENGAGEMENT_FLOOR = 0.6;

/** A short session is short for innocent reasons; the ratio is noise below this. */
export const MIN_MINUTES_FOR_RATIO = 10;

export type EvidenceGrade = "supported" | "thin" | "no-coursework" | "too-short";

export interface Participation {
  clockedMinutes: number;
  engagedMinutes: number;
  /** null when the session is too short for the ratio to mean anything. */
  engagementRatio: number | null;
  sectionsCompleted: number;
  sectionsTotal: number;
  checksAnswered: number;
  checksCorrect: number;
  grade: EvidenceGrade;
}

/**
 * Count distinct engaged minutes.
 *
 * DEDUPES, because the database key already does and this must agree with it.
 * A client sending the same heartbeat repeatedly, or two tabs sending their
 * own, must not be able to produce more engaged minutes than the wall clock
 * contains.
 *
 * CLAMPED TO THE SESSION LENGTH. Engagement can never exceed the punch it
 * belongs to; if it appears to, something is wrong upstream and reporting an
 * impossible figure would hide it. Clamping keeps the ratio interpretable and
 * the discrepancy still shows as a perfect 1.0 on a session worth a look.
 */
export function engagedMinutes(minuteStamps: string[], clockedMinutes: number): number {
  const distinct = new Set(minuteStamps.map((s) => new Date(s).toISOString().slice(0, 16)));
  return Math.min(distinct.size, Math.max(0, clockedMinutes));
}

/**
 * Everything an instructor needs to decide whether a session happened.
 *
 * GRADES, BUT DOES NOT JUDGE. The grade orders a queue and colors a badge. The
 * four values are deliberately descriptive rather than approving: "thin" says
 * what was measured, not that the student did anything wrong, because the
 * commonest cause of a thin session is a student reading a printed handout with
 * the tab open.
 */
export function participation(args: {
  clockedMinutes: number;
  minuteStamps: string[];
  sections: LessonSection[];
  progress: SectionProgress[];
  /** Only progress recorded during THIS punch counts toward this session. */
  punchId: string;
}): Participation {
  const clocked = Math.max(0, Math.round(args.clockedMinutes));
  const engaged = engagedMinutes(args.minuteStamps, clocked);

  const mine = args.progress.filter((p) => p.punchId === args.punchId);
  const answered = mine.filter((p) => p.answerIndex !== null);

  const ratio = clocked >= MIN_MINUTES_FOR_RATIO ? engaged / clocked : null;

  let grade: EvidenceGrade;
  if (clocked < MIN_MINUTES_FOR_RATIO) grade = "too-short";
  else if (mine.length === 0) grade = "no-coursework";
  else if (ratio !== null && ratio >= ENGAGEMENT_FLOOR) grade = "supported";
  else grade = "thin";

  return {
    clockedMinutes: clocked,
    engagedMinutes: engaged,
    engagementRatio: ratio,
    sectionsCompleted: mine.length,
    sectionsTotal: args.sections.length,
    checksAnswered: answered.length,
    checksCorrect: answered.filter((p) => p.correct === true).length,
    grade,
  };
}

export interface LessonStanding {
  sectionsTotal: number;
  sectionsCompleted: number;
  /** The next section to open — null when the lesson is finished. */
  nextSectionId: string | null;
  complete: boolean;
  checksAnswered: number;
  checksCorrect: number;
}

/**
 * Where a student is in one lesson, across every session they have spent on it.
 *
 * NOT SCOPED TO A PUNCH, unlike participation() above. A self-paced lesson is
 * meant to be picked up over several evenings, so progress accumulates across
 * sessions even though the evidence for any single hour does not.
 *
 * THE NEXT SECTION IS THE FIRST INCOMPLETE ONE IN ORDER, not the first one
 * after the highest completed. Sections completed out of order — which happens
 * when a student goes back — must not strand the ones skipped in between.
 */
export function lessonStanding(
  sections: LessonSection[],
  progress: SectionProgress[]
): LessonStanding {
  const done = new Set(progress.map((p) => p.sectionId));
  const ordered = [...sections].sort((a, b) => a.position - b.position);
  const next = ordered.find((s) => !done.has(s.id)) ?? null;
  const answered = progress.filter((p) => p.answerIndex !== null);

  return {
    sectionsTotal: sections.length,
    sectionsCompleted: ordered.filter((s) => done.has(s.id)).length,
    nextSectionId: next?.id ?? null,
    complete: sections.length > 0 && next === null,
    checksAnswered: answered.length,
    checksCorrect: answered.filter((p) => p.correct === true).length,
  };
}
