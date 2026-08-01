import { createAdminClient } from "@/lib/supabase/admin";

/**
 * How a claimed shop or salon compares to the ones around it.
 *
 * The GBP audit scores a profile against absolute standards — it can tell an
 * owner their photos are thin, but not that four shops within two miles have
 * more reviews than they do. That comparison is the thing owners actually ask
 * about, and it's answerable from the directory we already hold rather than
 * from any external rank-tracking service.
 *
 * WHAT THIS IS NOT: a Google ranking. Google's local pack is query-specific and
 * varies with where the searcher is physically standing; a single "you are #4"
 * would be a fiction, and measuring it honestly needs a geo-grid of sample
 * points per keyword. This measures standing among nearby businesses on the
 * signals Google is known to weigh — review volume, rating, profile
 * completeness — and every label in the UI has to keep saying so.
 *
 * Owner-facing only. Published as a public leaderboard it would amount to
 * ranking named small businesses on a formula we invented, in a directory we
 * sell advertising in — which invites the "pay us and your rank improves"
 * accusation whether or not it's true.
 */

/** Below this the cohort is too small for a position to mean anything. */
const MIN_COHORT = 5;

/** Widened until the cohort is big enough — dense metro first, then out. */
const RADIUS_LADDER_MILES = [2, 3, 5, 10, 25];

const MILES_PER_DEG_LAT = 69;

export interface StandingPeer {
  id: string;
  name: string;
  slug: string | null;
  rating: number | null;
  reviews: number;
  distanceMiles: number;
  isYou: boolean;
}

export interface LocalStanding {
  status: "ok";
  radiusMiles: number;
  /** Includes the owner's own listing. */
  cohortSize: number;
  you: StandingPeer;
  /**
   * 1-based, by review count. Always present: a cohort too small to rank
   * returns the "too-few-neighbors" status instead of a null rank, so the two
   * cases can't be confused at the call site.
   */
  reviewRank: number;
  /** Null only when this listing has no rating of its own to place. */
  ratingRank: number | null;
  /** Percentage of the cohort this listing is ahead of on reviews. */
  aheadOfPercent: number;
  leader: StandingPeer | null;
  /** The single listing directly above on reviews — the achievable target. */
  nextUp: StandingPeer | null;
  reviewsToPassNextUp: number | null;
  medianReviews: number;
  medianRating: number | null;
  /** Completeness gaps visible in our own data, worth fixing regardless. */
  missing: { website: boolean; hours: boolean; photos: boolean };
  topPeers: StandingPeer[];
}

export type LocalStandingResult =
  | LocalStanding
  | { status: "no-listing" }
  | { status: "no-location" }
  | { status: "too-few-neighbors"; radiusMiles: number; cohortSize: number }
  | { status: "error"; message: string };

const haversineMiles = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Compare like with like. A salon sitting next to a barbershop isn't competing
 * for the same search, so mixing them would put a listing above or below
 * businesses no customer is choosing between.
 */
const TABLE_FOR = { shop: "agent_barbershop_leads", salon: "agent_salon_leads" } as const;

