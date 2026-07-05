import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";

const DEFAULT_RADIUS_MILES = 10;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Free-text rent_rate values look like "$150/week", "200 a Week", "40% a
// week for 5 months, then $300 a week", etc. — no consistent structure to
// parse reliably. Best-effort heuristic: prefer a $-prefixed number
// adjacent to "week/wk" (skips percentage-based intro-deal numbers like
// "40%"), and take the LAST such match, since multi-stage pricing strings
// consistently list the promotional/introductory rate first and the
// steady-state rate last (see examples above).
export function parseWeeklyRent(rentRate: string | null | undefined): number | null {
  if (!rentRate) return null;
  const dollarMatches = [...rentRate.matchAll(/\$\s?(\d{2,4})(?:\.\d{2})?\s*(?:\/|per\s+|a\s+)?\s*(?:week|wk)\b/gi)];
  if (dollarMatches.length > 0) {
    return parseFloat(dollarMatches[dollarMatches.length - 1][1]);
  }
  const bareMatches = [...rentRate.matchAll(/(\d{2,4})(?:\.\d{2})?\s*(?:\/|per\s+|a\s+)?\s*(?:week|wk|weekly)\b/gi)];
  if (bareMatches.length > 0) {
    return parseFloat(bareMatches[bareMatches.length - 1][1]);
  }
  return null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface ShopEcosystemReport {
  shopId: string;
  radiusMiles: number;
  talentPipeline: {
    schoolCount: number;
    avgLeaderboardScore: number | null;
    topSchools: { name: string; score: number; distanceMiles: number; type: "Barber" | "Cosmetology"; profileUrl: string }[];
  };
  laborSupply: {
    barbersSeekingPlacement: number;
    cosmetologistsInArea: number;
  };
  competition: {
    nearbyShopCount: number;
    nearbyShopsHiring: number;
    nearbySalonCount: number;
  };
  laborMarketRatio: number | null; // barbers seeking per hiring shop nearby
  supplyChain: {
    supplyStoreCount: number;
    nearestSupplyStoreMiles: number | null;
    nearestSupplyStoreName: string | null;
    nearestSupplyStoreProfileUrl: string | null;
  };
  rentBenchmark: {
    thisShopWeeklyRent: number | null;
    localMedianWeeklyRent: number | null;
    percentDiff: number | null;
    sampleSize: number;
  };
  marketDemographics: {
    // Estimated by summing population (and population-weighting income)
    // across every DISTINCT census tract our tracked shops/salons/barbers/
    // cosmetologists within the radius happen to fall into — the same
    // "count what's in our database within the radius" methodology as
    // every other section here (schoolCount, nearbyShopCount, etc. are
    // equally just OUR tracked universe, not an independent ground truth).
    // Not a substitute for the shop's own single-tract income (still the
    // most precise figure for its immediate block), but this is what
    // actually matches the 10-mile scope the rest of the report uses.
    estimatedPopulation: number | null;
    weightedAvgMedianHouseholdIncome: number | null;
    tractsSampled: number;
  };
}

// Computes a barbershop's local market position: talent pipeline quality,
// labor supply/demand balance, competitive density, supply-store proximity,
// and rent benchmarking against nearby shops/salons — all within a radius
// of the shop's coordinates. Fetches full tables rather than a bounding-box
// SQL query since a) table sizes here (hundreds to low thousands of rows)
// make an in-memory haversine filter cheap, and b) rent parsing needs to
// happen in JS anyway (see parseWeeklyRent), so there's no SQL-only path.
export async function computeShopEcosystemReport(
  supabase: SupabaseClient,
  shop: { id: string; latitude: number | null; longitude: number | null; rent_rate?: string | null },
  radiusMiles: number = DEFAULT_RADIUS_MILES
): Promise<ShopEcosystemReport | null> {
  if (shop.latitude == null || shop.longitude == null) return null;
  const originLat = Number(shop.latitude);
  const originLon = Number(shop.longitude);

  const [
    barberSchools,
    cosmetologySchools,
    barbers,
    cosmetologists,
    shops,
    salons,
    barberSupply,
    beautySupply,
  ] = await Promise.all([
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, latitude, longitude, school_name, school_leaderboard_score_2026",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, latitude, longitude, school_name, cosmetology_school_leaderboard_score_2026",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, latitude, longitude, status, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.eq("status", "interested_in_placement").not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, latitude, longitude, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, latitude, longitude, hiring_need, booth_count_available, rent_rate, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_salon_leads",
      "id, latitude, longitude, hiring_need, booth_count_available, rent_rate, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, latitude, longitude, name",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, latitude, longitude, name",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
  ]);

  const within = <T extends { latitude: any; longitude: any }>(rows: T[]) =>
    rows
      .map((r) => ({ ...r, distanceMiles: haversineMiles(originLat, originLon, Number(r.latitude), Number(r.longitude)) }))
      .filter((r) => r.distanceMiles <= radiusMiles);

  const nearbyBarberSchools = within(barberSchools).filter((s: any) => s.school_leaderboard_score_2026 != null);
  const nearbyCosmetSchools = within(cosmetologySchools).filter((s: any) => s.cosmetology_school_leaderboard_score_2026 != null);
  const allNearbySchools = [
    ...nearbyBarberSchools.map((s: any) => ({ name: s.school_name, score: s.school_leaderboard_score_2026, distanceMiles: s.distanceMiles, type: "Barber" as const, profileUrl: `/schools/${s.id}` })),
    ...nearbyCosmetSchools.map((s: any) => ({ name: s.school_name, score: s.cosmetology_school_leaderboard_score_2026, distanceMiles: s.distanceMiles, type: "Cosmetology" as const, profileUrl: `/schools/${s.id}` })),
  ];
  const schoolCountTotal = within(barberSchools).length + within(cosmetologySchools).length;
  const avgLeaderboardScore = allNearbySchools.length > 0
    ? allNearbySchools.reduce((sum, s) => sum + s.score, 0) / allNearbySchools.length
    : null;
  const topSchools = [...allNearbySchools].sort((a, b) => b.score - a.score).slice(0, 3);

  const nearbyBarbers = within(barbers);
  const nearbyCosmetologists = within(cosmetologists);

  const nearbyShops = within(shops).filter((s: any) => s.id !== shop.id);
  const nearbyShopsHiring = nearbyShops.filter((s: any) => s.hiring_need || (s.booth_count_available || 0) >= 1);
  const nearbySalons = within(salons);
  const nearbySalonsHiring = nearbySalons.filter((s: any) => s.hiring_need || (s.booth_count_available || 0) >= 1);
  const totalHiringVenues = nearbyShopsHiring.length + nearbySalonsHiring.length;

  const nearbySupplyStores = [...within(barberSupply), ...within(beautySupply)];
  const nearestSupply = [...nearbySupplyStores].sort((a, b) => a.distanceMiles - b.distanceMiles)[0];

  const rentPool = [...nearbyShops, ...nearbySalons]
    .map((s: any) => parseWeeklyRent(s.rent_rate))
    .filter((v): v is number => v != null);
  const localMedianWeeklyRent = median(rentPool);
  const thisShopWeeklyRent = parseWeeklyRent(shop.rent_rate);
  const percentDiff = thisShopWeeklyRent != null && localMedianWeeklyRent
    ? ((thisShopWeeklyRent - localMedianWeeklyRent) / localMedianWeeklyRent) * 100
    : null;

  // Aggregate population/income across every DISTINCT census tract that any
  // tracked shop/salon/barber/cosmetologist within the radius falls into —
  // gives a population and income figure actually scoped to the same
  // 10-mile radius as everything else above, instead of just the shop's own
  // single tract (which stays available separately, still the most precise
  // figure for its immediate block).
  const tractMap = new Map<string, { population: number; income: number | null }>();
  for (const r of [...nearbyShops, ...nearbySalons, ...nearbyBarbers, ...nearbyCosmetologists] as any[]) {
    if (r.census_tract_geoid && r.census_population != null && !tractMap.has(r.census_tract_geoid)) {
      tractMap.set(r.census_tract_geoid, { population: r.census_population, income: r.census_median_household_income });
    }
  }
  const tracts = Array.from(tractMap.values());
  const estimatedPopulation = tracts.length > 0 ? tracts.reduce((sum, t) => sum + t.population, 0) : null;
  const incomeWeightedPool = tracts.filter((t) => t.income != null);
  const weightedAvgMedianHouseholdIncome = incomeWeightedPool.length > 0
    ? incomeWeightedPool.reduce((sum, t) => sum + t.income! * t.population, 0) / incomeWeightedPool.reduce((sum, t) => sum + t.population, 0)
    : null;

  return {
    shopId: shop.id,
    radiusMiles,
    talentPipeline: {
      schoolCount: schoolCountTotal,
      avgLeaderboardScore,
      topSchools,
    },
    laborSupply: {
      barbersSeekingPlacement: nearbyBarbers.length,
      cosmetologistsInArea: nearbyCosmetologists.length,
    },
    competition: {
      nearbyShopCount: nearbyShops.length,
      nearbyShopsHiring: nearbyShopsHiring.length,
      nearbySalonCount: nearbySalons.length,
    },
    laborMarketRatio: nearbyBarbers.length > 0 ? nearbyBarbers.length / Math.max(totalHiringVenues, 1) : null,
    supplyChain: {
      supplyStoreCount: nearbySupplyStores.length,
      nearestSupplyStoreMiles: nearestSupply ? nearestSupply.distanceMiles : null,
      nearestSupplyStoreName: nearestSupply ? nearestSupply.name : null,
      nearestSupplyStoreProfileUrl: nearestSupply ? `/stores/${(nearestSupply as any).id}` : null,
    },
    rentBenchmark: {
      thisShopWeeklyRent,
      localMedianWeeklyRent,
      percentDiff,
      sampleSize: rentPool.length,
    },
    marketDemographics: {
      estimatedPopulation,
      weightedAvgMedianHouseholdIncome: weightedAvgMedianHouseholdIncome != null ? Math.round(weightedAvgMedianHouseholdIncome) : null,
      tractsSampled: tracts.length,
    },
  };
}
