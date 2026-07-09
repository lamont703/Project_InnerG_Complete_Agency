import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by every entity profile page (barbers, shops, salons, schools,
// cosmetologists, stores, events) to render real "Nearby X" cross-links —
// closing the gap where ~6,000 real entity pages had zero links between
// them, reachable only via search/sitemap rather than contextual relevance.
// Mirrors the exact haversine + in-memory-filter pattern already used in
// lib/shop-ecosystem.ts, rather than a bounding-box SQL pre-filter, since
// these tables are small enough (a few hundred to ~1,500 rows) that a full
// fetch + in-memory distance filter is simpler and consistent with the
// rest of the codebase.

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearbyEntity {
  id: string;
  name: string;
  distanceMiles: number;
  profileUrl: string;
  subtitle?: string;
}

export type NearbyEntityType =
  | "shops"
  | "salons"
  | "barberSchools"
  | "cosmetologySchools"
  | "barbers"
  | "cosmetologists"
  | "barberSupplyStores"
  | "beautySupplyStores"
  | "events";

const TABLE_CONFIG: Record<
  NearbyEntityType,
  { table: string; nameCol: string; profileBase: string; subtitleCol?: string }
> = {
  shops: { table: "agent_barbershop_leads", nameCol: "shop_name", profileBase: "/shop" },
  salons: { table: "agent_salon_leads", nameCol: "shop_name", profileBase: "/salons" },
  barberSchools: { table: "agent_barber_school_leads", nameCol: "school_name", profileBase: "/schools", subtitleCol: "written_pass_rate_2026" },
  cosmetologySchools: { table: "agent_cosmetology_school_leads", nameCol: "school_name", profileBase: "/schools", subtitleCol: "written_pass_rate_2026" },
  barbers: { table: "agent_barber_leads", nameCol: "name", profileBase: "/barbers" },
  cosmetologists: { table: "agent_cosmetologist_leads", nameCol: "name", profileBase: "/cosmetologists" },
  barberSupplyStores: { table: "agent_barber_supply_store_leads", nameCol: "name", profileBase: "/stores" },
  beautySupplyStores: { table: "agent_beauty_supply_store_leads", nameCol: "name", profileBase: "/stores" },
  events: { table: "events", nameCol: "title", profileBase: "/events" },
};

export async function fetchNearbyEntities(
  supabase: SupabaseClient,
  entityType: NearbyEntityType,
  center: { lat: number; lng: number },
  opts: { excludeId?: string; radiusMiles?: number; limit?: number; cityFilter?: string } = {}
): Promise<NearbyEntity[]> {
  const { excludeId, radiusMiles = 15, limit = 5, cityFilter } = opts;
  const config = TABLE_CONFIG[entityType];

  let query = supabase
    .from(config.table)
    .select(`id, slug, latitude, longitude, ${config.nameCol}${config.subtitleCol ? `, ${config.subtitleCol}` : ""}`)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (cityFilter) query = query.ilike("city", `%${cityFilter}%`);

  const { data, error } = await query;
  if (error || !data) {
    console.error(`fetchNearbyEntities(${entityType}) query error:`, error);
    return [];
  }

  return (data as any[])
    .filter((row) => row.id !== excludeId && row.slug)
    .map((row) => ({
      id: row.id,
      name: row[config.nameCol],
      distanceMiles: haversineMiles(center.lat, center.lng, Number(row.latitude), Number(row.longitude)),
      profileUrl: `${config.profileBase}/${row.slug}`,
      subtitle:
        config.subtitleCol && row[config.subtitleCol] != null
          ? `${Math.round(row[config.subtitleCol] * 100)}% pass rate`
          : undefined,
    }))
    .filter((e) => e.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}
