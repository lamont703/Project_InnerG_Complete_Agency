import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { parseWeeklyRent, median } from "@/lib/shop-ecosystem";
import { TX_CITIES, MIN_TOTAL_BUSINESSES, MIN_PER_CATEGORY, BESPOKE_CITY_ROUTES, slugForCity, type CityReadiness } from "@/lib/city-readiness";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface TexasHubEntity {
  id: string;
  name: string;
  href: string;
  rating?: number | null;
  reviews?: number | null;
  score?: number | null;
  badge?: string | null;
}

export interface TexasHubSection {
  key: string;
  label: string;
  searchTab: string;
  count: number;
  items: TexasHubEntity[];
}

export interface TexasCityLink extends CityReadiness {
  href: string;
}

export interface TexasHubData {
  sections: TexasHubSection[];
  totalEntities: number;
  avgSchoolScore: number | null;
  openChairs: number;
  medianWeeklyRent: number | null;
  cities: TexasCityLink[];
}

// Statewide version of lib/city-hub-data.ts's getCityHubData — same 8-table
// fetch and 7-section ranking logic, but unfiltered (one pass per table,
// not one call per city) and with an added statewide "browse by city"
// breakdown bucketed from that same in-memory pass instead of a second
// round of DB queries. This is deliberately not a shared/imported helper
// with city-hub-data.ts (see that file's own header comment on why Houston
// and the generalized city layer stay separate) — same duplication
// convention, third copy.
//
// Known, pre-existing limitation carried over unchanged: bucketing by a
// substring test against formatted_address (the exact same test Postgres's
// ilike already performs, just relocated to JS) can mis-bucket a business
// whose street name contains another city's name (e.g. a Houston address
// on "Katy Freeway"). This risk already exists in every current per-city
// ilike filter (see getCityHubData("Katy")) — not introduced here, just
// more visible once every city is aggregated in one place.
export async function getTexasHubData(): Promise<TexasHubData> {
  const [shops, barberSchools, cosmetSchools, barbers, cosmetologists, salons, barberSupply, beautySupply] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, slug, shop_name, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate"),
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, slug, school_name, city, rating, school_leaderboard_score_2026, accreditation_status"),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, slug, school_name, city, rating, cosmetology_school_leaderboard_score_2026, accreditation_status"),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, slug, name, metro_area, booksy_rating, booksy_review_count, specialty_type"),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, slug, name, metro_area, booksy_rating, booksy_review_count, specialty_type"),
    fetchAllRows(supabase, "agent_salon_leads",
      "id, slug, shop_name, formatted_address, rating, total_reviews, hiring_need, booth_count_available, rent_rate"),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, slug, name, city, rating, total_reviews"),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, slug, name, city, rating, total_reviews"),
  ]);

  const buildSection = (
    key: string,
    label: string,
    searchTab: string,
    rows: any[],
    mapItem: (r: any) => TexasHubEntity,
    sortKey: "rating" | "score"
  ): TexasHubSection => {
    const items = rows
      .map(mapItem)
      .filter((it) => it[sortKey] != null)
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number) || (b.reviews || 0) - (a.reviews || 0))
      .slice(0, 6);
    return { key, label, searchTab, count: rows.length, items };
  };

  const sections: TexasHubSection[] = [
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

  const barberScores = barberSchools.filter((s: any) => s.school_leaderboard_score_2026 != null);
  const cosmetScores = cosmetSchools.filter((s: any) => s.cosmetology_school_leaderboard_score_2026 != null);
  const allSchoolScores = [
    ...barberScores.map((s: any) => s.school_leaderboard_score_2026),
    ...cosmetScores.map((s: any) => s.cosmetology_school_leaderboard_score_2026),
  ];
  const avgSchoolScore = allSchoolScores.length > 0
    ? allSchoolScores.reduce((a: number, b: number) => a + b, 0) / allSchoolScores.length
    : null;

  const openChairs = [...shops, ...salons].reduce((sum: number, r: any) => sum + (r.booth_count_available || 0), 0);
  const rents = [...shops, ...salons].map((r: any) => parseWeeklyRent(r.rent_rate)).filter((v): v is number => v != null);

  // Same substring test ilike '%city%' performs, relocated to JS — see
  // file header comment on the known limitation this carries over.
  const matchesCity = (value: string | null | undefined, city: string) =>
    !!value && value.toLowerCase().includes(city.toLowerCase());

  const cities: TexasCityLink[] = TX_CITIES.map((city) => {
    const shopCount = shops.filter((s: any) => matchesCity(s.formatted_address, city)).length;
    const salonCount = salons.filter((s: any) => matchesCity(s.formatted_address, city)).length;
    const total = shopCount + salonCount;
    const qualifies = total >= MIN_TOTAL_BUSINESSES && shopCount >= MIN_PER_CATEGORY && salonCount >= MIN_PER_CATEGORY;
    const slug = slugForCity(city);
    const label = city.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      city: label,
      slug,
      shops: shopCount,
      salons: salonCount,
      total,
      qualifies,
      href: qualifies
        ? BESPOKE_CITY_ROUTES[slug] || `/${slug}`
        : `/tools/barbershop-search?q=${encodeURIComponent(label)}`,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    sections,
    totalEntities: sections.reduce((sum, s) => sum + s.count, 0),
    avgSchoolScore,
    openChairs,
    medianWeeklyRent: median(rents),
    cities,
  };
}
