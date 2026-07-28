import "server-only";
import { createClient } from "@supabase/supabase-js";
import { deriveLocation, median, fetchAllRows, MIN_SAMPLE } from "@/lib/compare-entities";

export { MIN_SAMPLE };

/**
 * Server-side index for /compare-schools.
 *
 * Lives in lib rather than in the page so the page and the Markdown export
 * at /compare-schools.md are built from one source and can never drift —
 * public/llms.txt promises AI crawlers that the two are always in sync.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SHARED = [
  "id", "slug", "school_name", "city", "formatted_address", "rating",
  "google_review_count", "accreditation_status", "annual_tuition",
];

const BARBER_EXAM = [
  "written_pass_rate_2026", "written_test_takers_2026",
  "practical_pass_rate_2026", "practical_test_takers_2026",
  "written_first_attempt_pass_rate_2026", "written_avg_attempts_to_pass_2026",
];

// Cosmetology Operator outcomes live in dedicated cosmetology_* columns so a
// dual-licensed school's Barber stats never collide with its Cosmetology stats.
const COSMETOLOGY_EXAM = [
  "cosmetology_written_pass_rate_2026", "cosmetology_written_test_takers_2026",
  "cosmetology_practical_pass_rate_2026", "cosmetology_practical_test_takers_2026",
  "cosmetology_written_first_attempt_pass_rate_2026", "cosmetology_written_avg_attempts_to_pass_2026",
];

export type LicenseType = "barber" | "cosmetology";

export interface CompareSchool {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  state: string | null;
  license: LicenseType;
  writtenPassRate: number | null;
  writtenTakers: number | null;
  practicalPassRate: number | null;
  firstAttemptRate: number | null;
  avgAttempts: number | null;
  tuition: number | null;
  rating: number | null;
  reviews: number | null;
  accredited: boolean;
}

export interface SchoolCityRollup {
  key: string;
  city: string;
  state: string;
  schools: number;
  medianWrittenPassRate: number | null;
  totalTakers: number;
}

function baseMap(row: any, license: LicenseType) {
  const { city, state } = deriveLocation(row);
  return {
    // A dual-licensed school appears on both tabs with its own real outcomes,
    // so the row id alone isn't unique across tabs.
    id: `${row.id}:${license}`,
    slug: row.slug,
    name: row.school_name,
    city: city || row.city || null,
    state,
    license,
    tuition: row.annual_tuition ?? null,
    // Postgres numerics arrive as strings like "4.80000"; round for the wire.
    rating: row.rating != null ? Math.round(Number(row.rating) * 10) / 10 : null,
    reviews: row.google_review_count ?? null,
    accredited: row.accreditation_status === "Accredited",
  };
}

function mapBarber(row: any): CompareSchool {
  return {
    ...baseMap(row, "barber"),
    writtenPassRate: row.written_pass_rate_2026 ?? null,
    writtenTakers: row.written_test_takers_2026 ?? null,
    practicalPassRate: row.practical_pass_rate_2026 ?? null,
    firstAttemptRate: row.written_first_attempt_pass_rate_2026 ?? null,
    avgAttempts: row.written_avg_attempts_to_pass_2026 ?? null,
  };
}

function mapCosmetology(row: any): CompareSchool {
  return {
    ...baseMap(row, "cosmetology"),
    writtenPassRate: row.cosmetology_written_pass_rate_2026 ?? null,
    writtenTakers: row.cosmetology_written_test_takers_2026 ?? null,
    practicalPassRate: row.cosmetology_practical_pass_rate_2026 ?? null,
    firstAttemptRate: row.cosmetology_written_first_attempt_pass_rate_2026 ?? null,
    avgAttempts: row.cosmetology_written_avg_attempts_to_pass_2026 ?? null,
  };
}

function rollupCities(schools: CompareSchool[]): SchoolCityRollup[] {
  const byCity = new Map<string, CompareSchool[]>();
  for (const s of schools) {
    if (!s.city || !s.state) continue;
    const key = `${s.city}, ${s.state}`;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key)!.push(s);
  }
  return Array.from(byCity.entries())
    .map(([key, list]) => ({
      key,
      city: list[0].city!,
      state: list[0].state!,
      schools: list.length,
      medianWrittenPassRate: median(
        list.map((s) => s.writtenPassRate).filter((r): r is number => r != null).map((r) => Math.round(r * 100))
      ),
      totalTakers: list.reduce((sum, s) => sum + (s.writtenTakers ?? 0), 0),
    }))
    .sort((a, b) => b.schools - a.schools);
}

export interface SchoolIndex {
  barber: CompareSchool[];
  cosmetology: CompareSchool[];
  barberCities: SchoolCityRollup[];
  cosmetologyCities: SchoolCityRollup[];
}

const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; value: Promise<SchoolIndex> } | null = null;

export function getSchoolIndex(): Promise<SchoolIndex> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = buildIndex().catch((e) => {
    cache = null; // never cache a failure
    throw e;
  });
  cache = { at: Date.now(), value };
  return value;
}

async function buildIndex(): Promise<SchoolIndex> {
  // Both tabs are about which EXAM's outcomes are shown, not which table the
  // row lives in — so each exam type is read from both school tables.
  const [barberA, barberB, cosA, cosB] = await Promise.all([
    fetchAllRows<any>(() =>
      supabase.from("agent_barber_school_leads").select([...SHARED, ...BARBER_EXAM].join(", ")).not("written_test_takers_2026", "is", null)),
    fetchAllRows<any>(() =>
      supabase.from("agent_cosmetology_school_leads").select([...SHARED, ...BARBER_EXAM].join(", ")).not("written_test_takers_2026", "is", null)),
    fetchAllRows<any>(() =>
      supabase.from("agent_cosmetology_school_leads").select([...SHARED, ...COSMETOLOGY_EXAM].join(", ")).not("cosmetology_written_test_takers_2026", "is", null)),
    fetchAllRows<any>(() =>
      supabase.from("agent_barber_school_leads").select([...SHARED, ...COSMETOLOGY_EXAM].join(", ")).not("cosmetology_written_test_takers_2026", "is", null)),
  ]);

  const barber = [...barberA, ...barberB].map(mapBarber).filter((s) => s.name);
  const cosmetology = [...cosA, ...cosB].map(mapCosmetology).filter((s) => s.name);

  return {
    barber,
    cosmetology,
    barberCities: rollupCities(barber),
    cosmetologyCities: rollupCities(cosmetology),
  };
}

export interface SchoolBenchmarks {
  rankedCount: number;
  medianWritten: number | null;
  medianFirstTry: number | null;
  medianTuition: number | null;
  above90: number;
  below70: number;
  totalTested: number;
  cityCount: number;
  barberCount: number;
  cosmetologyCount: number;
  /** Best-performing programs that clear the sample-size floor. */
  topSchools: CompareSchool[];
}

