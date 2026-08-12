/**
 * TRIMMING THE GROUNDING CONTEXT BEFORE IT GOES TO THE MODEL.
 *
 * Every chat message ships the whole RAG context as JSON inside the system
 * prompt. Measured against the live database on 2026-08-12 for a single
 * ordinary question ("which Texas barber schools have the best written exam
 * pass rates?"), that came to **57,179 characters — about 14,300 tokens** —
 * and it is re-sent in full on every turn, plus again on any turn where a tool
 * fires and a second generation runs.
 *
 * WHAT WAS ACTUALLY BIG, which was not what anyone guessed:
 *
 *      24,822  search_web_pages_ranked (2 rows)   <- 43% of everything
 *       8,456  search_cosmetologists_ranked (3 rows)
 *       4,564  search_schools_ranked (3 rows)
 *       4,068  search_barbershops_ranked (3 rows)
 *       ...
 *       2,008  exam leaderboard (8 rows)
 *       1,793  school district rankings (15 rows)
 *
 * The leaderboards and the district rankings — the two that look heaviest,
 * because they carry the most rows — are together under 4k and not worth
 * touching. One field is: `raw_text`, the scraped body of an article, at
 * ~9,500 characters PER ROW.
 *
 * THREE RULES, and each earns its place from that measurement:
 *
 * 1. TRUNCATE the scraped bodies. The system prompt already tells the model
 *    raw_text is "for your own reference only and must never appear in your
 *    response", so it is background, not quotable material. A few hundred
 *    characters is enough to know what an article is about.
 *
 * 2. DROP image and gallery URLs. This one is a correctness fix that happens
 *    to save bytes, not the other way round. collectValidLinks() in the chat
 *    route harvests every key ending in "url" into the set of links the model
 *    is allowed to emit — which meant `google_images`, `booksy_photo_url` and
 *    `og_image_url` were all whitelisted link targets, even though the prompt
 *    explicitly warns "this includes Google Places URLs like
 *    places.googleapis.com, which sometimes appear elsewhere in this data as
 *    image sources, not link destinations". Removing them makes that warning
 *    enforceable instead of merely stated.
 *
 * 3. DROP ranking internals. match_score, base_relevance, quality_bonus and
 *    total_matched are how the search RPC sorted its own results. They mean
 *    nothing to the model and it has no rule that mentions them.
 *
 * WHAT IS DELIBERATELY NOT DONE HERE: dropping whole sources based on
 * guessing the question's topic. The model has 15 tools that can fetch any of
 * this on demand, so a missing source degrades to a tool call — but a source
 * dropped by a keyword heuristic that guessed wrong degrades to "I don't know"
 * on a question we could have answered. Field-level trimming is safe in a way
 * that source-level guessing is not, and the measurement says the fields are
 * where the weight actually is.
 *
 * `profile_url` is never touched. It is the entire linking mechanism.
 *
 * Pure — no network, no database.
 */

/** Fields removed outright, wherever they appear at any depth. */
export const DROPPED_FIELDS = new Set([
  // Ranking internals — the RPC's own sort math.
  "match_score",
  "total_matched",
  "base_relevance",
  "quality_bonus",
  "semantic_similarity",
  "token_matches",
  // Image and gallery URLs. Never valid link destinations — see rule 2.
  "google_images",
  "google_photos",
  "booksy_gallery_urls",
  "booksy_photo_url",
  "og_image_url",
  "image_url",
  "photo_url",
]);

/**
 * Fields kept but capped, with the cap in characters.
 *
 * Truncated rather than dropped because each still carries real signal at a
 * fraction of the size — what an article is about, roughly what a stylist
 * charges — and losing it entirely would cost answers we can currently give.
 */
export const TRUNCATED_FIELDS: Record<string, number> = {
  raw_text: 600,
  booksy_services: 400,
  description: 400,
  ai_culture_summary: 300,
  snippet: 300,
};

const TRUNCATION_MARK = "…";

/**
 * Walk any JSON-ish value, applying the rules above.
 *
 * Returns a new structure; the input is never mutated, because the caller also
 * uses the untrimmed objects for other purposes (the ecosystem report is read
 * for its own fields elsewhere).
 */
export function slimContext<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROPPED_FIELDS.has(key)) continue;
      // Null and empty string carry no information but cost 4-10 characters
      // per field per row, across ~17 rows with dozens of columns each. The
      // model cannot tell "absent" from "null" anyway — both mean we don't
      // have it, and every rule in the prompt about missing data says to
      // treat it as not on file.
      if (v === null || v === "") continue;

      const cap = TRUNCATED_FIELDS[key];
      if (cap !== undefined && typeof v === "string" && v.length > cap) {
        out[key] = v.slice(0, cap).trimEnd() + TRUNCATION_MARK;
        continue;
      }
      out[key] = walk(v);
    }
    return out;
  }
  return value;
}

/** Serialized size in characters — what actually reaches the prompt. */
export function contextChars(value: unknown): number {
  return JSON.stringify(value ?? null).length;
}

/**
 * Rough token count for logging and cost display.
 *
 * ~4 characters per token is the usual English approximation and is fine for
 * a size gauge. It is NOT used for billing: the real prompt token count comes
 * back from the API in usageMetadata, and that is what the cost figures use.
 */
export function approxTokens(chars: number): number {
  return Math.round(chars / 4);
}
