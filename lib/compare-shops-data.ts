import "server-only";
import { createClient } from "@supabase/supabase-js";
import { deriveLocation, normalizeRent, median, fetchAllRows, type RentKind } from "@/lib/compare-entities";

/**
 * Server-side index for /compare-shops.
 *
 * Booth rent is free text, so "cheapest first" can only be computed after a
 * JS parse — Postgres can't sort on it. Shipping all ~5,200 venues to the
 * browser to sort them there cost a 2.2 MB payload, so instead the parsed
 * index is built once per TTL on the server and pages are sliced out of it.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COLUMNS =
  "id, slug, shop_name, formatted_address, city, address_city, address_state, rating, total_reviews, rent_rate, booth_count_available, hiring_need, claimed_at";

const TTL_MS = 60 * 60 * 1000;

export type VenueType = "shop" | "salon";

export interface CompareVenue {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  state: string | null;
  type: VenueType;
  rating: number | null;
  reviews: number | null;
  weeklyRent: number | null;
  rentKind: RentKind;
  commissionLabel: string | null;
  rentRaw: string | null;
  chairs: number | null;
  hiring: boolean;
  claimed: boolean;
}

export interface CityRollup {
  key: string;
  city: string;
  state: string;
  venues: number;
  chairs: number;
  withRent: number;
  medianWeeklyRent: number | null;
}

export interface VenueQuery {
  cityKey?: string;
  type?: VenueType | "all";
  rentOnly?: boolean;
  chairsOnly?: boolean;
  hiringOnly?: boolean;
  search?: string;
  sortField?: "weeklyRent" | "chairs" | "rating" | "reviews" | "name";
  sortDir?: "asc" | "desc";
  page?: number;
}

export interface VenuePage {
  rows: CompareVenue[];
  total: number;
  medianWeeklyRent: number | null;
  page: number;
  totalPages: number;
}

export const PAGE_SIZE = 20;

function mapVenue(row: any, type: VenueType): CompareVenue {
  const { city, state } = deriveLocation(row);
  const rent = normalizeRent(row.rent_rate);
  return {
    id: row.id,
    slug: row.slug,
    name: row.shop_name,
    city,
    state,
    type,
    // Postgres numerics arrive as strings like "4.80000"; round for the wire.
    rating: row.rating != null ? Math.round(Number(row.rating) * 10) / 10 : null,
    reviews: row.total_reviews ?? null,
    weeklyRent: rent.weekly,
    rentKind: rent.kind,
    commissionLabel: rent.commissionLabel,
    rentRaw: rent.raw,
    chairs: row.booth_count_available ?? null,
    hiring: row.hiring_need === true,
    claimed: row.claimed_at != null,
  };
}

interface VenueIndex {
  venues: CompareVenue[];
  cities: CityRollup[];
  totalWithRent: number;
}

let cache: { at: number; value: Promise<VenueIndex> } | null = null;

export function getVenueIndex(): Promise<VenueIndex> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = buildIndex().catch((e) => {
    // Never cache a failure — the next request should retry.
    cache = null;
    throw e;
  });
  cache = { at: Date.now(), value };
  return value;
}

async function buildIndex(): Promise<VenueIndex> {
  const [shops, salons] = await Promise.all([
    fetchAllRows<any>(() => supabase.from("agent_barbershop_leads").select(COLUMNS)),
    fetchAllRows<any>(() => supabase.from("agent_salon_leads").select(COLUMNS)),
  ]);

  const venues = [
    ...shops.map((r) => mapVenue(r, "shop")),
    ...salons.map((r) => mapVenue(r, "salon")),
  ].filter((v) => v.name && v.city);

  const byCity = new Map<string, CompareVenue[]>();
  for (const v of venues) {
    if (!v.city || !v.state) continue;
    const key = `${v.city}, ${v.state}`;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key)!.push(v);
  }

  const cities: CityRollup[] = Array.from(byCity.entries())
    .map(([key, list]) => {
      const rents = list.map((v) => v.weeklyRent).filter((r): r is number => r != null);
      return {
        key,
        city: list[0].city!,
        state: list[0].state!,
        venues: list.length,
        chairs: list.reduce((sum, v) => sum + (v.chairs ?? 0), 0),
        withRent: rents.length,
        medianWeeklyRent: median(rents),
      };
    })
    .sort((a, b) => b.venues - a.venues);

  return { venues, cities, totalWithRent: venues.filter((v) => v.weeklyRent != null).length };
}

export interface RentBenchmarks {
  /** Shops with a parseable weekly figure (excludes commission-only quotes). */
  sampleSize: number;
  medianWeekly: number | null;
  minWeekly: number | null;
  maxWeekly: number | null;
  commissionCount: number;
  totalChairs: number;
  cityCount: number;
  venueCount: number;
  /** Cities with enough quoted rent to publish a median, richest first. */
  topRentCities: CityRollup[];
}

/**
 * Aggregates used by the on-page SEO copy and the .md export. Computed from
 * the live index rather than hardcoded so the published figures can't drift
 * from what the table actually shows.
 */
export async function getRentBenchmarks(): Promise<RentBenchmarks> {
  const { venues, cities } = await getVenueIndex();
  const rents = venues.map((v) => v.weeklyRent).filter((r): r is number => r != null);
  return {
    sampleSize: rents.length,
    medianWeekly: median(rents),
    minWeekly: rents.length ? Math.min(...rents) : null,
    maxWeekly: rents.length ? Math.max(...rents) : null,
    commissionCount: venues.filter((v) => v.rentKind === "commission").length,
    totalChairs: venues.reduce((sum, v) => sum + (v.chairs ?? 0), 0),
    cityCount: cities.length,
    venueCount: venues.length,
    topRentCities: cities
      .filter((c) => c.withRent > 0 && c.medianWeeklyRent != null)
      .sort((a, b) => b.withRent - a.withRent)
      .slice(0, 12),
  };
}

export async function queryVenues(q: VenueQuery): Promise<VenuePage> {
  const { venues } = await getVenueIndex();
  const search = q.search?.trim().toLowerCase();

  const filtered = venues.filter((v) => {
    if (q.type && q.type !== "all" && v.type !== q.type) return false;
    if (q.cityKey && q.cityKey !== "all" && `${v.city}, ${v.state}` !== q.cityKey) return false;
    if (q.rentOnly && v.weeklyRent == null && v.rentKind !== "commission") return false;
    if (q.chairsOnly && !(v.chairs && v.chairs > 0)) return false;
    if (q.hiringOnly && !v.hiring) return false;
    if (search && !v.name.toLowerCase().includes(search)) return false;
    return true;
  });

  const field = q.sortField ?? "weeklyRent";
  const dir = (q.sortDir ?? "asc") === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (field === "name") return a.name.localeCompare(b.name) * dir;
    const av = a[field];
    const bv = b[field];
    // Missing values always sink — a shop with no rent listed isn't "cheapest".
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (Number(av) - Number(bv)) * dir;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page ?? 1), totalPages);

  return {
    rows: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    medianWeeklyRent: median(filtered.map((v) => v.weeklyRent).filter((r): r is number => r != null)),
    page,
    totalPages,
  };
}
