/**
 * Pure routing decisions for the school call product.
 *
 * Nothing here touches the network or the database, because every one of these
 * decisions is either spoken to a stranger or used to bill somebody, and both
 * need to be testable without placing a call.
 */

export type DepartmentIntent = "admissions" | "financial_aid" | "education";
export type MatchConfidence = "confident" | "guess" | "fallback";

export interface SchoolRoute {
  id: string;
  schoolType: "barber" | "cosmetology";
  schoolName: string;
  greetingName: string;
  destinationNumber: string;
  mainNumber: string;
  voiceMatchPhrases: string[];
  departmentLabels: Record<string, string>;
}

/**
 * Silence before the whisper starts.
 *
 * Two seconds, because one was not enough: on the first live test the message
 * had already started before the phone reached the tester's ear, and half of
 * it was lost. A person answers, then moves the handset — that motion is the
 * thing this covers.
 *
 * It is not free. The student sits on a connected line in silence for this
 * long plus the message, so raising it further trades one party's comprehension
 * against the other's patience. Tune from real calls, not from taste.
 */
export const WHISPER_LEAD_PAUSE_SECONDS = 2;

/** Answered calls shorter than this are not leads, they are wrong numbers. */
export const MIN_BILLABLE_SECONDS = 90;

const PROGRAM_WORD: Record<SchoolRoute["schoolType"], string> = {
  barber: "barber program",
  cosmetology: "cosmetology program",
};

/**
 * Keyword intent classification — deliberately NOT a model call.
 *
 * Three buckets do not need a language model, and a model does need a network
 * round trip in the middle of a live call, which the caller hears as dead air.
 * An unmatched call is not a failure: intent is simply omitted from the whisper
 * and the school still learns who sent the caller. Add a model only if the miss
 * rate on real transcripts justifies the latency.
 */
const INTENT_KEYWORDS: Array<[DepartmentIntent, RegExp]> = [
  [
    "financial_aid",
    /\b(financial aid|financial|fafsa|pell|grant|loan|scholarship|tuition|cost|costs|price|pricing|pay|payment|afford|deposit)\b/i,
  ],
  [
    "education",
    /\b(class|classes|schedule|instructor|teacher|hours|transcript|graduat|current student|already (a )?student|attend(ing)?|kit|exam|test)\b/i,
  ],
  [
    "admissions",
    /\b(enroll|enrolling|enrollment|admission|admissions|apply|application|sign up|signing up|start|starting|tour|visit|information|info|interested|register)\b/i,
  ],
];

export function classifyIntent(transcript: string | null | undefined): DepartmentIntent | null {
  if (!transcript) return null;
  for (const [intent, re] of INTENT_KEYWORDS) {
    if (re.test(transcript)) return intent;
  }
  return null;
}

export interface SchoolMatch {
  route: SchoolRoute | null;
  matchedBy: MatchConfidence;
  matchedPhrase: string | null;
}

/**
 * Which school did they ask for?
 *
 * Longest phrase wins, so "houston barber school" beats a bare "houston" when
 * both are on file. A single-word hit is downgraded to a guess rather than
 * rejected — the caller still reaches a school, but billing can choose not to
 * charge for a call we are only fairly sure about.
 */
export function matchSchool(transcript: string | null | undefined, routes: SchoolRoute[]): SchoolMatch {
  const text = (transcript || "").toLowerCase();
  if (!text.trim()) return { route: null, matchedBy: "fallback", matchedPhrase: null };

  let best: { route: SchoolRoute; phrase: string } | null = null;
  for (const route of routes) {
    for (const phrase of route.voiceMatchPhrases) {
      const p = phrase.toLowerCase().trim();
      if (!p || !text.includes(p)) continue;
      if (!best || p.length > best.phrase.length) best = { route, phrase: p };
    }
  }
  if (!best) return { route: null, matchedBy: "fallback", matchedPhrase: null };
  const multiWord = best.phrase.split(/\s+/).length > 1;
  return {
    route: best.route,
    matchedBy: multiWord ? "confident" : "guess",
    matchedPhrase: best.phrase,
  };
}

/**
 * What the school hears before the caller is bridged in.
 *
 * Short on purpose. Every word is silence on the student's end, and the school
 * only needs two facts: who sent this, and what it is about.
 */
export function buildWhisper(route: SchoolRoute, intent: DepartmentIntent | null): string {
  const parts = ["Shear Query lead."];
  if (intent) {
    const label = route.departmentLabels?.[intent] || intent.replace(/_/g, " ");
    parts.push(`${sentence(label)}.`);
  }
  parts.push(`${sentence(PROGRAM_WORD[route.schoolType])}.`);
  return parts.join(" ");
}

function sentence(value: string): string {
  const v = value.trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export interface BillableInput {
  answered: boolean;
  durationSeconds: number | null;
  matchedBy: MatchConfidence;
}

/**
 * A call we can put on an invoice.
 *
 * Three conditions, and the third is the one a school would argue about: with a
 * single shared number the school is inferred from what the agent heard, so a
 * one-word guess is not something to charge for. Being conservative here is
 * cheaper than a billing dispute.
 */
export function isBillable(input: BillableInput): boolean {
  if (!input.answered) return false;
  if (input.matchedBy !== "confident") return false;
  return (input.durationSeconds ?? 0) >= MIN_BILLABLE_SECONDS;
}
