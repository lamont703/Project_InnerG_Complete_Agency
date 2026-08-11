/**
 * The shortlist: what a customer saved while deciding where to book.
 *
 * SHAPE OF THE PROBLEM. 16,727 impressions in 28 days for "<business name>
 * reviews", 82% of them salons and barbershops, at 0.11% CTR. Those searchers
 * are pre-visit and comparing — the honest answer to "is this salon good?" is
 * "good compared to what?", and comparing is the one thing a directory can do
 * that a single Google listing cannot.
 *
 * WHAT IS AND IS NOT COMPARABLE HERE. Measured against the live tables on
 * 2026-08-11, so the columns are chosen from what exists rather than from what
 * a comparison table usually shows:
 *
 *      rating           barbershops 100%   salons  99%
 *      total_reviews                100%           100%
 *      latitude/lng                  94%            95%
 *      photos                       100%           100%
 *      google_category               92%            91%
 *      ---------------------------------------------------
 *      hours          1 row of 2,541      0 rows of 2,672
 *      price          no such column on either table
 *      services       no such column; booksy_services is on the BARBERS table
 *
 * So the comparison is rating, review count, distance, photo and category. An
 * earlier draft of this feature listed price band and opening hours. Both would
 * have rendered as empty columns on every row — worse than absent, because an
 * empty column reads as "this business didn't say" rather than "we don't know".
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ShortlistEntityType = "shop" | "salon";

/** What the browser stores. Deliberately small — it goes in localStorage. */
export interface ShortlistItem {
  entityType: ShortlistEntityType;
  slug: string;
  name: string;
  addedAt: string;
}

/** What the compare view renders. Re-read live, never from the stored copy. */
export interface ComparisonRow {
  entityType: ShortlistEntityType;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  photo: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  /** Miles from the first item that has coordinates; null when unknowable. */
  distanceMiles?: number | null;
}

const TABLE: Record<ShortlistEntityType, string> = {
  shop: "agent_barbershop_leads",
  salon: "agent_salon_leads",
};

export const MAX_ITEMS = 8;

/**
 * The services offered as answers to "what are you booking?".
 *
 * WE CANNOT FILTER BY THESE YET and the UI must not imply that we can. There is
 * no service-level column on either table; this list exists to find out which
 * services people are actually shopping for, so the data worth acquiring can be
 * ranked by demand instead of guessed at.
 *
 * Split by entity type because the answer set genuinely differs — nobody books
 * a silk press at a barbershop, and offering it would produce noise rather than
 * signal.
 */
export const SERVICE_OPTIONS: Record<ShortlistEntityType, string[]> = {
  shop: ["Fade / taper", "Beard trim", "Line-up", "Kids cut", "Hot towel shave", "Locs / twists"],
  salon: ["Color / balayage", "Silk press", "Braids", "Locs / twists", "Extensions", "Nails", "Blowout", "Cut / style"],
};

/** Great-circle distance in miles. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * A share token. Unguessable rather than sequential, because a shortlist row
 * can carry an email address and enumerable tokens would expose every saved
 * list to anyone who can count.
 */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SELECT =
  "id, slug, shop_name, city, formatted_address, rating, total_reviews, google_category, google_images, shop_image_url, phone, website, latitude, longitude";

/**
 * Hydrate stored items into comparable rows.
 *
 * Reads live rather than trusting what was stored: a rating changes, and a
 * comparison built from a month-old snapshot is worse than no comparison. The
 * stored name survives only as a fallback for a listing that has since been
 * removed, so a shared link never renders a blank row.
 */
