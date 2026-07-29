import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { extractZip } from "@/lib/geo-enrichment";
import { parseWeeklyRent, median } from "@/lib/shop-ecosystem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const HOUSTON_FILTER = "%houston%";

export interface HoustonEntity {
  id: string;
  name: string;
  href: string;
  zip: string | null;
  rating?: number | null;
  reviews?: number | null;
  score?: number | null;
  badge?: string | null;
}

export interface HoustonSection {
  key: string;
  label: string;
  color: string;
  searchTab: string;
  count: number;
  items: HoustonEntity[];
}

export interface HoustonZipSignal {
  label: "Talent-Rich" | "Competitive" | "Hiring, No Local Talent" | "Balanced";
  venues: number;
  hiringVenues: number;
  professionals: number;
}

export interface HoustonData {
  sections: HoustonSection[];
  totalEntities: number;
  avgSchoolScore: number | null;
  // Scoped by matchesZip like avgSchoolScore — citywide when no zip filter
  // is applied, single-zip when one is. openChairs sums
  // booth_count_available across shops+salons; medianWeeklyRent parses
  // free-text rent_rate the same way the shop ecosystem report and the AI
  // chat's rent-by-zip tool already do.
  openChairs: number;
  medianWeeklyRent: number | null;
  zipCounts: { zip: string; count: number; signal: HoustonZipSignal | null; openChairs: number; medianWeeklyRent: number | null }[];
}

// Fetches every Houston-area row across all 7 entity types, extracts a zip
// code from whichever field has it, and optionally narrows every section to
// a single zip. Always computes the full zip breakdown from the unfiltered
// pull (even when a zip filter is applied) so callers get both in one fetch.
export async function getHoustonData(zip?: string): Promise<HoustonData> {
  const today = new Date().toISOString().slice(0, 10);
  const [shops, barberSchools, cosmetSchools, barbers, cosmetologists, salons, barberSupply, beautySupply, events] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, slug, shop_name, city, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, slug, school_name, city, formatted_address, rating, school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, slug, school_name, city, formatted_address, rating, cosmetology_school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, slug, name, metro_area, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, slug, name, metro_area, address, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", HOUSTON_FILTER)),
    // `slug` is what buildSection turns into /salons/{slug}; without it every
    // salon card on this page linked to /salons/undefined and 404'd. Every
    // other select here — and in lib/city-hub-data.ts / lib/california-hub-data.ts
    // — already asks for it; this one query was the exception.
    fetchAllRows(supabase, "agent_salon_leads",
      "id, slug, shop_name, city, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, slug, name, city, rating, total_reviews",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, slug, name, city, rating, total_reviews",
      (q) => q.ilike("city", HOUSTON_FILTER)),
    fetchAllRows(supabase, "events",
      "id, slug, title, event_date, category, venue_name, city",
      (q) => q.ilike("city", HOUSTON_FILTER).gte("event_date", today)),
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

  const shopsZ = withZip(shops, "city");
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
    color: string,
    searchTab: string,
    rows: any[],
    mapItem: (r: any) => HoustonEntity,
    sortKey: "rating" | "score"
  ): HoustonSection => {
    const filtered = rows.filter((r) => matchesZip(r.zip));
    const items = filtered
      .map(mapItem)
      .filter((it) => it[sortKey] != null)
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number) || (b.reviews || 0) - (a.reviews || 0))
      .slice(0, 6);
    return { key, label, color, searchTab, count: filtered.length, items };
  };

  const sections: HoustonSection[] = [
    buildSection("shops", "Barbershops", "blue", "Barbershops", shopsZ, (s) => ({
      id: s.id, name: s.shop_name, href: `/shop/${s.slug}`, zip: s.zip,
      rating: s.rating, reviews: s.total_reviews,
      badge: s.hiring_need || (s.booth_count_available || 0) >= 1 ? "Hiring" : null,
    }), "rating"),
    buildSection("salons", "Salons", "orange", "Salons", salonsZ, (s) => ({
      id: s.id, name: s.shop_name, href: `/salons/${s.slug}`, zip: s.zip,
      rating: s.rating, reviews: s.total_reviews,
    }), "rating"),
    buildSection("barbers", "Barbers", "green", "Barbers", barbersZ, (b) => ({
      id: b.id, name: b.name, href: `/barbers/${b.slug}`, zip: b.zip,
      rating: b.booksy_rating, reviews: b.booksy_review_count, badge: b.specialty_type,
    }), "rating"),
    buildSection("cosmetologists", "Cosmetologists", "pink", "Cosmetologist", cosmetologistsZ, (c) => ({
      id: c.id, name: c.name, href: `/cosmetologists/${c.slug}`, zip: c.zip,
      rating: c.booksy_rating, reviews: c.booksy_review_count, badge: c.specialty_type,
    }), "rating"),
    buildSection("barberSchools", "Barber Schools", "red", "Schools", barberSchoolsZ, (s) => ({
      id: s.id, name: s.school_name, href: `/schools/${s.slug}`, zip: s.zip,
      score: s.school_leaderboard_score_2026, badge: s.accreditation_status,
    }), "score"),
    buildSection("cosmetSchools", "Cosmetology Schools", "purple", "Schools", cosmetSchoolsZ, (s) => ({
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
      return { key: "stores", label: "Supply Stores", color: "amber", searchTab: "Stores", count: filtered.length, items };
    })(),
  ];

  // Same treatment as the generalized lib/city-hub-data.ts version: not
  // counted toward totalEntities (an event isn't a business) and not
  // zip-scoped (events aren't tied to one zip the way a shop is).
  const eventsSorted = [...events].sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));
  const eventsSection: HoustonSection = {
    key: "events",
    label: "Upcoming Events",
    color: "indigo",
    searchTab: "Events",
    count: eventsSorted.length,
    items: eventsSorted.slice(0, 6).map((e: any) => ({
      id: e.id,
      name: e.title,
      href: `/events/${e.slug}`,
      zip: null,
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

  // Opportunity classification per zip. "Seeking placement" flags
  // (agent_barber_leads.status, agent_cosmetologist_leads.is_interested)
  // are too sparse to segment by zip — only 11 of 204 Houston barbers are
  // ever flagged "interested_in_placement," and cosmetologists' flag is
  // never true at all (0 of 122). So supply is approximated with raw
  // professional headcount per zip instead, and demand uses the shop/salon
  // hiring_need + booth_count_available signal, which does have real
  // variation (~9% of Houston shops show it).
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
  const classifyZip = (z: string): HoustonZipSignal | null => {
    const venues = venuesByZip.get(z);
    if (!venues || venues.total < MIN_VENUES_TO_CLASSIFY) return null;
    const professionals = professionalsByZip.get(z) || 0;
    const ratio = professionals / venues.total;

    let label: HoustonZipSignal["label"];
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

  // Same matchesZip scoping as avgSchoolScore — citywide total/median when
  // no zip filter is applied, single-zip when one is.
  const chairsInScope = [...shopsZ, ...salonsZ]
    .filter((r) => matchesZip(r.zip))
    .reduce((sum, r: any) => sum + (r.booth_count_available || 0), 0);
  const rentsInScope = [...shopsZ, ...salonsZ]
    .filter((r) => matchesZip(r.zip))
    .map((r: any) => parseWeeklyRent(r.rent_rate))
    .filter((v): v is number => v != null);

  return {
    sections: [...sections, eventsSection],
    totalEntities: sections.reduce((sum, s) => sum + s.count, 0),
    avgSchoolScore,
    openChairs: chairsInScope,
    medianWeeklyRent: median(rentsInScope),
    zipCounts,
  };
}
