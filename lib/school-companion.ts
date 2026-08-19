/**
 * The question a school page hands to the AI companion.
 *
 * WHY THE QUESTION MATTERS MORE THAN THE BUTTON. `?ask=` on
 * /search does not open a chat box — it SENDS. Whatever is
 * seeded here is the first thing the companion says, and therefore the entire
 * demonstration. "Tell me about this school" wastes it: the page they just left
 * already told them about the school.
 *
 * SO THE QUESTION ASKS FOR WHAT THE PAGE CANNOT SHOW. Every clause below is
 * built from a fact this site holds and a school's own website does not — the
 * 2026 TDLR first-attempt pass rate, comparison against nearby schools, what to
 * ask on a tour. If a student could have answered it by scrolling, it is the
 * wrong question.
 *
 * ONE MODEL CALL PER CLICK, AND THAT IS THE COST. This is the same shape as the
 * AI Overview auto-call that was removed for hitting the Gemini free-tier limit
 * (429 RESOURCE_EXHAUSTED). It is worth re-introducing here because it is
 * user-initiated rather than automatic — but school pages draw 877 unique
 * visitors and current total volume is ~260 chat messages, so a 10% click-rate
 * roughly doubles AI usage. Budget for it deliberately.
 *
 * NO MEMBERSHIP PITCH IN THE SEED. The companion has to be useful once before
 * it asks for anything — the same reason the account offer sits after a
 * conversion rather than in front of it. The upsell is the agent's job on a
 * later turn, not the opening line's.
 *
 * Pure — no network, no React. The 300-character cap mirrors the slice() the
 * search page applies to `ask`, so a prompt cannot be silently truncated
 * mid-sentence somewhere else.
 */

/** The search page truncates `ask` at 300 characters. Stay inside it. */
export const MAX_ASK_LENGTH = 300;

export interface SchoolCompanionInput {
  name: string;
  city?: string | null;
  /**
   * 2026 TDLR written pass rate, as a FRACTION (see pct below).
   *
   * The OVERALL rate, not first-attempt, because first-attempt is not in
   * SCHOOL_PUBLIC_COLUMNS — the page never selects it, so reading it here got
   * undefined and silently dropped the number from every prompt. First-attempt
   * is the better figure and publishing it is a deliberate decision about the
   * public column set, not something to smuggle in through a CTA.
   */
  writtenRate?: number | null;
  /** Practical pass rate, same source. */
  practicalRate?: number | null;
  /** "Barber School" / "Cosmetology School" — shapes the licence wording. */
  category?: string | null;
}

/**
 * THESE COLUMNS HOLD FRACTIONS, NOT PERCENTAGES. Every one of the 510 populated
 * values is between 0 and 1 — a school where everyone passes stores 1, not 100.
 * Formatting it naively produced "1.0% pass the written exam first time" for a
 * school with a PERFECT record, which is not a cosmetic bug: it is a false and
 * damaging claim about a real business, seeded into the first thing the AI says.
 *
 * Same defensive rule as percentClause() in lib/seo-description.ts, so the two
 * cannot disagree if the column is ever rescaled: values at or below 1 are
 * fractions, anything above is already a percentage.
 */
const pct = (n: number) => {
  const raw = Number(n);
  const value = raw <= 1 ? raw * 100 : raw;
  return `${Math.round(value)}%`;
};

/**
 * The seeded question, composed from whatever facts exist.
 *
 * Degrades deliberately rather than inventing: a school with no pass-rate data
 * gets a question about comparison and tours, never a question that implies we
 * hold numbers we do not. Claiming a figure we cannot produce would make the
 * companion's first answer an apology.
 */
export function schoolCompanionPrompt(school: SchoolCompanionInput): string {
  const where = school.city ? ` in ${school.city}` : "";
  const rate =
    school.writtenRate != null
      ? ` I can see ${pct(school.writtenRate)} pass the written exam here${
          school.practicalRate != null ? ` and ${pct(school.practicalRate)} pass the practical` : ""
        } —`
      : "";

  // Capitalisation follows the punctuation: the rate clause ends in an em dash
  // ("... and 92% pass the practical — how does that compare"), and without it
  // the sentence ends in a full stop and needs a capital.
  const tail = rate
    ? `${rate} how does that compare to other schools near me, and what should I ask when I tour it?`
    : ` How does that compare to other schools near me, and what should I ask when I tour it?`;

  const q = `I'm looking at ${school.name}${where}.${tail}`;

  // Trim on a word boundary so a long school name never leaves a half word.
  if (q.length <= MAX_ASK_LENGTH) return q;
  const cut = q.slice(0, MAX_ASK_LENGTH);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,\s]+$/, "") + "?";
}

/**
 * The href that drops a student into AI Mode with that question already sent.
 *
 * DELIBERATELY ONLY `ask`. The search page also honours `ecosystemShopId`,
 * which fires its OWN auto-question about market ecosystem, talent pipeline and
 * rent — written for a shop owner. Passing both sends two messages, bills two
 * model calls, and opens with a question aimed at the wrong audience.
 */
export function schoolCompanionHref(school: SchoolCompanionInput): string {
  return `/search?ask=${encodeURIComponent(schoolCompanionPrompt(school))}`;
}
