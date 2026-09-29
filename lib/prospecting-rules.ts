/**
 * The pure half of agency prospecting: why a business is worth pitching, and
 * how prospects rank. Tested in prospecting-rules.test.ts; lib/prospecting.ts
 * reads the directory and runs the live checks.
 *
 * ONLY FIELDS WE ACTUALLY HOLD. Measured 2026-09-29: Instagram handles and
 * (for shops, salons and stores) opening hours are empty on every row — never
 * scraped — so neither is used as a signal. A "missing" that is really our gap
 * would send an agency to pitch a problem the business doesn't have. Website
 * is filled on 30-60% of rows, so its absence is reported as "not in our
 * directory" and flagged to be checked before anyone pitches on it.
 */

export const LIVE_CHECKS_PER_DAY = 5;

/**
 * Live Google checks need the Places API, whose Google Cloud billing isn't
 * set up yet (product owner, 2026-09-29) — calls return 403. Off until
 * PROSPECT_LIVE_CHECKS=on, so agencies aren't offered something that fails.
 */
export const liveChecksEnabled = () => process.env.PROSPECT_LIVE_CHECKS === "on";

export const PROSPECT_TYPES = {
  barbershop: ["shop"],
  salon: ["salon"],
  school: ["barber_school", "cosmetology_school"],
  supply_store: ["barber_store", "beauty_store"],
} as const;
export type ProspectType = keyof typeof PROSPECT_TYPES;

export const NEEDS = ["few_reviews", "low_rating", "stalled_reviews", "no_website"] as const;
export type Need = (typeof NEEDS)[number];

export const PIPELINE_STATUSES = ["to_contact", "contacted", "interested", "invited", "joined", "not_interested"] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];
export const STATUS_LABEL: Record<PipelineStatus, string> = {
  to_contact: "To contact", contacted: "Contacted", interested: "Interested", invited: "Invited", joined: "Joined", not_interested: "Not interested",
};

export interface ProspectRow {
  rating: number | null;
  reviews: number;
  momentum: string | null;
  website: string | null;
  openBooths: number | null;
}

export interface Signal {
  key: Need | "open_booth";
  text: string;
  weight: number;
}

/** Why this business could use help, from what we hold. Positive signals (open booths) add, never alone. */
export function signalsFor(r: ProspectRow, cityMedianReviews: number | null, city: string | null): Signal[] {
  const out: Signal[] = [];
  const floor = Math.max(10, Math.round((cityMedianReviews ?? 20) * 0.5));
  if (r.reviews < floor) {
    out.push({ key: "few_reviews", weight: 3, text: `only ${r.reviews} Google review${r.reviews === 1 ? "" : "s"}${cityMedianReviews ? ` (the typical ${city ? `${city} ` : ""}business has ${cityMedianReviews})` : ""}` });
  }
  if (r.rating != null && r.rating > 0 && r.rating < 4.3) out.push({ key: "low_rating", weight: 3, text: `rated ${r.rating.toFixed(1)}` });
  if (r.momentum && /declin|stagn/i.test(r.momentum)) out.push({ key: "stalled_reviews", weight: 2, text: "new reviews have stalled" });
  if (!r.website) out.push({ key: "no_website", weight: 1, text: "no website in our directory (it may just be missing from our data — check before pitching on it)" });
  if (r.openBooths && r.openBooths > 0) out.push({ key: "open_booth", weight: 1, text: `${r.openBooths} open booth${r.openBooths === 1 ? "" : "s"} — growing, and spending` });
  return out;
}

export const needScore = (signals: Signal[]) => signals.reduce((s, x) => s + x.weight, 0);

/** Worth listing: at least one real need (an open booth alone isn't a reason to pitch), and every requested need present. */
export function qualifies(signals: Signal[], required: Need[] = []): boolean {
  const keys = new Set(signals.map((s) => s.key));
  if (!signals.some((s) => s.key !== "open_booth")) return false;
  return required.every((n) => keys.has(n));
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** "shop:marcus-cuts-houston-1a2b" — how a prospect is named between tools. */
export const prospectRef = (entityType: string, slug: string) => `${entityType}:${slug}`;
export function parseRef(ref: string): { entityType: string; slug: string } | null {
  const m = /^([a-z_]+):([a-z0-9-]+)$/i.exec(String(ref || "").trim());
  return m ? { entityType: m[1], slug: m[2].toLowerCase() } : null;
}
