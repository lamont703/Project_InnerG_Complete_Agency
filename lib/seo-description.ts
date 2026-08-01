/**
 * Meta descriptions for the ~8,900 template-generated entity pages.
 *
 * Bing flagged these as "too short", which is true but not the interesting
 * part: the templates were topping out near 96 characters even when rating and
 * review count were present, and the school template didn't include the
 * school's name at all — so every cosmetology school in a city shared one
 * description. Non-unique is a real problem in a way that short alone isn't.
 *
 * The rule here is that length must come from FACTS, never from filler. A
 * description padded to 155 characters with "View photos, hours, and contact
 * details" is the same empty snippet, only longer, and search engines rewrite
 * those anyway. Callers pass their most differentiating data first — pass
 * rates, booth rent, chairs open — and a short description on a genuinely
 * sparse record is the honest outcome.
 */

/** Google truncates around here; past it the tail is wasted. */
export const DESCRIPTION_MAX = 160;

/** Below this Bing complains, and the snippet usually is thin. */
export const DESCRIPTION_TARGET = 150;

/**
 * Join clauses into a sentence-cased description, clipped to a whole word.
 * Falsy clauses drop out, so callers can inline conditionals without building
 * an intermediate array.
 */
export function composeDescription(
  clauses: (string | null | undefined | false)[],
  max: number = DESCRIPTION_MAX
): string {
  const text = clauses
    .filter((c): c is string => Boolean(c && String(c).trim()))
    .map((c) => c.trim().replace(/[.\s]+$/, ""))
    .join(". ")
    .replace(/\s{2,}/g, " ");

  if (!text) return "";
  const withStop = /[.!?]$/.test(text) ? text : `${text}.`;
  if (withStop.length <= max) return withStop;

  // Clip on a word boundary rather than mid-word, and drop any dangling
  // punctuation the cut leaves behind.
  const clipped = withStop.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.—-]+$/, "")}.`;
}

/** "4.6★ (551 reviews)" — one clause, so a missing rating can't strand "(551 reviews)". */
export function ratingClause(rating: unknown, reviews: unknown): string | null {
  const r = rating != null && rating !== "" ? Number(rating) : null;
  const n = reviews != null && reviews !== "" ? Number(reviews) : null;
  if (r == null || Number.isNaN(r)) {
    return n && n > 0 ? `${n.toLocaleString()} Google review${n === 1 ? "" : "s"}` : null;
  }
  const stars = `Rated ${r.toFixed(1)}★`;
  return n && n > 0 ? `${stars} from ${n.toLocaleString()} Google review${n === 1 ? "" : "s"}` : stars;
}

/**
 * The street part of a formatted address, without repeating the city that the
 * caller has already used. Gives a sparse record something concrete and unique
 * to say instead of a generic tail.
 */
export function streetClause(formattedAddress: unknown, city?: unknown): string | null {
  if (!formattedAddress) return null;
  const first = String(formattedAddress).split(",")[0]?.trim();
  if (!first || first.length < 4) return null;
  if (city && first.toLowerCase() === String(city).toLowerCase()) return null;
  return first;
}

/** 0-1 or 0-100 both appear in these columns; normalize before display. */
export function percentClause(value: unknown, label: string, takers?: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = Number(value);
  if (Number.isNaN(raw)) return null;
  const pct = Math.round(raw <= 1 ? raw * 100 : raw);
  if (pct < 0 || pct > 100) return null;
  const n = takers != null && takers !== "" ? Number(takers) : null;
  return n && n > 0 ? `${label} ${pct}% (${n} tested)` : `${label} ${pct}%`;
}
