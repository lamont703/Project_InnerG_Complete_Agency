import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { extractZip } from "@/lib/geo-enrichment";

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

export function median(values: number[]): number | null {
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
      "id, slug, latitude, longitude, school_name, school_leaderboard_score_2026",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, slug, latitude, longitude, school_name, cosmetology_school_leaderboard_score_2026",
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
      "id, slug, latitude, longitude, name",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, slug, latitude, longitude, name",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
  ]);

  const within = <T extends { latitude: any; longitude: any }>(rows: T[]) =>
    rows
      .map((r) => ({ ...r, distanceMiles: haversineMiles(originLat, originLon, Number(r.latitude), Number(r.longitude)) }))
      .filter((r) => r.distanceMiles <= radiusMiles);

  const nearbyBarberSchools = within(barberSchools).filter((s: any) => s.school_leaderboard_score_2026 != null);
  const nearbyCosmetSchools = within(cosmetologySchools).filter((s: any) => s.cosmetology_school_leaderboard_score_2026 != null);
  const allNearbySchools = [
    ...nearbyBarberSchools.map((s: any) => ({ name: s.school_name, score: s.school_leaderboard_score_2026, distanceMiles: s.distanceMiles, type: "Barber" as const, profileUrl: `/schools/${s.slug}` })),
    ...nearbyCosmetSchools.map((s: any) => ({ name: s.school_name, score: s.cosmetology_school_leaderboard_score_2026, distanceMiles: s.distanceMiles, type: "Cosmetology" as const, profileUrl: `/schools/${s.slug}` })),
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
      nearestSupplyStoreProfileUrl: nearestSupply ? `/stores/${(nearestSupply as any).slug}` : null,
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

export interface RentStatsByZip {
  zip: string;
  medianWeeklyRent: number | null;
  minWeeklyRent: number | null;
  maxWeeklyRent: number | null;
  sampleSize: number;
  shopCount: number;
  salonCount: number;
}

// Booth rent has no queryable numeric column anywhere — it's only ever
// free text (rent_rate), parsed on demand via parseWeeklyRent. This is the
// AI chat's rent-by-zip tool: a question like "which zip has the highest
// rent" can't be answered from the fixed RAG context (nothing in it is
// zip-scoped rent data), so the model calls this directly instead.
export async function getRentStatsByZip(supabase: SupabaseClient, zip: string): Promise<RentStatsByZip | null> {
  const [shops, salons] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads", "city, rent_rate", (q) => q.not("rent_rate", "is", null)),
    fetchAllRows(supabase, "agent_salon_leads", "city, formatted_address, rent_rate", (q) => q.not("rent_rate", "is", null)),
  ]);

  const rentsInZip: number[] = [];
  let shopCount = 0;
  let salonCount = 0;

  for (const s of shops as any[]) {
    if (extractZip(s.city) !== zip) continue;
    const rent = parseWeeklyRent(s.rent_rate);
    if (rent != null) { rentsInZip.push(rent); shopCount++; }
  }
  for (const s of salons as any[]) {
    if (extractZip(s.formatted_address || s.city) !== zip) continue;
    const rent = parseWeeklyRent(s.rent_rate);
    if (rent != null) { rentsInZip.push(rent); salonCount++; }
  }

  if (rentsInZip.length === 0) return null;

  return {
    zip,
    medianWeeklyRent: median(rentsInZip),
    minWeeklyRent: Math.min(...rentsInZip),
    maxWeeklyRent: Math.max(...rentsInZip),
    sampleSize: rentsInZip.length,
    shopCount,
    salonCount,
  };
}

export interface ProfessionalEmploymentMatch {
  professionalType: string;
  professionalId: string;
  professionalName: string;
  professionalHref: string | null;
  professionalAddress: string | null;
  venueType: string;
  venueName: string;
  venueHref: string | null;
  venueAddress: string | null;
  distanceMiles: number;
  confidenceScore: number;
  nameMatchScore: number;
  verificationRequestedAt: string | null;
}

const PROFESSIONAL_PATH: Record<string, string> = { barber: "/barbers", cosmetologist: "/cosmetologists" };
const VENUE_PATH: Record<string, string> = { shop: "/shop", salon: "/salons" };