export async function getSchoolBenchmarks(): Promise<SchoolBenchmarks> {
  const { barber, cosmetology, barberCities, cosmetologyCities } = await getSchoolIndex();
  const ranked = [...barber, ...cosmetology].filter(
    (s) => s.writtenPassRate != null && (s.writtenTakers ?? 0) >= MIN_SAMPLE
  );
  const firstTry = ranked.filter((s) => s.firstAttemptRate != null);
  const tuitionKnown = ranked.filter((s) => s.tuition != null);

  return {
    rankedCount: ranked.length,
    medianWritten: median(ranked.map((s) => Math.round((s.writtenPassRate as number) * 100))),
    medianFirstTry: median(firstTry.map((s) => Math.round((s.firstAttemptRate as number) * 100))),
    medianTuition: median(tuitionKnown.map((s) => s.tuition as number)),
    above90: ranked.filter((s) => (s.writtenPassRate as number) >= 0.9).length,
    below70: ranked.filter((s) => (s.writtenPassRate as number) < 0.7).length,
    totalTested: ranked.reduce((sum, s) => sum + (s.writtenTakers ?? 0), 0),
    cityCount: new Set([...barberCities, ...cosmetologyCities].map((c) => c.key)).size,
    barberCount: barber.length,
    cosmetologyCount: cosmetology.length,
    // Rank by pass rate, then by cohort size so a 100%-from-5 doesn't
    // outrank a 98%-from-60.
    topSchools: [...ranked]
      .sort(
        (a, b) =>
          (b.writtenPassRate as number) - (a.writtenPassRate as number) ||
          (b.writtenTakers ?? 0) - (a.writtenTakers ?? 0)
      )
      .slice(0, 15),
  };
}