export async function hydrateShortlist(
  supabase: SupabaseClient,
  items: ShortlistItem[],
): Promise<ComparisonRow[]> {
  const wanted = items.slice(0, MAX_ITEMS);
  const bySlug = new Map<string, ShortlistItem>();
  for (const i of wanted) bySlug.set(`${i.entityType}:${i.slug}`, i);

  const rows: ComparisonRow[] = [];
  for (const type of ["shop", "salon"] as ShortlistEntityType[]) {
    const slugs = wanted.filter((i) => i.entityType === type).map((i) => i.slug);
    if (slugs.length === 0) continue;
    const { data } = await supabase.from(TABLE[type]).select(SELECT).in("slug", slugs);
    for (const r of (data as Record<string, unknown>[]) || []) {
      const images = Array.isArray(r.google_images) ? (r.google_images as string[]) : [];
      rows.push({
        entityType: type,
        slug: String(r.slug),
        name: String(r.shop_name || bySlug.get(`${type}:${r.slug}`)?.name || ""),
        city: (r.city as string) ?? null,
        address: (r.formatted_address as string) ?? null,
        rating: r.rating != null ? Number(r.rating) : null,
        reviewCount: r.total_reviews != null ? Number(r.total_reviews) : null,
        category: (r.google_category as string) ?? null,
        photo: images[0] || (r.shop_image_url as string) || null,
        phone: (r.phone as string) ?? null,
        website: (r.website as string) ?? null,
        lat: r.latitude != null ? Number(r.latitude) : null,
        lng: r.longitude != null ? Number(r.longitude) : null,
      });
    }
  }

  // Preserve the order the visitor added them in. A comparison that reshuffles
  // itself between visits is hard to trust.
  const order = new Map(wanted.map((i, n) => [`${i.entityType}:${i.slug}`, n]));
  rows.sort((a, b) => (order.get(`${a.entityType}:${a.slug}`) ?? 0) - (order.get(`${b.entityType}:${b.slug}`) ?? 0));

  // Distances are relative to the first row with coordinates — "how far apart
  // are these" is the question someone comparing three shops is asking, and it
  // needs no location permission.
  const anchor = rows.find((r) => r.lat != null && r.lng != null);
  if (anchor) {
    for (const r of rows) {
      r.distanceMiles =
        r.lat != null && r.lng != null
          ? Number(milesBetween({ lat: anchor.lat!, lng: anchor.lng! }, { lat: r.lat, lng: r.lng }).toFixed(1))
          : null;
    }
  }
  return rows;
}

export type SortKey = "added" | "rating" | "reviews" | "distance";

/**
 * Sorting IS idea 2, reduced to what the data supports.
 *
 * "Highest rated" is not a useful sort on its own — a 5.0 from three people
 * outranks a 4.7 from nine hundred, which is the opposite of what someone
 * comparing salons means. So the rating sort requires a floor of reviews before
 * a rating counts, and rows below it fall to the bottom rather than being
 * hidden.
 */
export const MIN_REVIEWS_FOR_RATING_SORT = 10;

export function sortRows(rows: ComparisonRow[], key: SortKey): ComparisonRow[] {
  const out = [...rows];
  if (key === "rating") {
    out.sort((a, b) => {
      const qa = (a.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING_SORT ? (a.rating ?? 0) : -1;
      const qb = (b.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING_SORT ? (b.rating ?? 0) : -1;
      return qb - qa;
    });
  } else if (key === "reviews") {
    out.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  } else if (key === "distance") {
    out.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
  }
  return out;
}

/**
 * Nearby businesses of the same kind, for the "good compared to what?" strip.
 *
 * Same-category only. Offering a nail salon to someone reading a barbershop's
 * reviews is noise, and `google_category` is the one service-ish signal with
 * real coverage (91-92%).
 */
export async function fetchComparables(
  supabase: SupabaseClient,
  entityType: ShortlistEntityType,
  origin: { id: string; lat: number; lng: number; category: string | null },
  limit = 3,
): Promise<ComparisonRow[]> {
  // A bounding box first so the query does not scan the table; ~0.25 degrees of
  // latitude is roughly 17 miles, which is the radius the nearby sections use.
  const d = 0.25;
  let q = supabase
    .from(TABLE[entityType])
    .select(SELECT)
    .neq("id", origin.id)
    .not("latitude", "is", null)
    .not("rating", "is", null)
    .gte("latitude", origin.lat - d).lte("latitude", origin.lat + d)
    .gte("longitude", origin.lng - d).lte("longitude", origin.lng + d)
    .limit(80);
  if (origin.category) q = q.eq("google_category", origin.category);

  const { data } = await q;
  const rows: ComparisonRow[] = [];
  for (const r of (data as Record<string, unknown>[]) || []) {
    const lat = r.latitude != null ? Number(r.latitude) : null;
    const lng = r.longitude != null ? Number(r.longitude) : null;
    if (lat == null || lng == null) continue;
    const images = Array.isArray(r.google_images) ? (r.google_images as string[]) : [];
    rows.push({
      entityType,
      slug: String(r.slug),
      name: String(r.shop_name || ""),
      city: (r.city as string) ?? null,
      address: (r.formatted_address as string) ?? null,
      rating: r.rating != null ? Number(r.rating) : null,
      reviewCount: r.total_reviews != null ? Number(r.total_reviews) : null,
      category: (r.google_category as string) ?? null,
      photo: images[0] || (r.shop_image_url as string) || null,
      phone: (r.phone as string) ?? null,
      website: (r.website as string) ?? null,
      lat, lng,
      distanceMiles: Number(milesBetween(origin, { lat, lng }).toFixed(1)),
    });
  }

  // Rated by enough people to mean something, nearest-and-best first. Without
  // the review floor this strip fills with 5.0-from-two-people listings, which
  // is exactly the comparison someone is trying to avoid making.
  return rows
    .filter((r) => (r.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING_SORT && (r.distanceMiles ?? 99) <= 15)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);
}
