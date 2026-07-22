import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slug";
import { MIN_TOTAL_BUSINESSES, MIN_PER_CATEGORY, slugForCity, type CityReadiness } from "@/lib/city-readiness";

// California twin of lib/city-readiness.ts's TX_CITIES — same 34-city sweep
// list already used by scripts/discover_and_stage_businesses_california.js
// (own copy there since that's a plain CommonJS script that can't import
// from app/). This is a first-draft population-based list, not yet
// validated against real Google Ads/GSC keyword-demand research the way
// the Texas list's cities were — see that script's own header comment.
export const CA_CITIES = [
  "los angeles", "san diego", "san jose", "san francisco", "fresno",
  "sacramento", "long beach", "oakland", "bakersfield", "anaheim",
  "santa ana", "riverside", "stockton", "irvine", "chula vista",
  "fremont", "san bernardino", "modesto", "fontana", "oxnard",
  "moreno valley", "glendale", "huntington beach", "santa clarita",
  "garden grove", "oceanside", "rancho cucamonga", "santa rosa",
  "ontario", "elk grove", "corona", "lancaster", "palmdale", "salinas",
];

// No California city has its own bespoke, hand-built hub yet (unlike
// Texas's Houston) — every qualifying California city routes through the
// generalized /california/[city] page. Keyed by slug, same shape as
// city-readiness.ts's BESPOKE_CITY_ROUTES so the [city]/[city]/[zip] pages
// can use the same conditional unchanged if one is ever added here.
export const CA_BESPOKE_CITY_ROUTES: Record<string, string> = {};

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Strict allow-list reverse lookup, same reasoning as citySlugToName in
// city-readiness.ts — never a fuzzy/loose match.
export function citySlugToNameCA(slug: string): string | null {
  const match = CA_CITIES.find((c) => slugify(c) === slug);
  return match ? titleCase(match) : null;
}

// Same logic as getQualifyingCities in city-readiness.ts, looped over
// CA_CITIES instead of TX_CITIES.
export async function getQualifyingCitiesCA(supabase: SupabaseClient): Promise<CityReadiness[]> {
  const results = await Promise.all(
    CA_CITIES.map(async (city) => {
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

export { slugForCity };
