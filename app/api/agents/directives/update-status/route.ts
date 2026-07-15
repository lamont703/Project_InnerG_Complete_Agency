import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSlug } from "@/lib/slug";
import { computeNearbyAreas } from "@/lib/nearby-areas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";
const MARKET_EXPANSION_READINESS_AGENT = "Market Expansion Readiness Agent";
const GOOGLE_ADS_AGENT = "Google Ads Agent";

// Business Discovery Agent doesn't insert into the live tables at
// discovery time (unlike the other agents, which only ever recommend
// action on things that already exist) — it stages a real scraped
// business as a directive, and Approve is the moment it actually becomes
// a live row. This is deliberate: a fully autonomous scrape-and-publish
// pipeline would eventually publish a scraper mistake straight to
// production (this session already caught several — wrong ratings, a
// garbage "Results" name, missing addresses from a DOM-scoping bug) with
// no human ever looking at it first.
// Per-table shape config — schools and supply stores turned out to need
// more than just a different name field once we actually queried their
// real schemas live:
//   - agent_barber_school_leads/agent_cosmetology_school_leads use
//     school_name (not shop_name), google_review_count (not
//     total_reviews), google_business_status (not business_status),
//     google_photos (not google_images), and have NO place_types column
//     at all.
//   - agent_cosmetology_school_leads has place_id nullable, so a
//     Maps-scrape insert succeeds — it's just thinner than a real
//     TDLR-CSV-imported row (no license/pass-rate data), same honest
//     situation as any newly-discovered business that hasn't been
//     through a separate enrichment pass yet.
//   - agent_barber_school_leads is DIFFERENT from its cosmetology sibling:
//     it started life as a CRM outreach-tracking table (migration 167)
//     and still carries a legacy `contact_id TEXT UNIQUE NOT NULL`
//     column. Confirmed live (a real failed publish attempt against a
//     Puppeteer-scraped candidate, then inspecting real rows): every
//     genuine row sets contact_id = place_id, so this table needs a real
//     place_id exactly like the supply-store tables below — mirrorPlaceIdTo
//     handles copying it into contact_id at insert time.
//   - agent_barber_supply_store_leads/agent_beauty_supply_store_leads use
//     `name` (not shop_name) and have `place_id TEXT UNIQUE NOT NULL` —
//     confirmed live via a real failed test insert (error 23502). The
//     Maps-UI search-results page never exposes a real place_id, so these
//     can only be discovered via the real Google Places API (which does
//     return one) — requiresPlaceId below rejects anything missing one
//     rather than silently failing at the DB layer with a cryptic error.
//   - Neither school nor store tables have a `nearby_areas` column (that
//     migration only touched barbershop/salon leads).
const TABLE_CONFIG: Record<
  string,
  {
    nameField: string;
    reviewCountField: string;
    businessStatusField: string | null;
    imagesField: string;
    hasPlaceTypes: boolean;
    requiresPlaceId: boolean;
    supportsNearbyAreas: boolean;
    routePrefix: string;
    defaultPlaceTypes: string | null;
    mirrorPlaceIdTo?: string;
  }
> = {
  agent_barbershop_leads: {
    nameField: "shop_name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: true,
    routePrefix: "shop", defaultPlaceTypes: "barber_shop | point_of_interest | establishment",
  },
  agent_salon_leads: {
    nameField: "shop_name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: true,
    routePrefix: "salons", defaultPlaceTypes: "beauty_salon | point_of_interest | establishment",
  },
  agent_barber_school_leads: {
    nameField: "school_name", reviewCountField: "google_review_count", businessStatusField: "google_business_status",
    imagesField: "google_photos", hasPlaceTypes: false, requiresPlaceId: true, supportsNearbyAreas: false,
    routePrefix: "schools", defaultPlaceTypes: null, mirrorPlaceIdTo: "contact_id",
  },
  agent_cosmetology_school_leads: {
    nameField: "school_name", reviewCountField: "google_review_count", businessStatusField: "google_business_status",
    imagesField: "google_photos", hasPlaceTypes: false, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: "schools", defaultPlaceTypes: null,
  },
  agent_barber_supply_store_leads: {
    nameField: "name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: true, supportsNearbyAreas: false,
    routePrefix: "stores", defaultPlaceTypes: "store | point_of_interest | establishment",
  },
  agent_beauty_supply_store_leads: {
    nameField: "name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: true, supportsNearbyAreas: false,
    routePrefix: "stores", defaultPlaceTypes: "store | point_of_interest | establishment",
  },
};

