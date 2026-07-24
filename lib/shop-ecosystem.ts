import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { extractZip } from "@/lib/geo-enrichment";

// Per-section radii. Talent draw, supply logistics, and rent comparables
// all justify a wider 15-mile ring; direct competition is the tighter
// 10-mile ring (who's actually poaching the same walk-in customers). Labor
// market (professionals seeking placement) uses the same 15-mile talent-
// draw radius as the school pipeline it feeds from.
const TALENT_RADIUS_MILES = 15;
const LABOR_RADIUS_MILES = 15;
const COMPETITION_RADIUS_MILES = 10;
const SUPPLY_RADIUS_MILES = 15;
const RENT_RADIUS_MILES = 15;

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
  entityId: string;
  entityType: "shop" | "salon";
  radii: { talent: number; labor: number; competition: number; supply: number; rent: number };
  talentPipeline: {
    schoolLabel: string; // "barber" | "cosmetology" — drives the frontend copy
    schoolCount: number; // schools of the relevant type within the talent radius
    avgWrittenPassRate: number | null; // 0–100, avg 2026 written across those schools
    avgPracticalPassRate: number | null; // 0–100, avg 2026 practical across those schools
    topSchools: { name: string; score: number; distanceMiles: number; profileUrl: string }[];
  };
  laborMarket: {
    professionalLabel: string; // "barbers" | "cosmetologists"
    seekingPlacement: number; // professionals of the relevant type seeking placement within the labor radius
    hiringVenues: number; // venues of the relevant type hiring within the labor radius
    ratio: number | null; // professionals seeking per hiring venue
  };
  competition: {
    competitorLabel: string; // "barbershops" | "salons"
    competitorCount: number; // OTHER venues of the same type within the competition radius
    competitorsHiring: number;
  };
  supplyChain: {
    supplyLabel: string; // "barber supply" | "beauty supply"
    supplyStoreCount: number; // stores of the relevant type within the supply radius
    nearestSupplyStoreMiles: number | null;
    nearestSupplyStoreName: string | null;
    nearestSupplyStoreProfileUrl: string | null;
  };
  rentBenchmark: {
    thisWeeklyRent: number | null;
    localMedianWeeklyRent: number | null;
    percentDiff: number | null;
    sampleSize: number; // # of same-type venues within the rent radius with a parseable booth rent
    venueCount: number; // # of same-type venues within the rent radius (the "shop count")
  };
  marketDemographics: {
    // Estimated by summing population (and population-weighting income)
    // across every DISTINCT census tract our same-type tracked venues +
    // labor pool within the radius fall into — same "count what's in our
    // database within the radius" methodology as every other section here.
    estimatedPopulation: number | null;
    weightedAvgMedianHouseholdIncome: number | null;
    tractsSampled: number;
  };
}

// Per-entity-type configuration: which tables and columns represent "the
// <barbershop|salon> side of the market". A shop's ecosystem is computed
// purely from barber schools / barbers / other barbershops / barber supply
// stores; a salon's purely from cosmetology schools / cosmetologists /
// other salons / beauty supply stores. Pass rates live as 0–1 decimals on
// the school tables (see the samples in parseWeeklyRent's sibling data),
// converted to 0–100 for display below.
const ECOSYSTEM_CONFIG = {
  shop: {
    schoolTable: "agent_barber_school_leads",
    scoreCol: "school_leaderboard_score_2026",
    writtenCol: "written_pass_rate_2026",
    practicalCol: "practical_pass_rate_2026",
    proTable: "agent_barber_leads",
    venueTable: "agent_barbershop_leads",
    supplyTable: "agent_barber_supply_store_leads",
    schoolLabel: "barber",
    professionalLabel: "barbers",
    competitorLabel: "barbershops",
    supplyLabel: "barber supply",
  },
  salon: {
    schoolTable: "agent_cosmetology_school_leads",
    scoreCol: "cosmetology_school_leaderboard_score_2026",
    writtenCol: "cosmetology_written_pass_rate_2026",
    practicalCol: "cosmetology_practical_pass_rate_2026",
    proTable: "agent_cosmetologist_leads",
    venueTable: "agent_salon_leads",
    supplyTable: "agent_beauty_supply_store_leads",
    schoolLabel: "cosmetology",
    professionalLabel: "cosmetologists",
    competitorLabel: "salons",
    supplyLabel: "beauty supply",
  },
} as const;