// Backs the AI Mode "where does X work" tool. Returns ranked candidates,
// not a single answer — see find_professional_employment's own comment
// for why a name search can plausibly match more than one person, and
// why some real people won't be found at all (their booking handle may
// share nothing textually with their real name).
//
// professionalHref/venueHref are real, constructed from the underlying
// ids — the chat route must add these to its validLinks set before
// sanitizing the model's response, since they're introduced by this
// tool call, not present in the fixed context validLinks is normally
// built from.
export async function findProfessionalEmployment(supabase: SupabaseClient, name: string): Promise<ProfessionalEmploymentMatch[]> {
  const { data, error } = await supabase.rpc("find_professional_employment", { p_name_query: name });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    professionalType: r.professional_type,
    professionalId: r.professional_id,
    professionalName: r.professional_name,
    professionalHref: PROFESSIONAL_PATH[r.professional_type] ? `${PROFESSIONAL_PATH[r.professional_type]}/${r.professional_id}` : null,
    professionalAddress: r.professional_address || null,
    venueType: r.venue_type,
    venueName: r.venue_name,
    venueHref: VENUE_PATH[r.venue_type] ? `${VENUE_PATH[r.venue_type]}/${r.venue_id}` : null,
    venueAddress: r.venue_address || null,
    distanceMiles: Number(r.distance_miles),
    confidenceScore: Number(r.confidence_score),
    nameMatchScore: Number(r.name_match_score),
    verificationRequestedAt: r.verification_requested_at || null,
  }));
}

export interface TopVenueByWorkerCount {
  venueType: string;
  venueName: string;
  venueHref: string | null;
  venueAddress: string | null;
  workerCount: number;
  avgConfidence: number;
}

// Backs the AI Mode "which shop has the most workers" tool — an
// aggregate over professional_employment_matches, distinct from
// findProfessionalEmployment's per-name lookup above. Same "unconfirmed
// inference" caveat applies: these are geocoded matches, not confirmed
// employment records.
export async function getTopVenuesByWorkerCount(supabase: SupabaseClient, limit = 10, venueType?: "shop" | "salon"): Promise<TopVenueByWorkerCount[]> {
  const { data, error } = await supabase.rpc("get_top_venues_by_worker_count", { p_limit: limit, p_venue_type: venueType || null });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    venueType: r.venue_type,
    venueName: r.venue_name,
    venueHref: VENUE_PATH[r.venue_type] ? `${VENUE_PATH[r.venue_type]}/${r.venue_id}` : null,
    venueAddress: r.venue_address || null,
    workerCount: Number(r.worker_count),
    avgConfidence: Number(r.avg_confidence),
  }));
}

export interface VenueWorker {
  professionalType: string;
  professionalId: string;
  professionalName: string;
  professionalHref: string | null;
  venueType: string;
  venueName: string;
  venueHref: string | null;
  distanceMiles: number;
  confidenceScore: number;
  confirmationStatus: string;
  verificationRequestedAt: string | null;
}

// The inverse of findProfessionalEmployment — venue name in, list of its
// matched professionals out. Resolves to the single best-matching venue
// (or top 2, on a genuine name collision — e.g. two distinct venues both
// named "Legends Barbershop") rather than a flat, independently-scored
// list, so results read as "here's who works at THIS place" not a
// grab-bag of loosely similar names.
export async function getWorkersAtVenue(supabase: SupabaseClient, venueQuery: string): Promise<VenueWorker[]> {
  const { data, error } = await supabase.rpc("get_workers_at_venue", { p_venue_query: venueQuery });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    professionalType: r.professional_type,
    professionalId: r.professional_id,
    professionalName: r.professional_name,
    professionalHref: PROFESSIONAL_PATH[r.professional_type] ? `${PROFESSIONAL_PATH[r.professional_type]}/${r.professional_id}` : null,
    venueType: r.venue_type,
    venueName: r.venue_name,
    venueHref: VENUE_PATH[r.venue_type] ? `${VENUE_PATH[r.venue_type]}/${r.venue_id}` : null,
    distanceMiles: Number(r.distance_miles),
    confidenceScore: Number(r.confidence_score),
    confirmationStatus: r.confirmation_status,
    verificationRequestedAt: r.verification_requested_at || null,
  }));
}

export interface ConfirmationStats {
  totalMatches: number;
  confirmedCount: number;
  deniedCount: number;
  unconfirmedCount: number;
  confirmedPct: number;
  avgConfidence: number;
}

