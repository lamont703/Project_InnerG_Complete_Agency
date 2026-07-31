import type { Category } from "@/lib/gbp-services";

/**
 * Choosing additional categories.
 *
 * The last audit item, and the one where doing more is not better. Google's own
 * guidance is that a category describes what a business IS, not everything it
 * sells or does — and a listing carrying categories that don't fit dilutes the
 * relevance signal deciding which searches it's eligible for. The agency's own
 * listing carries "Software company" alongside Barber shop, which is the exact
 * shape of the problem.
 *
 * Two jobs here, both pure:
 *
 *  1. Make Google's search usable. Its filter is a loose match — searching
 *     "hair" returns Bar, Choir and Dairy alongside Hair salon — so results
 *     have to be ranked before an owner sees them, or the useful answer is
 *     buried under noise.
 *  2. Say when a category looks out of place, as a question rather than a rule.
 *     Some businesses genuinely are two things.
 */

export interface CategorySearchResult extends Category {
  /** Higher is a better match for what was typed. */
  score: number;
}

/**
 * Words that mark a category as belonging to this trade.
 *
 * Used only to ask a question, never to block. A shop that is genuinely also a
 * coffee bar should be able to say so.
 */
const TRADE_TERMS = [
  "barber", "salon", "hair", "beauty", "cosmet", "nail", "manicure", "pedicure",
  "spa", "wig", "loctician", "braid", "weave", "extension", "skin", "esthetic",
  "lash", "eyebrow", "makeup", "make-up", "waxing", "tanning", "massage",
  "grooming", "stylist", "school", "supply", "day spa", "tattoo", "piercing",
];

export function looksOnTrade(displayName: string): boolean {
  const n = displayName.toLowerCase();
  return TRADE_TERMS.some((t) => n.includes(t));
}

/**
 * Rank Google's results against what was typed.
 *
 * Exact match first, then name-starts-with, then a match on a word boundary,
 * then anything else. Results that don't contain the query at all are dropped —
 * they're the Bar-for-hair noise, and showing them makes the picker feel broken.
 */
export function rankCategoryResults(query: string, results: Category[]): CategorySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: CategorySearchResult[] = [];
  for (const c of results) {
    const name = (c.displayName || "").toLowerCase();
    if (!name.includes(q)) continue;

    let score = 1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 50;
    else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) score = 25;

    // A trade-relevant result is more likely to be what a salon owner meant.
    if (looksOnTrade(c.displayName)) score += 10;

    scored.push({ ...c, score });
  }

  return scored.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
}

export interface CategoryAdvice {
  level: "warning" | "info";
  message: string;
}

/**
 * Advice on the current set.
 *
 * Deliberately advice. Blocking an owner from describing their own business
 * would be worse than the dilution it prevents, and we don't know their
 * business better than they do.
 */
export function assessCategories(primary: Category | null, additional: Category[]): CategoryAdvice[] {
  const advice: CategoryAdvice[] = [];

  const offTrade = additional.filter((c) => !looksOnTrade(c.displayName));
  if (offTrade.length) {
    advice.push({
      level: "warning",
      message:
        offTrade.length === 1
          ? `"${offTrade[0].displayName}" doesn't look like part of a ${primary?.displayName?.toLowerCase() || "beauty"} business. If it isn't what you are, removing it sharpens what Google shows you for.`
          : `${offTrade.map((c) => `"${c.displayName}"`).join(", ")} don't look like part of this business. If they aren't what you are, removing them sharpens what Google shows you for.`,
    });
  }

  if (additional.length >= 7) {
    advice.push({
      level: "warning",
      message: `${additional.length} additional categories is a lot. Each one you add that isn't really what you are makes the others count for less.`,
    });
  } else if (additional.length === 0) {
    advice.push({
      level: "info",
      message: "No additional categories. If you genuinely offer something beyond your main category — locs, wigs, skin care — adding it widens the searches you can appear in.",
    });
  }

  return advice;
}

/** Categories a beauty business commonly qualifies for, as starting points. */
export const SUGGESTED_SEARCHES = [
  "barber", "hair salon", "beauty salon", "loctician", "hair extension",
  "wig", "nail salon", "eyelash", "skin care", "braiding",
];
