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
  // place_id is no longer required for these 3 tables (was: true) — Places
  // API discovery is dormant, browser-only scraping can't produce a real
  // place_id, and a full dependency audit confirmed place_id/contact_id are
  // never read or displayed anywhere in the app, dedup already works on
  // name+city alone for every sibling table, and the "contact_id mirrors
  // place_id" invariant wasn't even universal in live data (19% of real
  // agent_barber_school_leads rows already diverged). The DB NOT NULL
  // constraints backing this were relaxed in
  // supabase/migrations/20260715120000_relax_place_id_not_null_constraints.sql
  // (UNIQUE stays intact). place_id/mirrorPlaceIdTo still get set below
  // whenever a candidate DOES have one (e.g. if discoverViaPlacesAPI() is
  // ever re-enabled) — requiresPlaceId now only controls whether publish
  // hard-rejects a candidate for missing one, not whether it's used at all.
  agent_barber_school_leads: {
    nameField: "school_name", reviewCountField: "google_review_count", businessStatusField: "google_business_status",
    imagesField: "google_photos", hasPlaceTypes: false, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: "schools", defaultPlaceTypes: null, mirrorPlaceIdTo: "contact_id",
  },
  agent_cosmetology_school_leads: {
    nameField: "school_name", reviewCountField: "google_review_count", businessStatusField: "google_business_status",
    imagesField: "google_photos", hasPlaceTypes: false, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: "schools", defaultPlaceTypes: null,
  },
  agent_barber_supply_store_leads: {
    nameField: "name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: "stores", defaultPlaceTypes: "store | point_of_interest | establishment",
  },
  agent_beauty_supply_store_leads: {
    nameField: "name", reviewCountField: "total_reviews", businessStatusField: "business_status",
    imagesField: "google_images", hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: "stores", defaultPlaceTypes: "store | point_of_interest | establishment",
  },
};

// Applies to every table, both publish paths (manual Approve here, and
// Auto-Publish's mirror in scripts/auto_publish_audited_entities.js) — no
// override for either. category only started actually getting saved by the
// Entity Auditor once this same requirement was added, so an old candidate
// audited before that fix will correctly fail here until it's re-audited.
const REQUIRED_NON_EMPTY_FIELDS = ["city", "name", "phone", "formatted_address", "category"];
const MIN_PUBLISH_IMAGES = 5;

// Same normalization used by scripts/deduplication_agent.js,
// scripts/discover_and_stage_businesses.js, and Auto-Publish's mirror of
// this function — duplicated per this codebase's existing convention of
// not sharing small helpers between the Next.js app and the CommonJS
// scripts.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

async function fetchLivePhoneIndex(): Promise<Map<string, { table: string; name: string; id: string }>> {
  const index = new Map<string, { table: string; name: string; id: string }>();
  for (const [table, config] of Object.entries(TABLE_CONFIG)) {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase.from(table).select(`id, ${config.nameField}, phone`).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data as any[]) {
        const normalized = normalizePhone(row.phone);
        if (normalized && !index.has(normalized)) index.set(normalized, { table, name: row[config.nameField], id: row.id });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  return index;
}

async function publishDiscoveredBusiness(
  evidence: any,
  force = false
): Promise<{ id: string; slug: string } | { error: string } | { duplicateWarning: { table: string; name: string; id: string } }> {
  const { table, name, city, formatted_address, phone, rating, reviewCount, latitude, longitude, images, place_types, place_id, category } = evidence;
  const missingFields = REQUIRED_NON_EMPTY_FIELDS.filter((f) => !evidence?.[f]);
  if (missingFields.length > 0) {
    return { error: `Missing required field(s): ${missingFields.join(", ")}. This candidate isn't complete enough to publish.` };
  }
  if (!Array.isArray(images) || images.length < MIN_PUBLISH_IMAGES) {
    return { error: `Requires at least ${MIN_PUBLISH_IMAGES} real photos to publish (currently has ${Array.isArray(images) ? images.length : 0}).` };
  }
  const config = TABLE_CONFIG[table];
  if (!config) return { error: `Unsupported table for publishing: ${table}` };
  if (config.requiresPlaceId && !place_id) {
    return { error: `${table} requires a real Google place_id, which this staged candidate doesn't have. This entity type can only be discovered via the Google Places API, not the Maps-UI scraper.` };
  }

  // A warning, not a hard block — unlike Auto-Publish, a human is right
  // here making this decision and might have real context (e.g. a
  // genuine second location). Approving once surfaces the match; the
  // dashboard re-submits with force=true if the human confirms it's not
  // actually a duplicate.
  let duplicateMatch: { table: string; name: string; id: string } | null = null;
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    const livePhoneIndex = await fetchLivePhoneIndex();
    duplicateMatch = livePhoneIndex.get(normalizedPhone) || null;
  }
  if (duplicateMatch && !force) {
    return { duplicateWarning: duplicateMatch };
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
    google_category: category || null,
  };
  if (config.businessStatusField) basePayload[config.businessStatusField] = "OPERATIONAL";
  if (config.hasPlaceTypes) basePayload.place_types = place_types || config.defaultPlaceTypes;
  if (place_id) basePayload.place_id = place_id;
  if (config.mirrorPlaceIdTo && place_id) basePayload[config.mirrorPlaceIdTo] = place_id;
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
  const { id, status, reason, force } = await request.json().catch(() => ({}));

  if (!id || !["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "id and status ('approved'|'denied') are required" }, { status: 400 });
  }

  const { data: directive, error: fetchError } = await supabase
    .from("agent_directives")
    .select("agent_name, evidence, cleaned_evidence")
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
    // Entity Auditor writes its findings (backfilled photos, corrected
    // fields, audit notes) to cleaned_evidence, not evidence — prefer it
    // when present. Falls back to raw evidence for a candidate approved
    // without ever being audited, or a row from before cleaned_evidence
    // existed.
    const activeEvidence = directive.cleaned_evidence || directive.evidence;
    const result = await publishDiscoveredBusiness(activeEvidence, !!force);
    if ("duplicateWarning" in result) {
      // Not an error — status stays untouched, nothing published. The
      // dashboard shows this to the human and re-submits with force:true
      // if they confirm it's not actually a duplicate.
      return NextResponse.json({ duplicateWarning: result.duplicateWarning }, { status: 409 });
    }
    if ("error" in result) {
      // Status is deliberately NOT flipped on failure — the directive stays
      // pending/actionable so the human sees the real error instead of a
      // silently-lost finding.
      return NextResponse.json({ error: `Publish failed: ${result.error}` }, { status: 500 });
    }
    update.cleaned_evidence = {
      ...activeEvidence,
      publishedId: result.id,
      publishedSlug: result.slug,
      ...(force ? { publishedDespiteDuplicateWarning: true } : {}),
    };
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
