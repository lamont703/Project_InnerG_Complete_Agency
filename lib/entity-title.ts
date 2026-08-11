/**
 * Titles for barbershop and salon profile pages.
 *
 * WHY THESE READ "<name> Reviews". Search Console, 28 days to 2026-08-08: 1,172
 * queries containing "review" drew 16,727 impressions and 18 clicks — 0.11% CTR
 * at an average position of 7.6. 1,171 of those 1,172 queries are literally
 * "<business name> reviews". Salons are 55% of the impressions and barbershops
 * 27%, which is why only those two page types use this.
 *
 * The old titles never contained the word. `Salon Rose — Hair & Beauty Salon in
 * Houston` ranks seventh for "salon rose reviews" and does not say "reviews"
 * anywhere, while the rating sits in the meta description where it cannot help
 * someone deciding which result to click.
 *
 * THE RATING GOES IN THE TITLE, not just the description, and only when it is
 * real. A title claiming a rating for a business with none would be worse than
 * the generic one it replaced — so `ratingClause` returns null unless BOTH the
 * score and the review count are present. Coverage is ~100% on both tables, but
 * the guard is what makes that safe to rely on rather than something to check
 * by hand each time the scraper changes.
 *
 * The hiring variant is untouched. A shop advertising open chairs is being
 * searched for by barbers looking for work, not by customers reading reviews,
 * and that title is aimed at the right person already.
 */

/** Google caps the displayed title; this keeps the useful part in front of the cut. */
const MAX = 60;

function ratingClause(rating: unknown, count: unknown): string | null {
  const r = Number(rating);
  const n = Number(count);
  if (!Number.isFinite(r) || r <= 0) return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${r.toFixed(1)}★ (${n.toLocaleString()})`;
}

/**
 * Business names arrive from Google Places and are not clean. `Shine Beauty
 * Supply_Marbach` was rendering verbatim in a title with 3,123 impressions.
 * Underscores become spaces; runs of whitespace collapse.
 */
export function cleanBusinessName(name: string): string {
  return String(name || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export interface EntityTitleInput {
  name: string;
  city?: string | null;
  rating?: unknown;
  reviewCount?: unknown;
  /** "Barbershop" | "Hair & Beauty Salon" — what the business is. */
  kind: string;
  /** When true the page is aimed at barbers seeking a chair, not customers. */
  isHiring?: boolean;
  hiringTitle?: string;
}

/**
 * Built longest-first, then trimmed by dropping the least useful part.
 *
 * Order of value to someone scanning a result list: the business name (they
 * searched it), the word "Reviews" (it is what they asked for), the rating (the
 * answer), then the city and the kind (disambiguation they mostly already have).
 * So the city goes first when the title is too long, and the kind second.
 */
export function entityTitle(input: EntityTitleInput): string {
  if (input.isHiring && input.hiringTitle) return input.hiringTitle;

  const name = cleanBusinessName(input.name);
  const stars = ratingClause(input.rating, input.reviewCount);
  const city = input.city ? String(input.city).trim() : "";

  // Star without the count is the last form that still answers the question.
  // Without this tier a long business name dropped the rating completely, which
  // is backwards: the rating is the payload, the city is the packaging.
  const starOnly = stars ? stars.replace(/\s*\([\d,]+\)$/, "") : null;

  const candidates = [
    [`${name} Reviews`, stars, city ? `${input.kind} in ${city}` : input.kind],
    [`${name} Reviews`, stars, city],
    [`${name} Reviews`, stars],
    [`${name} Reviews`, starOnly],
  ];
  for (const parts of candidates) {
    const t = parts.filter(Boolean).join(" · ");
    if (t.length <= MAX) return t;
  }

  // The name alone already exceeds the budget, so nothing will fit cleanly.
  // Keep the rating anyway — Google truncates by rendered width rather than a
  // character count, and a trimmed tail costs less than omitting the answer.
  return [`${name} Reviews`, starOnly].filter(Boolean).join(" · ");
}
