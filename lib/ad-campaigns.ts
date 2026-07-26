import type { SupabaseClient } from "@supabase/supabase-js";

// Placement keys emitted by components/ads/AdTracker.tsx.
export const AD_PLACEMENTS = [
  "shop_profile",
  "salon_profile",
  "barber_supply_profile",
  "beauty_supply_profile",
  "state_hub_banner",
  "city_hub_banner",
  "search_results",
  "entity_bottom_banner",
] as const;

export const PLACEMENT_LABELS: Record<string, string> = {
  shop_profile: "Shop Profile Ad",
  salon_profile: "Salon Profile Ad",
  barber_supply_profile: "Barber Supply Profile Ad",
  beauty_supply_profile: "Beauty Supply Profile Ad",
  state_hub_banner: "State Hub Banner",
  city_hub_banner: "City Hub Banner",
  search_results: "Search Results Ad",
  entity_bottom_banner: "Entity Page Bottom Banner",
};

// The entity being advertised — its table (for lookup) and profile route (all
// ads navigate to the entity's profile page). Keys are stored in
// ad_campaigns.entity_type.
export const AD_ENTITY_TYPES: {
  key: string; label: string; table: string; route: string; nameCol: string; cityCol: string;
}[] = [
  { key: "shop", label: "Barbershop", table: "agent_barbershop_leads", route: "/shop", nameCol: "shop_name", cityCol: "city" },
  { key: "salon", label: "Salon", table: "agent_salon_leads", route: "/salons", nameCol: "shop_name", cityCol: "city" },
  { key: "barber", label: "Barber", table: "agent_barber_leads", route: "/barbers", nameCol: "name", cityCol: "metro_area" },
  { key: "cosmetologist", label: "Cosmetologist", table: "agent_cosmetologist_leads", route: "/cosmetologists", nameCol: "name", cityCol: "metro_area" },
  { key: "barber_school", label: "Barber School", table: "agent_barber_school_leads", route: "/schools", nameCol: "school_name", cityCol: "city" },
  { key: "cosmetology_school", label: "Cosmetology School", table: "agent_cosmetology_school_leads", route: "/schools", nameCol: "school_name", cityCol: "city" },
  { key: "barber_supply_store", label: "Barber Supply Store", table: "agent_barber_supply_store_leads", route: "/stores", nameCol: "name", cityCol: "city" },
  { key: "beauty_supply_store", label: "Beauty Supply Store", table: "agent_beauty_supply_store_leads", route: "/stores", nameCol: "name", cityCol: "city" },
  { key: "event", label: "Event", table: "events", route: "/events", nameCol: "title", cityCol: "city" },
];

export function entityTypeConfig(key: string | null | undefined) {
  return AD_ENTITY_TYPES.find((e) => e.key === key);
}

/** All ads link to the advertised entity's profile page. */
export function entityHref(entityType: string | null, slug: string | null): string | null {
  const t = entityTypeConfig(entityType);
  return t && slug ? `${t.route}/${slug}` : null;
}

// Entity PAGE types the entity_bottom_banner can be shown on. Empty selection =
// every type. Keys are the specific entity types (barber schools vs cosmetology
// schools, barber supply vs beauty supply are distinguished) — even though they
// share a URL route (/schools, /stores). getEntityBottomBannerAd resolves the
// viewed page's specific type by which table the slug lives in, then matches it.
export const BANNER_PAGE_TYPES: { key: string; label: string }[] = [
  { key: "shop", label: "Barbershops" },
  { key: "salon", label: "Salons" },
  { key: "barber", label: "Barbers" },
  { key: "cosmetologist", label: "Cosmetologists" },
  { key: "barber_school", label: "Barber Schools" },
  { key: "cosmetology_school", label: "Cosmetology Schools" },
  { key: "barber_supply_store", label: "Barber Supply Stores" },
  { key: "beauty_supply_store", label: "Beauty Supply Stores" },
];

// Search filter tabs an ad can be targeted to (the entity-result tabs; the
// non-entity tabs like AI Mode / Articles / Videos aren't ad-eligible).
export const SEARCH_AD_TABS = [
  "All",
  "Barbershops",
  "Salons",
  "Barbers",
  "Cosmetologist",
  "Schools",
  "Stores",
  "Events",
] as const;

export interface AdCampaign {
  id: string;
  user_id: string;
  name: string;
  placement: string;
  entity_type: string | null;
  creative: string | null; // the advertised entity's slug
  scope: string | null;
  filter_tabs: string[];
  target_states?: string[];
  target_cities?: string[];
  ad_eyebrow?: string | null;
  ad_headline?: string | null;
  ad_cta_label?: string | null;
  banner_page_types?: string[];
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface AdEvent {
  event_name: string; // ad_impression | ad_click
  metadata: any;
  created_at: string;
}

// Human-readable geo (city / state) a campaign is tracking, for the performance
// table. The geo lives in different columns per placement type: banner ads carry
// one location in `scope`; profile ads use the target_cities / target_states
// arrays; search ads are targeted by tab, not geo.
export function campaignGeoLabel(c: AdCampaign): string {
  if (c.placement === "state_hub_banner" || c.placement === "city_hub_banner") {
    return c.scope?.trim() || "All locations";
  }
  if (c.placement === "search_results") return "—"; // targeted by tab, not geo
  const parts = [...(c.target_cities || []), ...(c.target_states || [])];
  return parts.length ? parts.join(", ") : "All locations";
}

/**
 * A campaign owns an ad event when the placement matches and every non-null
 * narrowing dimension (creative, scope) matches too. A null creative/scope
 * means "any" for that dimension — e.g. a state-banner campaign scoped to
 * "Texas" but any creative.
 */
export function eventMatchesCampaign(ev: AdEvent, c: AdCampaign): boolean {
  const m = ev.metadata || {};
  if (m.placement !== c.placement) return false;
  if (c.creative && m.creative !== c.creative) return false;
  // Scope compared case/whitespace-insensitively to stay consistent with how
  // banner serving matches scope (getBannerCampaignAd) — otherwise a banner
  // could serve but silently report zero for the advertiser.
  if (c.scope && c.scope.trim().toLowerCase() !== String(m.scope || "").trim().toLowerCase()) return false;
  return true;
}

export interface CampaignPerf {
  campaign: AdCampaign;
  impressions: number;
  clicks: number;
}

export function aggregateCampaigns(campaigns: AdCampaign[], events: AdEvent[]): CampaignPerf[] {
  return campaigns.map((c) => {
    let impressions = 0;
    let clicks = 0;
    for (const ev of events) {
      if (!eventMatchesCampaign(ev, c)) continue;
      if (ev.event_name === "ad_impression") impressions++;
      else if (ev.event_name === "ad_click") clicks++;
    }
    return { campaign: c, impressions, clicks };
  });
}

/** Fetch the dedicated ad_impression/ad_click events (paginated). */
export async function fetchAdEvents(supabase: SupabaseClient, days?: number): Promise<AdEvent[]> {
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  let out: AdEvent[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("pixel_events")
      .select("event_name, metadata, created_at")
      .in("event_name", ["ad_impression", "ad_click"])
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error || !data) break;
    out = out.concat(data as AdEvent[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

export function ctrLabel(clicks: number, impressions: number): string {
  if (impressions === 0) return "—";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}