// Computes a shop's or salon's local market position from ONLY its own side
// of the market (see ECOSYSTEM_CONFIG): talent pipeline quality, labor
// supply, competitive density, supply-store proximity, and rent
// benchmarking — each within its own radius of the entity's coordinates.
// Fetches full tables rather than a bounding-box SQL query since a) table
// sizes here (hundreds to low thousands of rows) make an in-memory
// haversine filter cheap, and b) rent parsing needs to happen in JS anyway
// (see parseWeeklyRent), so there's no SQL-only path.
export async function computeShopEcosystemReport(
  supabase: SupabaseClient,
  entity: { id: string; latitude: number | null; longitude: number | null; rent_rate?: string | null },
  entityType: "shop" | "salon" = "shop"
): Promise<ShopEcosystemReport | null> {
  if (entity.latitude == null || entity.longitude == null) return null;
  const originLat = Number(entity.latitude);
  const originLon = Number(entity.longitude);
  const cfg = ECOSYSTEM_CONFIG[entityType];

  const [schools, professionals, venues, supplyStores] = await Promise.all([
    fetchAllRows(supabase, cfg.schoolTable,
      `id, slug, latitude, longitude, school_name, ${cfg.scoreCol}, ${cfg.writtenCol}, ${cfg.practicalCol}`,
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, cfg.proTable,
      "id, latitude, longitude, status, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.eq("status", "interested_in_placement").not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, cfg.venueTable,
      "id, latitude, longitude, hiring_need, booth_count_available, rent_rate, census_tract_geoid, census_population, census_median_household_income",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, cfg.supplyTable,
      "id, slug, latitude, longitude, name",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
  ]);

  // Attach a haversine distance, then keep only rows inside a given radius.
  const within = <T extends { latitude: any; longitude: any }>(rows: T[], radiusMiles: number) =>
    rows
      .map((r) => ({ ...r, distanceMiles: haversineMiles(originLat, originLon, Number(r.latitude), Number(r.longitude)) }))
      .filter((r) => r.distanceMiles <= radiusMiles);

  const avg = (values: number[]): number | null =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

  // --- Talent Pipeline (relevant schools within TALENT_RADIUS_MILES) ---
  const nearbySchools = within(schools, TALENT_RADIUS_MILES) as any[];
  const writtenRates = nearbySchools.map((s) => s[cfg.writtenCol]).filter((v): v is number => v != null);
  const practicalRates = nearbySchools.map((s) => s[cfg.practicalCol]).filter((v): v is number => v != null);
  const avgWritten = avg(writtenRates);
  const avgPractical = avg(practicalRates);
  const topSchools = nearbySchools
    .filter((s) => s[cfg.scoreCol] != null)
    .map((s) => ({ name: s.school_name, score: s[cfg.scoreCol] as number, distanceMiles: s.distanceMiles, profileUrl: `/schools/${s.slug}` }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // --- Labor Market (relevant professionals seeking placement + hiring
  // venues, both within LABOR_RADIUS_MILES) ---
  const nearbyPros = within(professionals, LABOR_RADIUS_MILES);
  const laborVenues = (within(venues, LABOR_RADIUS_MILES) as any[]).filter((v) => v.id !== entity.id);
  const laborHiringVenues = laborVenues.filter((v) => v.hiring_need || (v.booth_count_available || 0) >= 1);
  const seekingPlacement = nearbyPros.length;
  const laborRatio = seekingPlacement > 0 ? seekingPlacement / Math.max(laborHiringVenues.length, 1) : null;

  // --- Competitive Landscape (OTHER same-type venues within COMPETITION_RADIUS_MILES) ---
  const competitors = (within(venues, COMPETITION_RADIUS_MILES) as any[]).filter((v) => v.id !== entity.id);
  const competitorsHiring = competitors.filter((v) => v.hiring_need || (v.booth_count_available || 0) >= 1);

  // --- Supply Chain (relevant supply stores within SUPPLY_RADIUS_MILES) ---
  const nearbySupply = within(supplyStores, SUPPLY_RADIUS_MILES) as any[];
  const nearestSupply = [...nearbySupply].sort((a, b) => a.distanceMiles - b.distanceMiles)[0];

  // --- Rent Benchmark (booth rent across same-type venues within RENT_RADIUS_MILES) ---
  const rentVenues = (within(venues, RENT_RADIUS_MILES) as any[]).filter((v) => v.id !== entity.id);
  const rentPool = rentVenues.map((v) => parseWeeklyRent(v.rent_rate)).filter((v): v is number => v != null);
  const localMedianWeeklyRent = median(rentPool);
  const thisWeeklyRent = parseWeeklyRent(entity.rent_rate);
  const percentDiff = thisWeeklyRent != null && localMedianWeeklyRent
    ? ((thisWeeklyRent - localMedianWeeklyRent) / localMedianWeeklyRent) * 100
    : null;

  // --- Market demographics: distinct census tracts across the same-type
  // venue + labor sets within the widest (labor/rent) radius. ---
  const tractMap = new Map<string, { population: number; income: number | null }>();
  for (const r of [...laborVenues, ...nearbyPros] as any[]) {
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
    entityId: entity.id,
    entityType,
    radii: {
      talent: TALENT_RADIUS_MILES,
      labor: LABOR_RADIUS_MILES,
      competition: COMPETITION_RADIUS_MILES,
      supply: SUPPLY_RADIUS_MILES,
      rent: RENT_RADIUS_MILES,
    },
    talentPipeline: {
      schoolLabel: cfg.schoolLabel,
      schoolCount: nearbySchools.length,
      avgWrittenPassRate: avgWritten != null ? Math.round(avgWritten * 1000) / 10 : null,
      avgPracticalPassRate: avgPractical != null ? Math.round(avgPractical * 1000) / 10 : null,
      topSchools,
    },
    laborMarket: {
      professionalLabel: cfg.professionalLabel,
      seekingPlacement,
      hiringVenues: laborHiringVenues.length,
      ratio: laborRatio,
    },
    competition: {
      competitorLabel: cfg.competitorLabel,
      competitorCount: competitors.length,
      competitorsHiring: competitorsHiring.length,
    },
    supplyChain: {
      supplyLabel: cfg.supplyLabel,
      supplyStoreCount: nearbySupply.length,
      nearestSupplyStoreMiles: nearestSupply ? nearestSupply.distanceMiles : null,
      nearestSupplyStoreName: nearestSupply ? nearestSupply.name : null,
      nearestSupplyStoreProfileUrl: nearestSupply ? `/stores/${(nearestSupply as any).slug}` : null,
    },
    rentBenchmark: {
      thisWeeklyRent,
      localMedianWeeklyRent,
      percentDiff,
      sampleSize: rentPool.length,
      venueCount: rentVenues.length,
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
