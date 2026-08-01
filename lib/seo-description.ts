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
  const parts = clauses
    .filter((c): c is string => Boolean(c && String(c).trim()))
    .map((c) => c.trim().replace(/[.\s]+$/, "").replace(/\s{2,}/g, " "));

  if (!parts.length) return "";

  // Whole clauses are dropped from the end rather than the string being cut to
  // length. Character-clipping produced ragged tails on real records \u2014 "TRIM,
  // LINE-UP &." and "2 full face makeup applications, Full." \u2014 because service
  // names and addresses are mid-clause content. A slightly shorter description
  // that ends on a complete thought beats a longer one ending in a conjunction.
  const kept: string[] = [];
  for (const part of parts) {
    const candidate = [...kept, part].join(". ").length + 1; // +1 for the full stop
    if (kept.length && candidate > max) continue;
    kept.push(part);
  }

  // A single opening clause longer than the budget is the one case with nothing
  // to drop \u2014 clip it on a word boundary.
  if (kept.length === 1 && kept[0].length + 1 > max) {
    const clipped = kept[0].slice(0, max - 1);
    const lastSpace = clipped.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.\u2014-]+$/, "")}.`;
  }

  return `${kept.join(". ")}.`;
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

/**
 * The first few service names a professional actually offers, e.g.
 * "Male Haircut, Beard Shaping, Head Shave".
 *
 * This is the most differentiating field on a barber or cosmetologist page and
 * it was going unused: booksy_services is populated on 100% of both tables,
 * while specialty_type — what the old template keyed on — is set on 2 of 1,429
 * barbers, so nearly every description fell back to "Professional Barber".
 *
 * Shape is [{ name, price?, duration? }]. Entries are operator-entered, so
 * names run long and untidy ("Male Haircut ( Without Beard Trimming)") and are
 * length-capped rather than trusted.
 */
export function servicesClause(services: unknown, limit = 3, maxNameLength = 34): string | null {
  if (!Array.isArray(services) || services.length === 0) return null;

  const names: string[] = [];
  for (const entry of services) {
    const raw = typeof entry === "string" ? entry : entry && typeof entry === "object" ? (entry as any).name : null;
    if (!raw) continue;
    const name = String(raw)
      .replace(/\s*\(.*?\)\s*/g, " ")
      // Operator-entered names carry emoji and decorative symbols ("💥 SKIN
      // FADE"), which read as noise in a search snippet.
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, " ")
      // ...and internal full stops, which would otherwise fake a clause break
      // mid-list ("Hot Towel. Hair Wash., TRIM").
      .replace(/\./g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
      .trim();
    if (!name || name.length < 3 || name.length > maxNameLength) continue;
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
    names.push(name);
    if (names.length >= limit) break;
  }
  return names.length ? names.join(", ") : null;
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

/** "USD 15 - 50" / "$$" -> "$15-50". Booksy stores these as free text. */
export function priceClause(raw: unknown): string | null {
  if (!raw) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const nums = t.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return /^\$+$/.test(t) ? t : null;
  return nums.length >= 2 ? `$${nums[0]}-${nums[1]}` : `From $${nums[0]}`;
}

/**
 * metro_area and city values arrive with the ZIP mashed on ("Irving 75038"),
 * which reads as a typo in a snippet.
 */
export function cleanPlace(value: unknown): string | null {
  if (!value) return null;
  const t = String(value).replace(/\s*\d{5}(?:-\d{4})?\s*$/, "").trim();
  return t || null;
}