export async function getLocalStanding(
  entityType: string,
  entityId: string
): Promise<LocalStandingResult> {
  const table = TABLE_FOR[entityType as keyof typeof TABLE_FOR];
  if (!table) return { status: "no-listing" };

  const admin = createAdminClient();

  const { data: me, error: meErr } = await (admin.from(table) as any)
    .select("id, slug, shop_name, latitude, longitude, rating, total_reviews, website, google_hours, google_photos")
    .eq("id", entityId)
    .maybeSingle();

  if (meErr) return { status: "error", message: meErr.message };
  if (!me) return { status: "no-listing" };
  if (me.latitude == null || me.longitude == null) return { status: "no-location" };

  const lat = Number(me.latitude);
  const lng = Number(me.longitude);

  // Widen until there are enough neighbours to say something meaningful. A
  // bounding box does the filtering — there's no index on latitude, and a
  // haversine over every row is slow enough to time out at this table size.
  let rows: any[] = [];
  let radiusMiles = RADIUS_LADDER_MILES[RADIUS_LADDER_MILES.length - 1];

  for (const r of RADIUS_LADDER_MILES) {
    const dLat = r / MILES_PER_DEG_LAT;
    // Longitude degrees shrink toward the poles; without the cos() term the box
    // is far too wide in Texas and pulls in the next city.
    const dLng = r / (MILES_PER_DEG_LAT * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

    const { data, error } = await (admin.from(table) as any)
      .select("id, slug, shop_name, latitude, longitude, rating, total_reviews")
      .gte("latitude", lat - dLat).lte("latitude", lat + dLat)
      .gte("longitude", lng - dLng).lte("longitude", lng + dLng)
      .not("total_reviews", "is", null)
      .limit(500);

    if (error) return { status: "error", message: error.message };

    const within = (data || []).filter(
      (p: any) =>
        p.latitude != null &&
        p.longitude != null &&
        haversineMiles(lat, lng, Number(p.latitude), Number(p.longitude)) <= r
    );

    if (within.length >= MIN_COHORT || r === RADIUS_LADDER_MILES[RADIUS_LADDER_MILES.length - 1]) {
      rows = within;
      radiusMiles = r;
      break;
    }
  }

  const peers: StandingPeer[] = rows.map((p: any) => ({
    id: p.id,
    name: p.shop_name,
    slug: p.slug,
    rating: p.rating != null ? Math.round(Number(p.rating) * 10) / 10 : null,
    reviews: p.total_reviews ?? 0,
    distanceMiles: Math.round(haversineMiles(lat, lng, Number(p.latitude), Number(p.longitude)) * 10) / 10,
    isYou: p.id === entityId,
  }));

  // The owner's own row may be missing coordinates in the peer query or fall
  // outside its own box on a rounding edge — make sure they're always present.
  if (!peers.some((p) => p.isYou)) {
    peers.push({
      id: me.id,
      name: me.shop_name,
      slug: me.slug,
      rating: me.rating != null ? Math.round(Number(me.rating) * 10) / 10 : null,
      reviews: me.total_reviews ?? 0,
      distanceMiles: 0,
      isYou: true,
    });
  }

  const you = peers.find((p) => p.isYou)!;
  const cohortSize = peers.length;

  const missing = {
    website: !me.website,
    hours: !me.google_hours,
    photos: !me.google_photos,
  };

  if (cohortSize < MIN_COHORT) {
    return { status: "too-few-neighbors", radiusMiles, cohortSize };
  }

  const byReviews = [...peers].sort((a, b) => b.reviews - a.reviews);
  const byRating = [...peers].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));

  const reviewRank = byReviews.findIndex((p) => p.isYou) + 1;
  const ratingRank = you.rating == null ? null : byRating.findIndex((p) => p.isYou) + 1;
  const nextUp = reviewRank > 1 ? byReviews[reviewRank - 2] : null;

  return {
    status: "ok",
    radiusMiles,
    cohortSize,
    you,
    reviewRank,
    ratingRank,
    aheadOfPercent: Math.round(((cohortSize - reviewRank) / (cohortSize - 1)) * 100),
    leader: byReviews[0]?.isYou ? null : byReviews[0] ?? null,
    nextUp,
    reviewsToPassNextUp: nextUp ? Math.max(1, nextUp.reviews - you.reviews + 1) : null,
    medianReviews: median(peers.map((p) => p.reviews)),
    medianRating: (() => {
      const r = peers.map((p) => p.rating).filter((x): x is number => x != null);
      return r.length ? Math.round(median(r.map((x) => x * 10)) / 10 * 10) / 10 : null;
    })(),
    missing,
    topPeers: byReviews.slice(0, 5),
  };
}
