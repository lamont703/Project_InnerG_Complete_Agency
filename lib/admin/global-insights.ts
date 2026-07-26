import { createAdminClient } from "@/lib/supabase/admin";
import { TX_CITIES } from "@/lib/city-readiness";
import { CA_CITIES } from "@/lib/california-city-readiness";
import type { EntityTypeKey, GlobalInsightRow } from "@/lib/admin/global-insights-types";

// Data layer for the admin-only global Listing Insights leaderboard. Fetches the
// per-entity conversion aggregate (get_global_listing_insights) and enriches each
// row with a derived city + state — the schema has no `state` column, so we infer
// it from the entity's raw location text against the same TX_CITIES / CA_CITIES
// allow-lists the rest of the app uses to place a business in a state.
// Types + labels live in ./global-insights-types (client-safe, no server imports).

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Derive { city, state } from an entity's raw location string (formatted_address,
// metro_area, city, or address depending on type). State abbreviation in the text
// wins; otherwise we fall back to city-list membership (TX first, then CA, since
// some names — e.g. Pasadena — exist in both states).
export function deriveLocation(raw: string | null | undefined): { city: string; state: "TX" | "CA" | "Unknown" } {
  const t = (raw || "").toLowerCase();
  let state: "TX" | "CA" | "Unknown" =
    /\bca\b|california/.test(t) ? "CA" : /\btx\b|texas/.test(t) ? "TX" : "Unknown";

  const find = (list: readonly string[]) => list.find((c) => t.includes(c)) || null;

  let city: string | null = null;
  if (state === "CA") city = find(CA_CITIES);
  else if (state === "TX") city = find(TX_CITIES);

  if (!city) {
    const tx = find(TX_CITIES);
    const ca = find(CA_CITIES);
    if (tx) { city = tx; if (state === "Unknown") state = "TX"; }
    else if (ca) { city = ca; if (state === "Unknown") state = "CA"; }
  }

  return { city: city ? titleCase(city) : "Unknown", state };
}

export async function fetchGlobalInsights(cutoff?: Date): Promise<GlobalInsightRow[]> {
  const admin = createAdminClient();
  const p_cutoff = cutoff ? cutoff.toISOString() : null;

  // PostgREST caps a single response at 1000 rows, which silently truncated the
  // leaderboard. Page through the full result set ordered by the unique slug
  // (deterministic, so no dupes/skips across pages); the client re-sorts by
  // leads. Hard guard against a runaway loop.
  const PAGE = 1000;
  const raw: any[] = [];
  for (let from = 0; from <= 100000; from += PAGE) {
    const { data, error } = await (admin as any)
      .rpc("get_global_listing_insights", { p_cutoff })
      .order("slug", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    raw.push(...data);
    if (data.length < PAGE) break;
  }

  return raw.map((r) => {
    const visits = Number(r.visits) || 0;
    const totalLeads = Number(r.total_leads) || 0;
    const { city, state } = deriveLocation(r.location);
    return {
      route: r.route,
      entityType: r.entity_type as EntityTypeKey,
      slug: r.slug,
      name: r.name,
      city,
      state,
      visits,
      uniqueVisitors: Number(r.unique_visitors) || 0,
      callClicks: Number(r.call_clicks) || 0,
      websiteClicks: Number(r.website_clicks) || 0,
      emailClicks: Number(r.email_clicks) || 0,
      totalLeads,
      convRate: visits > 0 ? totalLeads / visits : 0,
    };
  });
}
