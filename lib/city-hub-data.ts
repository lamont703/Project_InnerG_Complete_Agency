import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { parseWeeklyRent, median } from "@/lib/shop-ecosystem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CityHubEntity {
  id: string;
  name: string;
  href: string;
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

export interface CityHubData {
  sections: CityHubSection[];
  totalEntities: number;
  avgSchoolScore: number | null;
  openChairs: number;
  medianWeeklyRent: number | null;
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
export async function getCityHubData(cityName: string): Promise<CityHubData> {
  const addressFilter = `%${cityName}%`;
  const cityFilter = `%${cityName}%`;

  const [shops, barberSchools, cosmetSchools, barbers, cosmetologists, salons, barberSupply, beautySupply] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, slug, shop_name, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("formatted_address", addressFilter)),
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, slug, school_name, rating, school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, slug, school_name, rating, cosmetology_school_leaderboard_score_2026, accreditation_status",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, slug, name, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", cityFilter)),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, slug, name, booksy_rating, booksy_review_count, specialty_type",
      (q) => q.ilike("metro_area", cityFilter)),
    fetchAllRows(supabase, "agent_salon_leads",
      "id, slug, shop_name, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate",
      (q) => q.ilike("formatted_address", addressFilter)),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, slug, name, rating, total_reviews",
      (q) => q.ilike("city", cityFilter)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, slug, name, rating, total_reviews",
      (q) => q.ilike("city", cityFilter)),
  ]);

  const buildSection = (
    key: string,
    label: string,
    searchTab: string,
    rows: any[],
    mapItem: (r: any) => CityHubEntity,
    sortKey: "rating" | "score"
  ): CityHubSection => {
    const items = rows
      .map(mapItem)
      .filter((it) => it[sortKey] != null)
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number) || (b.reviews || 0) - (a.reviews || 0))
      .slice(0, 6);
    return { key, label, searchTab, count: rows.length, items };
  };

  const sections: CityHubSection[] = [
    buildSection("shops", "Barbershops", "Barbershops", shops, (s) => ({
      id: s.id, name: s.shop_name, href: `/shop/${s.slug}`,
      rating: s.rating, reviews: s.total_reviews,
      badge: s.hiring_need || (s.booth_count_available || 0) >= 1 ? "Hiring" : null,
    }), "rating"),
    buildSection("salons", "Salons", "Salons", salons, (s) => ({
      id: s.id, name: s.shop_name, href: `/salons/${s.slug}`,
      rating: s.rating, reviews: s.total_reviews,
    }), "rating"),
    buildSection("barbers", "Barbers", "Barbers", barbers, (b) => ({
      id: b.id, name: b.name, href: `/barbers/${b.slug}`,
      rating: b.booksy_rating, reviews: b.booksy_review_count, badge: b.specialty_type,
    }), "rating"),
    buildSection("cosmetologists", "Cosmetologists", "Cosmetologist", cosmetologists, (c) => ({
      id: c.id, name: c.name, href: `/cosmetologists/${c.slug}`,
      rating: c.booksy_rating, reviews: c.booksy_review_count, badge: c.specialty_type,
    }), "rating"),
    buildSection("barberSchools", "Barber Schools", "Schools", barberSchools, (s) => ({
      id: s.id, name: s.school_name, href: `/schools/${s.slug}`,
      score: s.school_leaderboard_score_2026, badge: s.accreditation_status,
    }), "score"),
    buildSection("cosmetSchools", "Cosmetology Schools", "Schools", cosmetSchools, (s) => ({
      id: s.id, name: s.school_name, href: `/schools/${s.slug}`,
      score: s.cosmetology_school_leaderboard_score_2026, badge: s.accreditation_status,
    }), "score"),
    (() => {
      const combined = [...barberSupply, ...beautySupply];
      const items = combined
        .map((s) => ({ id: s.id, name: s.name, href: `/stores/${s.slug}`, rating: s.rating, reviews: s.total_reviews }))
        .filter((it) => it.rating != null)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0))
        .slice(0, 6);
      return { key: "stores", label: "Supply Stores", searchTab: "Stores", count: combined.length, items };
    })(),
  ];

  const barberScores = barberSchools.filter((s) => s.school_leaderboard_score_2026 != null);
  const cosmetScores = cosmetSchools.filter((s) => s.cosmetology_school_leaderboard_score_2026 != null);
  const allSchoolScores = [
    ...barberScores.map((s) => s.school_leaderboard_score_2026),
    ...cosmetScores.map((s) => s.cosmetology_school_leaderboard_score_2026),
  ];
  const avgSchoolScore = allSchoolScores.length > 0
    ? allSchoolScores.reduce((a: number, b: number) => a + b, 0) / allSchoolScores.length
    : null;

  const openChairs = [...shops, ...salons].reduce((sum, r: any) => sum + (r.booth_count_available || 0), 0);
  const rents = [...shops, ...salons].map((r: any) => parseWeeklyRent(r.rent_rate)).filter((v): v is number => v != null);

  return {
    sections,
    totalEntities: sections.reduce((sum, s) => sum + s.count, 0),
    avgSchoolScore,
    openChairs,
    medianWeeklyRent: median(rents),
  };
}
