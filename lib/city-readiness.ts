import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slug";

// Canonical 34-city sweep list. Own copy here (not imported) — the same
// list already lives in scripts/discover_and_stage_businesses.js (a plain
// CommonJS script that can't import from app/), ported originally from
// app/api/agents/traffic-optimization/run/route.ts. All three copies must
// be kept in sync by hand if this list ever changes.
export const TX_CITIES = [
  "houston", "katy", "pearland", "pasadena", "humble", "austin", "dallas",
  "san antonio", "sugar land", "the woodlands", "spring", "cypress",
  "missouri city", "baytown", "conroe", "league city", "fort worth",
  "el paso", "corpus christi", "plano", "laredo", "irving", "garland",
  "amarillo", "mckinney", "frisco", "brownsville", "pflugerville",
  "college station", "beaumont", "waco", "tyler", "sherman", "eagle pass",
];

// Exact same bar and reasoning as
// app/api/agents/market-expansion-readiness/run/route.ts's
// MIN_TOTAL_BUSINESSES/MIN_PER_CATEGORY — a page never launches
// barbershop-heavy with zero real salons, or vice versa.
export const MIN_TOTAL_BUSINESSES = 15;
export const MIN_PER_CATEGORY = 5;

// Cities with their own bespoke, hand-built hub (never routed through the
// generalized /[city] page) — currently just Houston. Keyed by slug.
export const BESPOKE_CITY_ROUTES: Record<string, string> = {
  houston: "/texas/houston",
};

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slugForCity(cityName: string): string {
  return slugify(cityName);
}

// Strict allow-list reverse lookup — never a fuzzy/loose match. Was
// originally load-bearing for safety since app/[city]/page.tsx sat at the
// app root and caught every unmatched single-segment path on the site; now
// that it's moved to app/texas/[city]/page.tsx that specific risk is gone,
// but there's no reason to loosen this now that it's safer.
export function citySlugToName(slug: string): string | null {
  const match = TX_CITIES.find((c) => slugify(c) === slug);
  return match ? titleCase(match) : null;
}

export interface CityReadiness {
  city: string;
  slug: string;
  shops: number;
  salons: number;
  total: number;
  qualifies: boolean;
}

// Mirrors countRealBusinesses() in the readiness agent route exactly
// (head-count-only, formatted_address ilike — the city column holds stale,
// unrelated seed data, confirmed live), looped over all 34 TX_CITIES
// instead of only agent_directives-approved ones. Cheap: 68 count-only
// queries, no row data. Used only where a slug list is needed before any
// full-row fetch (generateStaticParams) — /texas and /[city]'s own runtime
// gate already have the numbers they need from data they fetch anyway.
export async function getQualifyingCities(supabase: SupabaseClient): Promise<CityReadiness[]> {
  const results = await Promise.all(
    TX_CITIES.map(async (city) => {
      const filter = `%${city}%`;
      const [{ count: shops }, { count: salons }] = await Promise.all([
        supabase.from("agent_barbershop_leads").select("*", { count: "exact", head: true }).ilike("formatted_address", filter),
        supabase.from("agent_salon_leads").select("*", { count: "exact", head: true }).ilike("formatted_address", filter),
      ]);
      const shopCount = shops || 0;
      const salonCount = salons || 0;
      const total = shopCount + salonCount;
      return {
        city: titleCase(city),
        slug: slugify(city),
        shops: shopCount,
        salons: salonCount,
        total,
        qualifies: total >= MIN_TOTAL_BUSINESSES && shopCount >= MIN_PER_CATEGORY && salonCount >= MIN_PER_CATEGORY,
      };
    })
  );
  return results;
}