// All matches are 'unconfirmed' today (no confirmation/outreach flow
// exists yet) — confirmedPct will honestly read 0 until that's built,
// not a bug.
export async function getConfirmationStats(supabase: SupabaseClient): Promise<ConfirmationStats | null> {
  const { data, error } = await supabase.rpc("get_confirmation_stats", {});
  if (error || !data || !data[0]) return null;
  const r = data[0];
  return {
    totalMatches: Number(r.total_matches),
    confirmedCount: Number(r.confirmed_count),
    deniedCount: Number(r.denied_count),
    unconfirmedCount: Number(r.unconfirmed_count),
    confirmedPct: Number(r.confirmed_pct) || 0,
    avgConfidence: Number(r.avg_confidence),
  };
}

export interface UnconfirmedMatch {
  professionalType: string;
  professionalId: string;
  professionalName: string;
  professionalHref: string | null;
  venueType: string;
  venueName: string;
  venueHref: string | null;
  distanceMiles: number;
  confidenceScore: number;
  verificationRequestedAt: string | null;
}

// An outreach worklist, highest confidence first — the most-likely-
// correct matches get confirmed before lower-confidence ones.
export async function listUnconfirmedMatches(supabase: SupabaseClient, limit = 20, minConfidence = 0): Promise<UnconfirmedMatch[]> {
  const { data, error } = await supabase.rpc("list_unconfirmed_matches", { p_limit: limit, p_min_confidence: minConfidence });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    professionalType: r.professional_type,
    professionalId: r.professional_id,
    professionalName: r.professional_name,
    professionalHref: PROFESSIONAL_PATH[r.professional_type] ? `${PROFESSIONAL_PATH[r.professional_type]}/${r.professional_id}` : null,
    venueType: r.venue_type,
    venueName: r.venue_name,
    venueHref: VENUE_PATH[r.venue_type] ? `${VENUE_PATH[r.venue_type]}/${r.venue_id}` : null,
    distanceMiles: Number(r.distance_miles),
    confidenceScore: Number(r.confidence_score),
    verificationRequestedAt: r.verification_requested_at || null,
  }));
}

export interface EmploymentMatchOverview {
  totalMatches: number;
  barberMatches: number;
  cosmetologistMatches: number;
  shopMatches: number;
  salonMatches: number;
  avgConfidence: number;
  avgDistanceMiles: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  unmatchedEligibleCount: number;
}

// Data-quality/audit overview — totals, breakdowns, and how many
// eligible professionals (had lat/lng, real name) never landed a match
// within 3 miles of anywhere, not just how many were never attempted.
export async function getEmploymentMatchOverview(supabase: SupabaseClient): Promise<EmploymentMatchOverview | null> {
  const { data, error } = await supabase.rpc("get_employment_match_overview", {});
  if (error || !data || !data[0]) return null;
  const r = data[0];
  return {
    totalMatches: Number(r.total_matches),
    barberMatches: Number(r.barber_matches),
    cosmetologistMatches: Number(r.cosmetologist_matches),
    shopMatches: Number(r.shop_matches),
    salonMatches: Number(r.salon_matches),
    avgConfidence: Number(r.avg_confidence),
    avgDistanceMiles: Number(r.avg_distance_miles),
    highConfidenceCount: Number(r.high_confidence_count),
    lowConfidenceCount: Number(r.low_confidence_count),
    unmatchedEligibleCount: Number(r.unmatched_eligible_count),
  };
}

// Pass rates are stored as 0-1 decimals on the school tables — converted
// to 0-100 here so every exam-stats field displays consistently
// regardless of whether it came from a school-level or statewide query.
function pct(v: number | null): number | null {
  return v == null ? null : Math.round(v * 1000) / 10;
}

export interface SchoolExamStats {
  schoolId: string;
  schoolType: string;
  schoolHref: string;
  schoolName: string;
  city: string | null;
  barberWrittenPassRate: number | null;
  barberWrittenTestTakers: number | null;
  barberPracticalPassRate: number | null;
  barberPracticalTestTakers: number | null;
  barberFirstAttemptPassRate: number | null;
  barberAvgAttemptsToPass: number | null;
  barberLeaderboardScore: number | null;
  cosmetologyWrittenPassRate: number | null;
  cosmetologyWrittenTestTakers: number | null;
  cosmetologyPracticalPassRate: number | null;
  cosmetologyPracticalTestTakers: number | null;
  cosmetologyFirstAttemptPassRate: number | null;
  cosmetologyAvgAttemptsToPass: number | null;
  cosmetologyLeaderboardScore: number | null;
}

