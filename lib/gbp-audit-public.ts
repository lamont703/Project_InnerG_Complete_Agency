/**
 * Public-tier audit — the free, no-login half of the local SEO service.
 *
 * The full audit (lib/gbp-audit.ts) needs the owner's OAuth, because attributes,
 * search queries and Google's pending edits are only visible to the profile
 * owner. That's a real barrier at the top of a funnel: asking a stranger who
 * clicked "free audit" to create an account and grant Google access before they
 * see anything is the sort of thing that makes people leave.
 *
 * So this tier scores what we already hold in the directory from public sources
 * — photos, reviews, hours, website, phone — and is explicit about what it
 * can't see. The visitor gets a real number about their own business first;
 * connecting Google is what unlocks the rest, asked for after they care.
 *
 * The benchmark is the part no off-the-shelf GBP tool can copy: we hold
 * thousands of businesses in the same trade, so "you have 4 photos, the median
 * shop in your city has 24" is a database query for us and impossible for
 * someone auditing one profile in isolation.
 */

export interface PublicEntityConfig {
  table: string;
  nameField: string;
  /** Schools count reviews in a different column from shops and stores. */
  reviewField: string;
  /** Null where the table has no photo array — schools. Scoring must skip the
   *  photo check entirely there rather than report zero photos, which would be
   *  a false finding about the business rather than a gap in our data. */
  imagesField: string | null;
  /** Singular noun for the UI. */
  label: string;
  /** Public profile route prefix. */
  route: string;
}

export const PUBLIC_ENTITY_TYPES: Record<string, PublicEntityConfig> = {
  shop: {
    table: "agent_barbershop_leads", nameField: "shop_name", reviewField: "total_reviews",
    imagesField: "google_images", label: "barbershop", route: "/shop",
  },
  salon: {
    table: "agent_salon_leads", nameField: "shop_name", reviewField: "total_reviews",
    imagesField: "google_images", label: "salon", route: "/salons",
  },
  barber_school: {
    table: "agent_barber_school_leads", nameField: "school_name", reviewField: "google_review_count",
    imagesField: null, label: "barber school", route: "/schools",
  },
  cosmetology_school: {
    table: "agent_cosmetology_school_leads", nameField: "school_name", reviewField: "google_review_count",
    imagesField: null, label: "cosmetology school", route: "/schools",
  },
  barber_store: {
    table: "agent_barber_supply_store_leads", nameField: "name", reviewField: "total_reviews",
    imagesField: "google_images", label: "barber supply store", route: "/stores",
  },
  beauty_store: {
    table: "agent_beauty_supply_store_leads", nameField: "name", reviewField: "total_reviews",
    imagesField: "google_images", label: "beauty supply store", route: "/stores",
  },
};

export type PublicCheckStatus = "pass" | "warn" | "fail" | "unavailable";

export interface PublicCheck {
  id: string;
  label: string;
  status: PublicCheckStatus;
  detail: string;
  fix?: string;
  weight: number;
  earned: number;
}

export interface LocalBenchmark {
  city: string | null;
  sampleSize: number;
  medianPhotos: number | null;
  medianReviews: number | null;
}

export interface PublicAuditResult {
  score: number;
  /**
   * How much of the full audit this score actually covers.
   *
   * Without this the tier lies by omission: a school with hours, a website, a
   * phone and good reviews scores 100 here while attributes, categories,
   * services, description and search queries — the majority of the real audit —
   * were never looked at. "100" would read as "nothing to fix", which is both
   * false and the opposite of what should happen next. Every surface showing the
   * score must show this alongside it.
   */
  coverage: { visible: number; total: number };
  checks: PublicCheck[];
  /** What this tier structurally cannot see — the reason to connect. */
  locked: { label: string; why: string }[];
  benchmark: LocalBenchmark;
}

/**
 * Everything the free tier can't reach. Stated as capability, not as a teaser:
 * each one is genuinely invisible without the owner's authorisation, and the
 * "why" says so, because a locked list that looks like an upsell reads as one.
 */
export const LOCKED_CHECKS = [
  { label: "Profile attributes", why: "A hair salon has 48 available — including identity attributes customers filter Maps by. Only the owner can see which are set." },
  { label: "Secondary categories", why: "Up to 9, and they widen the searches you're eligible for. Not exposed publicly." },
  { label: "Services", why: "Where locs, silk press, braiding and extensions belong, since Google has no category for them." },
  { label: "Business description", why: "750 characters that most profiles barely use." },
  { label: "The searches that found you", why: "Google records the queries people typed before your listing appeared. Owner-only, and usually the most surprising part of the report." },
  { label: "Review reply rate", why: "Unanswered reviews are visible to every customer comparing shops." },
  { label: "Google's pending edits", why: "Google's own record can quietly diverge from what you set. We read the difference field by field." },
  { label: "Verification standing", why: "Whether Google considers the profile in good standing at all." },
] as const;

const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

