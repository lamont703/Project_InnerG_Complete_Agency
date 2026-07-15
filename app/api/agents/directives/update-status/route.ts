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
async function publishDiscoveredBusiness(evidence: any): Promise<{ id: string; slug: string } | { error: string }> {
  const { table, name, city, formatted_address, phone, rating, reviewCount, latitude, longitude, images, place_types } = evidence;
  if (!table || !name) return { error: "Staged evidence is missing table/name — can't publish." };

  const id = crypto.randomUUID();
  const slug = buildSlug(name, city, id);
  const isShop = table === "agent_barbershop_leads";

  const nearbyAreas = computeNearbyAreas(latitude, longitude, city || "");

  const basePayload = {
    id,
    slug,
    shop_name: name,
    city,
    formatted_address: formatted_address || null,
    phone: phone || null,
    rating: rating ?? null,
    total_reviews: reviewCount ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    business_status: "OPERATIONAL",
    google_images: images || [],
    place_types: place_types || (isShop ? "barber_shop | point_of_interest | establishment" : "beauty_salon | point_of_interest | establishment"),
    nearby_areas: nearbyAreas.length > 0 ? nearbyAreas : null,
  };
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