// Single-school lookup for a school administrator asking about their own
// school — fuzzy name match, distinct from the fixed top-8-by-volume
// leaderboard already in the general chat context, which won't surface a
// mid-size school at all. Can return more than one row on a genuine
// multi-campus collision (e.g. "Milan Institute" has 3 separate Texas
// campuses, confirmed live) — never silently picks one.
export async function getSchoolExamStats(supabase: SupabaseClient, schoolQuery: string): Promise<SchoolExamStats[]> {
  const { data, error } = await supabase.rpc("get_school_exam_stats", { p_school_query: schoolQuery });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    schoolId: r.school_id,
    schoolType: r.school_type,
    schoolHref: `/schools/${r.school_slug || r.school_id}`,
    schoolName: r.school_name,
    city: r.city,
    barberWrittenPassRate: pct(r.barber_written_pass_rate),
    barberWrittenTestTakers: r.barber_written_test_takers,
    barberPracticalPassRate: pct(r.barber_practical_pass_rate),
    barberPracticalTestTakers: r.barber_practical_test_takers,
    barberFirstAttemptPassRate: pct(r.barber_first_attempt_pass_rate),
    barberAvgAttemptsToPass: r.barber_avg_attempts_to_pass,
    barberLeaderboardScore: r.barber_leaderboard_score,
    cosmetologyWrittenPassRate: pct(r.cosmetology_written_pass_rate),
    cosmetologyWrittenTestTakers: r.cosmetology_written_test_takers,
    cosmetologyPracticalPassRate: pct(r.cosmetology_practical_pass_rate),
    cosmetologyPracticalTestTakers: r.cosmetology_practical_test_takers,
    cosmetologyFirstAttemptPassRate: pct(r.cosmetology_first_attempt_pass_rate),
    cosmetologyAvgAttemptsToPass: r.cosmetology_avg_attempts_to_pass,
    cosmetologyLeaderboardScore: r.cosmetology_leaderboard_score,
  }));
}

export interface StatewideExamStats {
  programType: string;
  testType: string;
  totalTestTakers: number;
  passCount: number;
  passRate: number;
  firstAttemptPassRate: number;
  avgAttemptsToPass: number;
}

// The genuinely missing benchmark — student-weighted (not an average of
// per-school rates, so large and small schools aren't counted equally),
// computed live from raw pass/fail records.
export async function getStatewideExamStats(supabase: SupabaseClient): Promise<StatewideExamStats[]> {
  const { data, error } = await supabase.rpc("get_statewide_exam_stats", {});
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    programType: r.program_type,
    testType: r.test_type,
    totalTestTakers: Number(r.total_test_takers),
    passCount: Number(r.pass_count),
    passRate: Number(r.pass_rate),
    firstAttemptPassRate: Number(r.first_attempt_pass_rate),
    avgAttemptsToPass: Number(r.avg_attempts_to_pass),
  }));
}

export interface StudentExamRecord {
  programType: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  schoolHref: string | null;
  testType: string;
  testDate: string | null;
  result: string;
  score: number | null;
  attemptNumber: number;
  isLatestAttempt: boolean;
  schoolMatchConfidence: string;
}

const SCHOOL_TYPE_TO_PATH: Record<string, string> = { barber: "/schools", cosmetology: "/schools" };

// Fuzzy name match across both student tables, grouped to the best-
// matching person(s) — requires matching at least 2 of a 2+-word query's
// tokens (confirmed live: a looser threshold let an unrelated same-first-
// name person through). Returns every attempt for that person, not just
// the latest, so retakes are visible via attemptNumber/isLatestAttempt.
export async function findStudentExamRecord(supabase: SupabaseClient, name: string): Promise<StudentExamRecord[]> {
  const { data, error } = await supabase.rpc("find_student_exam_record", { p_name_query: name });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    programType: r.program_type,
    firstName: r.first_name,
    lastName: r.last_name,
    schoolName: r.school_name,
    schoolHref: r.matched_school_id && SCHOOL_TYPE_TO_PATH[r.matched_school_type] ? `${SCHOOL_TYPE_TO_PATH[r.matched_school_type]}/${r.matched_school_slug || r.matched_school_id}` : null,
    testType: r.test_type,
    testDate: r.test_date,
    result: r.result,
    score: r.score,
    attemptNumber: Number(r.attempt_number),
    isLatestAttempt: !!r.is_latest_attempt,
    schoolMatchConfidence: r.school_match_confidence,
  }));
}

export interface SchoolRegionRanking {
  schoolId: string;
  schoolType: string;
  schoolHref: string;
  schoolName: string;
  city: string | null;
  writtenPassRate: number | null;
  writtenTestTakers: number | null;
  leaderboardScore: number | null;
}