export function computeBenchmark(
  peers: { photos: number; reviews: number }[],
  city: string | null
): LocalBenchmark {
  return {
    city,
    sampleSize: peers.length,
    medianPhotos: median(peers.map((p) => p.photos)),
    medianReviews: median(peers.map((p) => p.reviews)),
  };
}

const scaled = (actual: number, target: number, weight: number) =>
  Math.round(Math.min(1, target <= 0 ? 1 : actual / target) * weight * 100) / 100;

export interface PublicEntityFacts {
  photos: number | null; // null when the source has no photo data at all
  reviews: number;
  rating: number | null;
  hasHours: boolean;
  website: string | null;
  phone: string | null;
}

export function buildPublicAudit(
  facts: PublicEntityFacts,
  benchmark: LocalBenchmark
): PublicAuditResult {
  const checks: PublicCheck[] = [];

  // Photos. Benchmarked against local peers where we have enough of them —
  // "fewer than most shops near you" lands harder than an arbitrary target, and
  // it's a claim we can actually support.
  if (facts.photos === null) {
    checks.push({
      id: "photos", label: "Photos", status: "unavailable", weight: 0, earned: 0,
      detail: "We don't hold photo data for this type of listing — connect Google to include it.",
    });
  } else {
    const target = benchmark.medianPhotos && benchmark.sampleSize >= 5
      ? Math.max(10, benchmark.medianPhotos)
      : 10;
    // When a business already matches its local median but both are low, saying
    // only "the median is 5" invites them to dismiss the finding. Name it.
    const med = benchmark.medianPhotos;
    const where = benchmark.city ? `in ${benchmark.city}` : "nearby";
    let vs = "";
    if (med != null && benchmark.sampleSize >= 5) {
      if (facts.photos < med) vs = ` The median ${where} is ${med}, so you're below it.`;
      else if (facts.photos < 10) vs = ` That matches the ${benchmark.city || "local"} median of ${med} — but both are low; 10 or more is where a listing stops looking sparse.`;
      else vs = ` The median ${where} is ${med}.`;
    }
    checks.push({
      id: "photos", label: "Photos", weight: 30, earned: scaled(facts.photos, target, 30),
      status: facts.photos === 0 ? "fail" : facts.photos < target ? "warn" : "pass",
      detail: `${facts.photos} photo${facts.photos === 1 ? "" : "s"} on the public profile.${vs}`,
      fix: facts.photos >= target ? undefined
        : "Add photos — exterior, interior and finished work. It's the highest-effort item and the one customers judge fastest.",
    });
  }

  // Reviews.
  const revTarget = benchmark.medianReviews && benchmark.sampleSize >= 5
    ? Math.max(10, benchmark.medianReviews)
    : 20;
  const revVs = benchmark.medianReviews != null && benchmark.sampleSize >= 5
    ? ` The median ${benchmark.city ? `in ${benchmark.city}` : "nearby"} is ${benchmark.medianReviews}.`
    : "";
  checks.push({
    id: "reviews", label: "Reviews", weight: 25, earned: scaled(facts.reviews, revTarget, 25),
    status: facts.reviews === 0 ? "fail" : facts.reviews < revTarget ? "warn" : "pass",
    detail: `${facts.reviews} review${facts.reviews === 1 ? "" : "s"}${facts.rating ? `, averaging ${facts.rating}` : ""}.${revVs}`,
    fix: facts.reviews >= revTarget ? undefined
      : "Ask every satisfied client. Review count is one of the few ranking inputs you can influence directly.",
  });

  checks.push({
    id: "hours", label: "Opening hours", weight: 15, earned: facts.hasHours ? 15 : 0,
    status: facts.hasHours ? "pass" : "fail",
    detail: facts.hasHours ? "Hours are published." : "No opening hours published.",
    fix: facts.hasHours ? undefined : "Add hours — without them you disappear from “open now” searches.",
  });

  checks.push({
    id: "website", label: "Website link", weight: 15, earned: facts.website ? 15 : 0,
    status: facts.website ? "pass" : "fail",
    detail: facts.website ? "A website is linked." : "No website linked.",
    fix: facts.website ? undefined : "Add a website — without one the listing has nowhere to send traffic.",
  });

  checks.push({
    id: "phone", label: "Phone number", weight: 15, earned: facts.phone ? 15 : 0,
    status: facts.phone ? "pass" : "fail",
    detail: facts.phone ? "A phone number is listed." : "No phone number listed.",
    fix: facts.phone ? undefined : "Add a phone number — calls are the main conversion for this trade.",
  });

  // Unavailable checks are excluded from the denominator, so a school isn't
  // marked down for a column we don't populate.
  const possible = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.earned, 0);

  const visible = checks.filter((c) => c.status !== "unavailable").length;

  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    coverage: { visible, total: visible + LOCKED_CHECKS.length },
    checks,
    locked: [...LOCKED_CHECKS],
    benchmark,
  };
}
