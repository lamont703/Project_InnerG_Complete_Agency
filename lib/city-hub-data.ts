import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { extractZip } from "@/lib/geo-enrichment";
import { parseWeeklyRent, median } from "@/lib/shop-ecosystem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CityHubEntity {
  id: string;
  name: string;
  href: string;
  zip?: string | null;
  rating?: number | null;
  reviews?: number | null;
  score?: number | null;
  badge?: string | null;
}

export interface CityHubSection {
  key: string;
  label: string;
  searchTab: string;
  count: number;
  items: CityHubEntity[];
}

// Same shape as app/houston/data.ts's HoustonZipSignal — kept as this
// file's own local copy rather than imported, matching the Houston/
// city-hub split's existing "duplicate small logic, don't cross-import"
// convention (see getCityHubData's own header comment on why Houston's
// data.ts is never touched).
export interface CityHubZipSignal {
  label: "Talent-Rich" | "Competitive" | "Hiring, No Local Talent" | "Balanced";
  venues: number;
  hiringVenues: number;
  professionals: number;
}

export interface CityHubData {
  sections: CityHubSection[];
  totalEntities: number;
  avgSchoolScore: number | null;
  openChairs: number;
  medianWeeklyRent: number | null;
  zipCounts: { zip: string; count: number; signal: CityHubZipSignal | null; openChairs: number; medianWeeklyRent: number | null }[];
}