async function publishDiscoveredBusiness(evidence: any): Promise<{ id: string; slug: string } | { error: string }> {
  const { table, name, city, formatted_address, phone, rating, reviewCount, latitude, longitude, images, place_types, place_id } = evidence;
  if (!table || !name) return { error: "Staged evidence is missing table/name — can't publish." };
  const config = TABLE_CONFIG[table];
  if (!config) return { error: `Unsupported table for publishing: ${table}` };
  if (config.requiresPlaceId && !place_id) {
    return { error: `${table} requires a real Google place_id, which this staged candidate doesn't have. This entity type can only be discovered via the Google Places API, not the Maps-UI scraper.` };
  }

  const id = crypto.randomUUID();
  const slug = buildSlug(name, city, id);
  const isShop = table === "agent_barbershop_leads";
  const nearbyAreas = config.supportsNearbyAreas ? computeNearbyAreas(latitude, longitude, city || "") : [];

  const basePayload: Record<string, any> = {
    id,
    slug,
    [config.nameField]: name,
    city,
    formatted_address: formatted_address || null,
    phone: phone || null,
    rating: rating ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    [config.reviewCountField]: reviewCount ?? null,
    [config.imagesField]: images || [],
  };
  if (config.businessStatusField) basePayload[config.businessStatusField] = "OPERATIONAL";
  if (config.hasPlaceTypes) basePayload.place_types = place_types || config.defaultPlaceTypes;
  if (config.requiresPlaceId) basePayload.place_id = place_id;
  if (config.mirrorPlaceIdTo) basePayload[config.mirrorPlaceIdTo] = place_id;
  if (config.supportsNearbyAreas && nearbyAreas.length > 0) basePayload.nearby_areas = nearbyAreas;
  const insertPayload = isShop ? { ...basePayload, hiring_need: false, booth_count_available: 0 } : basePayload;

  const { error } = await supabase.from(table).insert(insertPayload);
  if (error) return { error: error.message };
  return { id, slug };
}

// Closes the loop between Market Expansion Readiness Agent and the Google
// Ads Agent finding that started the expansion in the first place: once
// you've approved "this city has enough real data, build the page," the
// original city_expansion_opportunity directive is handled — leaving it
// open would let Google Ads Agent keep quietly re-surfacing a city you've
// already fully built out. Best-effort: this is a secondary consistency
// cleanup, not something that should block or fail the actual approval.
async function resolveSourceExpansionDirective(city: string): Promise<void> {
  const { error } = await supabase
    .from("agent_directives")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("agent_name", GOOGLE_ADS_AGENT)
    .eq("subject_key", `city_expansion_opportunity::${city.toLowerCase()}`)
    .in("status", ["pending", "approved"]);
  if (error) console.error("resolveSourceExpansionDirective failed:", error.message);
}

export async function POST(request: Request) {
  const { id, status, reason } = await request.json().catch(() => ({}));

  if (!id || !["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "id and status ('approved'|'denied') are required" }, { status: 400 });
  }

  const { data: directive, error: fetchError } = await supabase
    .from("agent_directives")
    .select("agent_name, evidence")
    .eq("id", id)
    .single();
  if (fetchError || !directive) {
    return NextResponse.json({ error: fetchError?.message || "Directive not found" }, { status: 404 });
  }

  const update: Record<string, any> = { status, resolved_at: new Date().toISOString() };
  // Captured so future runs can adapt — e.g. a check that keeps getting
  // denied as "too minor" can raise its own threshold instead of repeating
  // the same low-value noise (see lib/agent-directives.ts).
  if (status === "denied" && reason) update.deny_reason = reason;

  if (status === "approved" && directive.agent_name === BUSINESS_DISCOVERY_AGENT) {
    const result = await publishDiscoveredBusiness(directive.evidence);
    if ("error" in result) {
      // Status is deliberately NOT flipped on failure — the directive stays
      // pending/actionable so the human sees the real error instead of a
      // silently-lost finding.
      return NextResponse.json({ error: `Publish failed: ${result.error}` }, { status: 500 });
    }
    update.evidence = { ...directive.evidence, publishedId: result.id, publishedSlug: result.slug };
  }

  if (status === "approved" && directive.agent_name === MARKET_EXPANSION_READINESS_AGENT && directive.evidence?.type === "content_page_ready" && directive.evidence?.city) {
    await resolveSourceExpansionDirective(directive.evidence.city);
  }

  const { error } = await supabase.from("agent_directives").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