// "Which schools in my area have the best pass rates" — city-scoped,
// distinct from the statewide fixed leaderboard. Floors at 3 test-takers
// to avoid a 1-student 100%/0% school skewing the ranking.
export async function getSchoolRankingsByRegion(supabase: SupabaseClient, city: string, limit = 10): Promise<SchoolRegionRanking[]> {
  const { data, error } = await supabase.rpc("get_school_rankings_by_region", { p_city: city, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    schoolId: r.school_id,
    schoolType: r.school_type,
    schoolHref: `/schools/${r.school_slug || r.school_id}`,
    schoolName: r.school_name,
    city: r.city,
    writtenPassRate: pct(r.written_pass_rate),
    writtenTestTakers: r.written_test_takers,
    leaderboardScore: r.leaderboard_score,
  }));
}

export interface TopSchoolByPassRate {
  schoolId: string;
  schoolType: string;
  schoolHref: string;
  schoolName: string;
  city: string | null;
  writtenPassRate: number | null;
  writtenTestTakers: number | null;
  leaderboardScore: number | null;
}

// Statewide best/worst performers by pass rate, distinct from the fixed
// volume-sorted leaderboard already in general context. Floors at 5
// test-takers by default for the same small-sample reason.
export async function getTopSchoolsByPassRate(supabase: SupabaseClient, limit = 10, direction: "best" | "worst" = "best"): Promise<TopSchoolByPassRate[]> {
  const { data, error } = await supabase.rpc("get_top_schools_by_pass_rate", { p_limit: limit, p_direction: direction });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    schoolId: r.school_id,
    schoolType: r.school_type,
    schoolHref: `/schools/${r.school_slug || r.school_id}`,
    schoolName: r.school_name,
    city: r.city,
    writtenPassRate: pct(r.written_pass_rate),
    writtenTestTakers: r.written_test_takers,
    leaderboardScore: r.leaderboard_score,
  }));
}

export interface SchoolTestTaker {
  schoolId: string;
  schoolHref: string;
  schoolName: string;
  isK12School: boolean;
  programType: string;
  firstName: string | null;
  lastName: string | null;
  testType: string;
  result: string;
  score: number | null;
  attemptNumber: number;
  isLatestAttempt: boolean;
}

// "Who were those test takers" — names are redacted (null, isK12School
// true) for schools whose name indicates a K-12 program ("High School"
// or the "Hs" abbreviation), since those test-takers are plausibly
// minors — a meaningfully different sensitivity tier than adult
// students at a dedicated trade school, where full names are returned.
export async function getSchoolTestTakers(supabase: SupabaseClient, schoolQuery: string): Promise<SchoolTestTaker[]> {
  const { data, error } = await supabase.rpc("get_school_test_takers", { p_school_query: schoolQuery });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    schoolId: r.school_id,
    schoolHref: `/schools/${r.school_slug || r.school_id}`,
    schoolName: r.school_name,
    isK12School: !!r.is_k12_school,
    programType: r.program_type,
    firstName: r.first_name,
    lastName: r.last_name,
    testType: r.test_type,
    result: r.result,
    score: r.score,
    attemptNumber: Number(r.attempt_number),
    isLatestAttempt: !!r.is_latest_attempt,
  }));
}

export interface UpcomingEvent {
  eventId: string;
  eventHref: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  organizerName: string | null;
  ticketHref: string | null;
  priceInfo: string | null;
}

// Always upcoming-only (search_events_ranked hard-filters event_date >=
// CURRENT_DATE) — a free-text query (e.g. "Houston" or "trade show")
// matches the same 20%-keyword/80%-semantic blend the search page uses,
// since city isn't a separate RPC parameter; passing it as query_text
// naturally matches events whose city/venue/description mention it.
export async function getUpcomingEvents(
  supabase: SupabaseClient,
  opts: { query?: string; category?: string; limit?: number } = {}
): Promise<UpcomingEvent[]> {
  const { data, error } = await supabase.rpc("search_events_ranked", {
    query_text: opts.query || "",
    category_filter: opts.category || null,
    limit_val: opts.limit || 10,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    eventId: r.id,
    eventHref: `/events/${r.slug}`,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    venueName: r.venue_name,
    address: r.address,
    city: r.city,
    category: r.category,
    organizerName: r.organizer_name,
    ticketHref: r.ticket_url,
    priceInfo: r.price_info,
  }));
}