// Generalized version of app/houston/data.ts's getHoustonData() — same
// section shape and ranking logic, parameterized by city instead of
// hardcoded to Houston, and deliberately without the zip-code drilldown
// (Houston's real footprint, ~950 entities, justifies zip-level
// breakdown; smaller markets like Dallas/El Paso don't have enough
// per-zip density for that to be meaningful yet — MIN_VENUES_TO_CLASSIFY
// in Houston's own version is 5, and most zips here wouldn't clear it).
// Houston's own data.ts is left untouched rather than refactored to share
// this — it's already live and indexed, not worth the risk to change it
// for this.
//
// Shops/salons are filtered by formatted_address, not the `city` column —
// confirmed directly this session that agent_barbershop_leads/
// agent_salon_leads's `city` column holds a mix of real values and old,
// unrelated seed/outreach data (a real ~5-row discrepancy found for
// Dallas alone). Schools/barbers/cosmetologists/stores keep the same
// city/metro_area field Houston's own version already uses — no evidence
// those have the same defect, so no reason to deviate from the proven
// pattern there.
// zip is optional — when passed, every section/stat narrows to that single
// zip (matchesZip below), same scoping contract as
// app/houston/data.ts's getHoustonData(zip?). zipCounts itself is always
// computed from the full, unfiltered city pull regardless, so a caller can
// get both the scoped view and the full zip breakdown from one fetch.
export async function getCityHubData(cityName: string, zip?: string): Promise<CityHubData> {
  const addressFilter = `%${cityName}%`;
  const cityFilter = `%${cityName}%`;
  const today = new Date().toISOString().slice(0, 10);

  const [shops, barberSchools, cosmetSchools, barbers, cosmetologists, salons, barberSupply, beautySupply, events] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, slug, shop_name, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("formatted_address", addressFilter)),
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, slug, school_name, formatted_address, rating, school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, slug, school_name, formatted_address, rating, cosmetology_school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, slug, name, metro_area, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", cityFilter)),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, slug, name, address, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", cityFilter)),
    fetchAllRows(supabase, "agent_salon_leads",
      "id, slug, shop_name, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("formatted_address", addressFilter)),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, slug, name, city, rating, total_reviews",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, slug, name, city, rating, total_reviews",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "events",
      "id, slug, title, event_date, category, venue_name, city",
      (q) => q.ilike("city", cityFilter).gte("event_date", today)),
  ]);

  const zipCountMap = new Map<string, number>();
  const bump = (z: string | null) => {
    if (z) zipCountMap.set(z, (zipCountMap.get(z) || 0) + 1);
  };

  const withZip = <T extends Record<string, any>>(rows: T[], zipSourceField: string) =>
    rows.map((r) => {
      const z = extractZip(r[zipSourceField]);
      bump(z);
      return { ...r, zip: z };
    });

  // Deliberate divergence from Houston's own data.ts: shops/salons here use
  // formatted_address (not city) as the zip source, same reason they're
  // already filtered by formatted_address above — city is proven
  // unreliable outside Houston. Schools/barbers/cosmetologists/stores keep
  // the same fields Houston's version uses; no evidence of the same defect
  // there.
  const shopsZ = withZip(shops, "formatted_address");
  const barberSchoolsZ = withZip(barberSchools, "formatted_address");
  const cosmetSchoolsZ = withZip(cosmetSchools, "formatted_address");
  const barbersZ = withZip(barbers, "metro_area");
  const cosmetologistsZ = withZip(cosmetologists, "address");
  const salonsZ = withZip(salons, "formatted_address");
  const barberSupplyZ = withZip(barberSupply, "city");
  const beautySupplyZ = withZip(beautySupply, "city");

  const matchesZip = (z: string | null) => !zip || z === zip;

  const buildSection = (
    key: string,
    label: string,
    searchTab: string,
    rows: any[],
    mapItem: (r: any) => CityHubEntity,
    sortKey: "rating" | "score"
  ): CityHubSection => {
    const filtered = rows.filter((r) => matchesZip(r.zip));
    const items = filtered
      .map(mapItem)
      .filter((it) => it[sortKey] != null)
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number) || (b.reviews || 0) - (a.reviews || 0))
      .slice(0, 6);
    return { key, label, searchTab, count: filtered.length, items };
  };

  const sections: CityHubSection[] = [
    buildSection("shops", "Barbershops", "Barbershops", shopsZ, (s) => ({
      id: s.id, name: s.shop_name, href: `/shop/${s.slug}`, zip: s.zip,
      rating: s.rating, reviews: s.total_reviews,
      badge: s.hiring_need || (s.booth_count_available || 0) >= 1 ? "Hiring" : null,
    }), "rating"),
    buildSection("salons", "Salons", "Salons", salonsZ, (s) => ({
      id: s.id, name: s.shop_name, href: `/salons/${s.slug}`, zip: s.zip,
      rating: s.rating, reviews: s.total_reviews,
    }), "rating"),
    buildSection("barbers", "Barbers", "Barbers", barbersZ, (b) => ({
      id: b.id, name: b.name, href: `/barbers/${b.slug}`, zip: b.zip,
      rating: b.booksy_rating, reviews: b.booksy_review_count, badge: b.specialty_type,
    }), "rating"),
    buildSection("cosmetologists", "Cosmetologists", "Cosmetologist", cosmetologistsZ, (c) => ({
      id: c.id, name: c.name, href: `/cosmetologists/${c.slug}`, zip: c.zip,
      rating: c.booksy_rating, reviews: c.booksy_review_count, badge: c.specialty_type,
    }), "rating"),
    buildSection("barberSchools", "Barber Schools", "Schools", barberSchoolsZ, (s) => ({
      id: s.id, name: s.school_name, href: `/schools/${s.slug}`, zip: s.zip,
      score: s.school_leaderboard_score_2026, badge: s.accreditation_status,
    }), "score"),
    buildSection("cosmetSchools", "Cosmetology Schools", "Schools", cosmetSchoolsZ, (s) => ({
      id: s.id, name: s.school_name, href: `/schools/${s.slug}`, zip: s.zip,
      score: s.cosmetology_school_leaderboard_score_2026, badge: s.accreditation_status,
    }), "score"),
    (() => {
      const combined = [...barberSupplyZ, ...beautySupplyZ];
      const filtered = combined.filter((r) => matchesZip(r.zip));
      const items = filtered
        .map((s) => ({ id: s.id, name: s.name, href: `/stores/${s.slug}`, zip: s.zip, rating: s.rating, reviews: s.total_reviews }))
        .filter((it) => it.rating != null)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0))
        .slice(0, 6);
      return { key: "stores", label: "Supply Stores", searchTab: "Stores", count: filtered.length, items };
    })(),
  ];

  // Events is deliberately NOT counted toward totalEntities below (an event
  // isn't a business/professional — including it would inflate the "X
  // businesses across [city]" hero stat) and isn't zip-scoped (events don't
  // carry a zip, and "Houston Barber Expo" is meaningfully city-wide, not
  // tied to one zip the way a shop is) — it always shows the full city list
  // regardless of the `zip` param. Sorted soonest-first, same convention as
  // /events' own statewide/per-city containers.
  const eventsSorted = [...events].sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));
  const eventsSection: CityHubSection = {
    key: "events",
    label: "Upcoming Events",
    searchTab: "Events",
    count: eventsSorted.length,
    items: eventsSorted.slice(0, 6).map((e: any) => ({
      id: e.id,
      name: e.title,
      href: `/events/${e.slug}`,
      badge: e.category || null,
    })),
  };

  const barberScoresInScope = barberSchoolsZ.filter((s) => matchesZip(s.zip) && s.school_leaderboard_score_2026 != null);
  const cosmetScoresInScope = cosmetSchoolsZ.filter((s) => matchesZip(s.zip) && s.cosmetology_school_leaderboard_score_2026 != null);
  const allSchoolScores = [
    ...barberScoresInScope.map((s) => s.school_leaderboard_score_2026),
    ...cosmetScoresInScope.map((s) => s.cosmetology_school_leaderboard_score_2026),
  ];
  const avgSchoolScore = allSchoolScores.length > 0
    ? allSchoolScores.reduce((a: number, b: number) => a + b, 0) / allSchoolScores.length
    : null;

  // Same opportunity-signal classification as app/houston/data.ts's
  // classifyZip — local copy, not imported (see file header comment).
  const venuesByZip = new Map<string, { total: number; hiring: number }>();
  const bumpVenue = (z: string | null, isHiring: boolean) => {
    if (!z) return;
    if (!venuesByZip.has(z)) venuesByZip.set(z, { total: 0, hiring: 0 });
    const v = venuesByZip.get(z)!;
    v.total++;
    if (isHiring) v.hiring++;
  };
  for (const s of shopsZ) bumpVenue(s.zip, !!s.hiring_need || (s.booth_count_available || 0) >= 1);
  for (const s of salonsZ) bumpVenue(s.zip, !!s.hiring_need || (s.booth_count_available || 0) >= 1);

  const professionalsByZip = new Map<string, number>();
  const bumpPro = (z: string | null) => {
    if (!z) return;
    professionalsByZip.set(z, (professionalsByZip.get(z) || 0) + 1);
  };
  for (const b of barbersZ) bumpPro(b.zip);
  for (const c of cosmetologistsZ) bumpPro(c.zip);

  const chairsByZip = new Map<string, number>();
  const rentsByZip = new Map<string, number[]>();
  const bumpChairsAndRent = (z: string | null, chairs: number | null, rentRate: string | null) => {
    if (!z) return;
    if (chairs) chairsByZip.set(z, (chairsByZip.get(z) || 0) + chairs);
    const rent = parseWeeklyRent(rentRate);
    if (rent != null) {
      if (!rentsByZip.has(z)) rentsByZip.set(z, []);
      rentsByZip.get(z)!.push(rent);
    }
  };
  for (const s of shopsZ) bumpChairsAndRent(s.zip, s.booth_count_available, s.rent_rate);
  for (const s of salonsZ) bumpChairsAndRent(s.zip, s.booth_count_available, s.rent_rate);

  const MIN_VENUES_TO_CLASSIFY = 5;
  const classifyZip = (z: string): CityHubZipSignal | null => {
    const venues = venuesByZip.get(z);
    if (!venues || venues.total < MIN_VENUES_TO_CLASSIFY) return null;
    const professionals = professionalsByZip.get(z) || 0;
    const ratio = professionals / venues.total;

    let label: CityHubZipSignal["label"];
    if (venues.hiring > 0 && professionals === 0) label = "Hiring, No Local Talent";
    else if (ratio >= 0.3) label = "Talent-Rich";
    else if (ratio < 0.05) label = "Competitive";
    else label = "Balanced";

    return { label, venues: venues.total, hiringVenues: venues.hiring, professionals };
  };

  const zipCounts = Array.from(zipCountMap.entries())
    .map(([z, count]) => ({
      zip: z,
      count,
      signal: classifyZip(z),
      openChairs: chairsByZip.get(z) || 0,
      medianWeeklyRent: median(rentsByZip.get(z) || []),
    }))
    .sort((a, b) => b.count - a.count);

  const openChairs = [...shopsZ, ...salonsZ]
    .filter((r) => matchesZip(r.zip))
    .reduce((sum, r: any) => sum + (r.booth_count_available || 0), 0);
  const rents = [...shopsZ, ...salonsZ]
    .filter((r) => matchesZip(r.zip))
    .map((r: any) => parseWeeklyRent(r.rent_rate))
    .filter((v): v is number => v != null);

  return {
    sections: [...sections, eventsSection],
    totalEntities: sections.reduce((sum, s) => sum + s.count, 0),
    avgSchoolScore,
    openChairs,
    medianWeeklyRent: median(rents),
    zipCounts,
  };
}

// Zips with at least one real entity, for the sitemap — reuses the same
// zip-extraction pass without building full section data just to discard
// most of it.
export async function getCityZipCodes(cityName: string): Promise<string[]> {
  const data = await getCityHubData(cityName);
  return data.zipCounts.map((z) => z.zip);
}
