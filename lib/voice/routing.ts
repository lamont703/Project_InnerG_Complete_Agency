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
  /** This school's own inbound number, when it has one. */
  trackingNumber: string | null;
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

/**
 * Which school did they dial?
 *
 * The whole point of per-school numbers: the answer arrives with the call, so
 * the first question can be about the department rather than "who are you
 * trying to reach". Returns null for the shared number, which is not a failure
 * — it just means we have to ask.
 */
export function resolveSchoolByDialedNumber(
  dialed: string | null | undefined,
  routes: SchoolRoute[],
): SchoolRoute | null {
  const n = normaliseNumber(dialed);
  if (!n) return null;
  return routes.find((r) => normaliseNumber(r.trackingNumber) === n) || null;
}

/** Digits only, so +1832… and 1832… and (832)… all compare equal. */
function normaliseNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/**
 * What the caller hears before the phone starts ringing.
 *
 * Said out loud on purpose: a caller who is told where they are going will wait
 * through the ring, and one who is not assumes the call dropped. It also gives
 * them a chance to notice we got it wrong while correcting it is still cheap.
 */
export function confirmationLine(route: SchoolRoute, intent: DepartmentIntent | null): string {
  const where = intent
    ? route.departmentLabels?.[intent] || intent.replace(/_/g, " ")
    : "the front desk";
  return `Got it. Connecting you to ${where} at ${route.greetingName}. One moment.`;
}

/** The three departments, in the order the prompt should offer them. */
export const DEPARTMENT_PROMPT_ORDER: DepartmentIntent[] = [
  "admissions",
  "financial_aid",
  "education",
];

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
 * A SENTENCE, not a label. The earlier version fired fragments — "Shear Query
 * lead. Financial aid. Barber program." — which is dense to parse in the two
 * seconds somebody has between picking up and speaking. A person answering a
 * phone is listening for meaning, not scanning a field list.
 *
 * The callback number is appended rather than replaced because on the web
 * callback the school sees OUR number: Twilio will not present a caller ID for
 * a number we do not own. Without this line they have no way to ring the
 * student back, so it stays even though it lengthens the whisper.
 */
export function buildWhisper(
  route: SchoolRoute,
  intent: DepartmentIntent | null,
  callbackNumber?: string | null,
): string {
  const label = intent ? route.departmentLabels?.[intent] || intent.replace(/_/g, " ") : null;
  const opening = label
    ? `I have a student calling for ${label}.`
    : `I have a student calling.`;
  const parts = [opening, "Connecting you now from ShearQuery."];
  if (callbackNumber) parts.push(`Callback number, ${spellNumber(callbackNumber)}.`);
  return parts.join(" ");
}

/**
 * "+17705551234" -> "7 7 0. 5 5 5. 1 2 3 4"
 *
 * Digit by digit with pauses. Text-to-speech reads a run of digits as a
 * quantity — "seven billion seven hundred..." — which is unusable to somebody
 * trying to write a number down.
 */
export function spellNumber(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (n.length !== 10) return n.split("").join(" ");
  return `${n.slice(0, 3).split("").join(" ")}. ${n.slice(3, 6).split("").join(" ")}. ${n.slice(6).split("").join(" ")}`;
}

/** US/Canada E.164, or null. Guards a public endpoint that spends money. */
export function normaliseUsPhone(input: string | null | undefined): string | null {
  const d = (input || "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

function sentence(value: string): string {
  const v = value.trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export interface BillableInput {
  answered: boolean;
  /**
   * Duration of the leg to the SCHOOL, not of the inbound call.
   *
   * The inbound leg is answered at the greeting now that a prompt runs before
   * the dial, so its duration carries the agent conversation and the ringing —
   * twenty to thirty seconds nobody should be charged for. Only the dialled leg
   * measures time a human at the school actually spent on the phone.
   */
  dialDurationSeconds: number | null;
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
  return (input.dialDurationSeconds ?? 0) >= MIN_BILLABLE_SECONDS;
}
