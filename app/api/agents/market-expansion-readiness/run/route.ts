import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { upsertFinding, resolveStaleFindings, fetchAgentHistory } from "@/lib/agent-directives";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AGENT_NAME = "Market Expansion Readiness Agent";
const MISSION =
  "Closes the loop on the expansion pipeline: watches every city you've approved for expansion (Google Ads Agent's city_expansion_opportunity findings) and tells you the moment real, published business data there is substantial enough to justify building a dedicated page.";
const SOURCE_AGENT = "Google Ads Agent";

// Grounded in real precedent from this platform's own published city pages
// (checked live against agent_barbershop_leads/agent_salon_leads): Pearland
// (11 barbershops + 12 salons = 23 real rows) was judged ready; Sugar Land
// was judged too thin at 2 barbershops + 0 salons before its own discovery
// run later filled it out. These thresholds sit comfortably between those
// two real data points, and require BOTH categories to have real coverage
// (not just one) so a page never launches barbershop-heavy with zero real
// salons, or vice versa.
const MIN_TOTAL_BUSINESSES = 15;
const MIN_PER_CATEGORY = 5;

// Matches Google Ads Agent's own real-coverage method: filter by
// formatted_address, not the `city` column. The `city` column holds old,
// unrelated seed/outreach data — confirmed live against this same table,
// it has a suspiciously uniform ~19 rows per city across dozens of Texas
// cities regardless of real market size, nothing like real discovered
// coverage.
async function countRealBusinesses(city: string): Promise<{ shops: number; salons: number }> {
  const [{ count: shops }, { count: salons }] = await Promise.all([
    supabase.from("agent_barbershop_leads").select("*", { count: "exact", head: true }).ilike("formatted_address", `%${city}%`),
    supabase.from("agent_salon_leads").select("*", { count: "exact", head: true }).ilike("formatted_address", `%${city}%`),
  ]);
  return { shops: shops || 0, salons: salons || 0 };
}

export async function POST() {
  const { data: approvedDirectives, error } = await supabase
    .from("agent_directives")
    .select("evidence")
    .eq("agent_name", SOURCE_AGENT)
    .eq("status", "approved");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Real market-insight signal, carried over from the Google Ads Agent
  // finding that justified expanding into this city in the first place —
  // so the readiness directive reflects demand as well as data collected,
  // not data alone.
  const expansionByCity = new Map<string, number | null>();
  for (const d of (approvedDirectives || []) as any[]) {
    if (d.evidence?.type === "city_expansion_opportunity" && d.evidence?.city) {
      expansionByCity.set(d.evidence.city as string, d.evidence.estimatedMonthlyVolume ?? null);
    }
  }
  const cities = Array.from(expansionByCity.keys());

  const scopeKeys = cities.map((c) => `content_page_ready::${c.toLowerCase()}`);
  const stillReady = new Set<string>();
  const readyFindings: { city: string; shops: number; salons: number; total: number; estimatedMonthlyVolume: number | null }[] = [];

  for (const city of cities) {
    const { shops, salons } = await countRealBusinesses(city);
    const total = shops + salons;
    if (total >= MIN_TOTAL_BUSINESSES && shops >= MIN_PER_CATEGORY && salons >= MIN_PER_CATEGORY) {
      readyFindings.push({ city, shops, salons, total, estimatedMonthlyVolume: expansionByCity.get(city) ?? null });
      stillReady.add(`content_page_ready::${city.toLowerCase()}`);
    }
  }

  const resolvedCount = await resolveStaleFindings(supabase, AGENT_NAME, scopeKeys, stillReady);

  if (readyFindings.length === 0) {
    return NextResponse.json({ citiesChecked: cities.length, ready: 0, inserted: 0, resolved: resolvedCount });
  }

  const history = await fetchAgentHistory(supabase, AGENT_NAME);

  const prompt = `You are the Market Expansion Readiness Agent for a barber & cosmetology industry directory site.
Mission: ${MISSION}

Each item below is a Texas city you've already approved for market expansion (via the Google Ads Agent) that now has real, audited business data collected — enough to justify building it a dedicated city page (same pattern as the site's existing city pages). shops/salons/total are real counts of live rows for that city, not estimates. estimatedMonthlyVolume (may be null) is the real Keyword Planner search-demand estimate that justified expanding into this city in the first place — the market-insight signal, not the data-collection signal.

You have memory of your own past runs. Recently denied — don't re-suggest unless something has clearly changed: ${JSON.stringify(history.recentDenials)}
Still open and recurring: ${JSON.stringify(history.recurringOpen)}

For each item, write one concise, direct directive (2-3 sentences) that ties BOTH signals together — the real demand that justified expanding here, and the real business data now collected — and recommends building the dedicated page next.

Data:
${JSON.stringify(readyFindings, null, 2)}

Return ONLY valid JSON: an array of objects, each { "index": <0-based position>, "directive_text": "..." }.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Gemini request failed: ${err.message || err}`, resolved: resolvedCount }, { status: 502 });
  }

  let directives: { index: number; directive_text: string }[] = [];
  try {
    directives = JSON.parse(response.text || "[]");
  } catch {
    return NextResponse.json({ error: "Failed to parse LLM directive output" }, { status: 500 });
  }

  let insertedCount = 0;
  for (let i = 0; i < readyFindings.length; i++) {
    const f = readyFindings[i];
    const match = directives.find((d) => d.index === i);
    const { inserted } = await upsertFinding(supabase, {
      agentName: AGENT_NAME,
      mission: MISSION,
      subjectKey: `content_page_ready::${f.city.toLowerCase()}`,
      directiveText:
        match?.directive_text ||
        `${f.city} now has ${f.shops} real barbershop(s) and ${f.salons} real salon(s) (${f.total} total)${
          f.estimatedMonthlyVolume ? `, backed by ~${f.estimatedMonthlyVolume}/mo real search demand` : ""
        } — enough to justify building a dedicated city page. Directive: Review and build the page.`,
      evidence: {
        type: "content_page_ready",
        city: f.city,
        shopCount: f.shops,
        salonCount: f.salons,
        total: f.total,
        estimatedMonthlyVolume: f.estimatedMonthlyVolume,
      },
    });
    if (inserted) insertedCount++;
  }

  return NextResponse.json({ citiesChecked: cities.length, ready: readyFindings.length, inserted: insertedCount, resolved: resolvedCount });
}
