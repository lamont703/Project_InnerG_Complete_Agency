import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleAdsApi, enums } from "google-ads-api";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { upsertFinding, resolveStaleFindings, fetchAgentHistory } from "@/lib/agent-directives";
import { internalEnv } from "@/lib/google-internal-oauth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AGENT_NAME = "Google Ads Agent";
const MISSION =
  "Find real market-wide keyword opportunities Search Console can't see — content gaps, city-expansion demand, real seasonality, and rising competitive pressure.";

const LANGUAGE_ENGLISH = "languageConstants/1000";
const GEO_TEXAS = "geoTargetConstants/21176";

// Bounded on purpose — this is the first-ever build, keep API usage modest
// until we know real quota/latency behavior under Basic Access.
const TOP_CITIES_FOR_CONTENT_GAP = 5;
const SERVICE_TERMS = ["barbershop", "hair salon", "beauty salon"];
const CANDIDATE_EXPANSION_CITIES = [
  "Austin", "Fort Worth", "San Antonio", "Frisco", "McKinney", "The Woodlands", "Conroe", "League City",
];

const CONTENT_GAP_MIN_VOLUME = 50;
const CONTENT_GAP_MAX_COMPETITION_INDEX = 60;
const CITY_EXPANSION_MIN_VOLUME = 100;
const SEASONAL_SPIKE_RATIO = 2.0; // a month at least 2x the average of other months
const COMPETITIVE_PRESSURE_MIN_INDEX_RISE = 15; // competition_index points

const GSC_LOOKBACK_DAYS = 60;
const GSC_LAG_DAYS = 3;

const ENTITY_TYPE_BY_PATH: { pattern: RegExp; type: string }[] = [
  { pattern: /\/shop\//, type: "barbershop" },
  { pattern: /\/barbers\//, type: "barbershop" },
  { pattern: /\/salons\//, type: "salon" },
  { pattern: /\/cosmetologists\//, type: "salon" },
  { pattern: /\/schools\//, type: "school" },
  { pattern: /\/stores\//, type: "store" },
];
function inferPageEntityType(url: string): string | null {
  for (const { pattern, type } of ENTITY_TYPE_BY_PATH) {
    if (pattern.test(url)) return type;
  }
  return null;
}
const QUERY_INTENT_KEYWORDS: { keywords: string[]; type: string }[] = [
  { keywords: ["school", "academy", "institute"], type: "school" },
  { keywords: ["supply", "supplies", "wholesale"], type: "store" },
  { keywords: ["salon", "nail", "hair color", "spa", "wax", "brow", "lash", "hairdresser", "hair stylist", "stylist"], type: "salon" },
  { keywords: ["barber", "barbershop", "fade", "clippers", "shave"], type: "barbershop" },
];
function inferQueryIntentType(query: string): string | null {
  const lower = query.toLowerCase();
  for (const { keywords, type } of QUERY_INTENT_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return null;
}
// Single-category classification (above) is right for a KEYWORD, which
// almost always has one clear intent. It's wrong for a hub PAGE's title +
// description, which can legitimately cover several categories at once —
// e.g. /houston's description mentions salons AND schools, so returning
// only the first match ("school", since it's earlier in the array) would
// silently fail to credit it for covering salons at all. This checks
// whether the text matches a SPECIFIC type, independent of ordering.
function textMatchesIntentType(text: string, type: string): boolean {
  const lower = text.toLowerCase();
  const entry = QUERY_INTENT_KEYWORDS.find((e) => e.type === type);
  return entry ? entry.keywords.some((k) => lower.includes(k)) : false;
}

// Real existing-CONTENT check, distinct from entityNameCorpus below (which
// only answers "do we have the DATA?"). A keyword can have plenty of real
// entities behind it and still get misclassified as content_gap if the
// only page that could serve it already exists but isn't checked — e.g.
// /houston already covers "salons" in its own title/description, but a
// keyword-only entity check has no way to know that. Static
// `export const metadata = {...}` pages only (dynamic entity detail pages
// use generateMetadata() per-slug and aren't "hub" content a broad keyword
// like "hair stylist houston texas" would target). Same recursive
// file-walk already proven in app/sitemap.ts's getRoutes(), extended to
// capture each page's real file path directly during the walk (rather
// than reconstructing it from the route string afterward, which would
// break for routes inside a route-group folder like app/(marketing)/).
function getHubPageFileEntries(dir: string, baseRoute: string = ""): { route: string; filePath: string }[] {
  const entries: { route: string; filePath: string }[] = [];
  if (!fs.existsSync(dir)) return entries;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    // /insights/ is a distinct content genre (data/analysis reports, e.g.
    // exam pass-rate rosters) — confirmed live: "El Paso Barber Market
    // Rescue Report" shares "barber"/"El Paso" vocabulary with a real
    // directory-intent keyword but is not a page anyone searching for a
    // barbershop actually wants, and matching on shared vocabulary alone
    // produced a real false positive. Excluded here rather than loosening
    // the keyword matching, since the two content genres are fundamentally
    // different regardless of how precise the keyword lists get.
    if (file === "api" || file === "insights" || file.startsWith("_") || file.startsWith(".") || file.startsWith("[")) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const nextBaseRoute = file.startsWith("(") && file.endsWith(")") ? baseRoute : `${baseRoute}/${file}`;
      entries.push(...getHubPageFileEntries(fullPath, nextBaseRoute));
    } else if (file === "page.tsx") {
      entries.push({ route: baseRoute === "" ? "/" : baseRoute, filePath: fullPath });
    }
  }
  return entries;
}

function getHubPageCorpus(): { route: string; title: string; description: string }[] {
  const appDir = path.join(process.cwd(), "app");
  const corpus: { route: string; title: string; description: string }[] = [];
  for (const { route, filePath } of getHubPageFileEntries(appDir)) {
    let source: string;
    try {
      source = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }
    const titleMatch = source.match(/title:\s*["'`]([^"'`]+)["'`]/);
    const descMatch = source.match(/description:\s*["'`]([^"'`]+)["'`]/);
    if (titleMatch && descMatch) corpus.push({ route, title: titleMatch[1], description: descMatch[1] });
  }
  return corpus;
}

function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const zipIdx = parts.findIndex((p) => /\b\d{5}\b/.test(p));
  if (zipIdx <= 0) return null;
  const candidate = parts[zipIdx - 1];
  if (!candidate || /^\d/.test(candidate) || /^(suite|ste|unit|#)/i.test(candidate)) return null;
  return candidate;
}

async function getRealServiceCities(): Promise<{ city: string; count: number }[]> {
  const [{ data: shops }, { data: salons }] = await Promise.all([
    supabase.from("agent_barbershop_leads").select("formatted_address"),
    supabase.from("agent_salon_leads").select("formatted_address"),
  ]);
  const counts = new Map<string, number>();
  for (const row of [...(shops || []), ...(salons || [])]) {
    const city = extractCityFromAddress(row.formatted_address);
    if (city) counts.set(city, (counts.get(city) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}

function num(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST() {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_GSC_REFRESH_TOKEN", "GSC_SITE_URL"].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    return NextResponse.json({ error: "Not fully configured", missing_env_vars: missing }, { status: 503 });
  }

  const adsClient = new GoogleAdsApi({
    client_id: internalEnv().GOOGLE_CLIENT_ID!,
    client_secret: internalEnv().GOOGLE_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  const customer = adsClient.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  const oauth2Client = new google.auth.OAuth2(internalEnv().GOOGLE_CLIENT_ID, internalEnv().GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_GSC_REFRESH_TOKEN });
  const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });
  const siteUrl = process.env.GSC_SITE_URL!;

  const findings: any[] = [];
  const scope: Record<string, Set<string>> = {
    content_gap: new Set(),
    low_hanging_fruit: new Set(),
    city_expansion_opportunity: new Set(),
    seasonal_pattern: new Set(),
    competitive_pressure_increase: new Set(),
  };

  // ---- 1 & 2 & 4 & 5: content gap / low-hanging fruit / seasonality / competitive pressure ----
  // One combined pull: real seeds built from cities we actually operate in
  // (not guessed), with 12-month historical data requested so the same
  // response can drive both content-gap detection and real seasonality —
  // no need for a separate call per feature.
  const realCities = await getRealServiceCities();
  const topCities = realCities.slice(0, TOP_CITIES_FOR_CONTENT_GAP).map((c) => c.city);
  const contentGapSeeds = topCities.flatMap((city) => SERVICE_TERMS.map((term) => `${term} ${city} tx`));

  let contentGapIdeas: any[] = [];
  if (contentGapSeeds.length > 0) {
    const response = await customer.keywordPlanIdeas.generateKeywordIdeas(
      {
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
        language: LANGUAGE_ENGLISH,
        geo_target_constants: [GEO_TEXAS],
        keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
        keyword_seed: { keywords: contentGapSeeds },
        historical_metrics_options: { include_average_cpc: false },
      } as any
    );
    contentGapIdeas = (response as any) || [];
  }

  // Real GSC queries with any impressions in the last ~60 days — used to
  // decide whether a real-demand keyword is a true gap (we're invisible for
  // it) or something we already have some footprint on.
  const gscEnd = new Date(Date.now() - GSC_LAG_DAYS * 86_400_000).toISOString().slice(0, 10);
  const gscStart = new Date(Date.now() - (GSC_LAG_DAYS + GSC_LOOKBACK_DAYS) * 86_400_000).toISOString().slice(0, 10);
  const gscRes = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: gscStart, endDate: gscEnd, dimensions: ["query"], rowLimit: 25000 },
  });
  const gscQueries = new Set(((gscRes.data.rows || []) as any[]).map((r) => (r.keys![0] as string).toLowerCase().trim()));

  // hasRelevantEntity (below) tells us whether we have the DATA to serve a
  // keyword well; pageCorpus (getHubPageCorpus) tells us whether a real
  // PAGE already targets it — genuinely different questions, both needed
  // to classify content_gap vs. low_hanging_fruit correctly.
  const [{ data: shopNames }, { data: salonNames }] = await Promise.all([
    supabase.from("agent_barbershop_leads").select("shop_name").limit(2000),
    supabase.from("agent_salon_leads").select("shop_name").limit(2000),
  ]);
  const entityNameCorpus = [...(shopNames || []).map((r) => r.shop_name), ...(salonNames || []).map((r) => r.shop_name)]
    .filter(Boolean)
    .map((n) => n.toLowerCase());
  const pageCorpus = getHubPageCorpus();

  for (const idea of contentGapIdeas) {
    const keywordText = idea.text as string;
    if (!keywordText) continue;
    const metrics = idea.keyword_idea_metrics || {};
    const avgVolume = num(metrics.avg_monthly_searches);
    const competitionIndex = num(metrics.competition_index);
    const lowerKeyword = keywordText.toLowerCase();
    scope.content_gap.add(lowerKeyword);
    scope.low_hanging_fruit.add(lowerKeyword);

    if (avgVolume == null || avgVolume < CONTENT_GAP_MIN_VOLUME) continue;
    if (competitionIndex != null && competitionIndex > CONTENT_GAP_MAX_COMPETITION_INDEX) continue;
    if (gscQueries.has(lowerKeyword)) continue; // already have real footprint — not a gap

    const impliedType = inferQueryIntentType(keywordText);
    const hasRelevantEntity = impliedType && entityNameCorpus.some((n) => n.includes(impliedType === "barbershop" ? "barber" : impliedType));
    // A relevant PAGE (not just entities) already covering this same real
    // intent (same category + same city) makes this low-hanging fruit in
    // the original, literal sense: sharpen an existing page's title/meta/
    // copy, don't build new content. Checked separately from entity
    // matching — a city can have abundant real data and still lack a page
    // whose SEO copy actually targets this exact phrasing (or vice versa).
    // Require an explicit city match, never skip it — confirmed live: with
    // an optional check ("skip city filtering if we can't identify one"),
    // "cosmetology school lubbock" incorrectly matched /houston purely on
    // category, with no real geographic relevance at all. Safer to treat
    // "can't identify the city" as "can't confirm a match" than to let a
    // same-category page anywhere in Texas match.
    const cityInKeyword = topCities.find((c) => keywordText.toLowerCase().includes(c.toLowerCase()));
    const matchedPage =
      impliedType && cityInKeyword
        ? pageCorpus.find((p) => {
            const pageText = `${p.title} ${p.description}`.toLowerCase();
            if (!pageText.includes(cityInKeyword.toLowerCase())) return false;
            return textMatchesIntentType(pageText, impliedType);
          })
        : undefined;
    const type = matchedPage ? "low_hanging_fruit" : "content_gap";

    findings.push({
      type,
      keyword: keywordText,
      avgMonthlySearches: avgVolume,
      competition: metrics.competition || null,
      competitionIndex,
      lowBidMicros: num(metrics.low_top_of_page_bid_micros),
      highBidMicros: num(metrics.high_top_of_page_bid_micros),
      matchedPageRoute: matchedPage?.route || null,
      matchedPageTitle: matchedPage?.title || null,
      hasRelevantEntity: !!hasRelevantEntity,
    });

    // ---- 4: seasonality, riding along on the same historical data ----
    const monthly = (metrics.monthly_search_volumes || []) as { month: string; year: string; monthly_searches: string }[];
    scope.seasonal_pattern.add(lowerKeyword);
    if (monthly.length >= 6) {
      const values = monthly.map((m) => num(m.monthly_searches) ?? 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > 0) {
        const peak = monthly.reduce((best, m, i) => (values[i] > values[best.i] ? { m, i } : best), { m: monthly[0], i: 0 });
        if (values[peak.i] >= avg * SEASONAL_SPIKE_RATIO) {
          findings.push({
            type: "seasonal_pattern",
            keyword: keywordText,
            peakMonth: peak.m.month,
            peakYear: peak.m.year,
            peakVolume: values[peak.i],
            averageVolume: Math.round(avg),
          });
        }
      }
    }

    // ---- 5: competitive pressure vs. last stored pull for this keyword ----
    scope.competitive_pressure_increase.add(lowerKeyword);
    if (competitionIndex != null) {
      const { data: priorPulls } = await supabase
        .from("keyword_intelligence_pulls")
        .select("competition_index, pulled_at")
        .eq("keyword_text", keywordText)
        .order("pulled_at", { ascending: false })
        .limit(1);
      const prior = priorPulls && priorPulls[0];
      if (prior && prior.competition_index != null) {
        const rise = competitionIndex - prior.competition_index;
        if (rise >= COMPETITIVE_PRESSURE_MIN_INDEX_RISE) {
          findings.push({
            type: "competitive_pressure_increase",
            keyword: keywordText,
            previousCompetitionIndex: prior.competition_index,
            currentCompetitionIndex: competitionIndex,
            rise,
            previousPulledAt: prior.pulled_at,
          });
        }
      }
    }

    // Feed the shared keyword_intelligence_pulls table too — this is what
    // makes competitive-pressure comparisons possible on future runs, and
    // keeps Keyword Intelligence's own dashboard populated with real data
    // from this agent's activity as well.
    await supabase.from("keyword_intelligence_pulls").insert({
      seed_keyword: contentGapSeeds[0],
      keyword_text: keywordText,
      avg_monthly_searches: avgVolume,
      competition: metrics.competition || null,
      competition_index: competitionIndex,
      low_top_of_page_bid_micros: num(metrics.low_top_of_page_bid_micros),
      high_top_of_page_bid_micros: num(metrics.high_top_of_page_bid_micros),
      geo_target: "Texas",
      language: "en",
    });
  }

  // ---- 3: city-expansion scoring ----
  const coveredCities = new Set(realCities.map((c) => c.city.toLowerCase()));
  const candidateCities = CANDIDATE_EXPANSION_CITIES.filter((c) => !coveredCities.has(c.toLowerCase()));
  for (const city of candidateCities) {
    scope.city_expansion_opportunity.add(city.toLowerCase());
    try {
      const response = await customer.keywordPlanIdeas.generateKeywordIdeas(
        {
          customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
          language: LANGUAGE_ENGLISH,
          geo_target_constants: [GEO_TEXAS],
          keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
          keyword_seed: { keywords: SERVICE_TERMS.map((term) => `${term} ${city} tx`) },
        } as any
      );
      const ideas = (response as any) || [];
      let totalVolume = 0;
      for (const idea of ideas) {
        const seedMatch = SERVICE_TERMS.some((term) => (idea.text || "").toLowerCase() === `${term} ${city} tx`.toLowerCase());
        if (seedMatch) totalVolume += num(idea.keyword_idea_metrics?.avg_monthly_searches) || 0;
      }
      if (totalVolume >= CITY_EXPANSION_MIN_VOLUME) {
        findings.push({ type: "city_expansion_opportunity", city, estimatedMonthlyVolume: totalVolume });
      }
    } catch (err: any) {
      console.error(`City-expansion lookup failed for ${city}:`, err.message);
    }
  }

  function subjectKeyFor(f: any): string {
    switch (f.type) {
      case "city_expansion_opportunity":
        return `${f.type}::${f.city.toLowerCase()}`;
      default:
        return `${f.type}::${f.keyword.toLowerCase()}`;
    }
  }

  const stillFailingByType: Record<string, Set<string>> = {};
  for (const f of findings) {
    const t = f.type;
    stillFailingByType[t] = stillFailingByType[t] || new Set();
    stillFailingByType[t].add(subjectKeyFor(f));
  }
  let resolvedCount = 0;
  for (const [type, subjectSet] of Object.entries(scope)) {
    const scopeKeys = Array.from(subjectSet).map((k) => `${type}::${k}`);
    resolvedCount += await resolveStaleFindings(supabase, AGENT_NAME, scopeKeys, stillFailingByType[type] || new Set());
  }

  if (findings.length === 0) {
    return NextResponse.json({ totalFindings: 0, inserted: 0, resolved: resolvedCount });
  }

  // Cap per type, not globally — a global top-N sorted by raw volume would
  // always be dominated by content_gap/low_hanging_fruit (which can run
  // into the hundreds) and would silently crowd out city_expansion_
  // opportunity or competitive_pressure_increase, which are just as
  // valuable but naturally smaller in count. Confirmed live: the first
  // real run produced 133 content-gap-family findings against only 3
  // city-expansion ones — capping globally would show zero of the latter.
  const MAX_PER_TYPE: Record<string, number> = {
    content_gap: 8,
    low_hanging_fruit: 8,
    city_expansion_opportunity: 5,
    seasonal_pattern: 5,
    competitive_pressure_increase: 5,
  };
  const impactScore = (f: any) => f.avgMonthlySearches ?? f.estimatedMonthlyVolume ?? f.peakVolume ?? f.rise ?? 0;
  const byType = new Map<string, any[]>();
  for (const f of findings) {
    const list = byType.get(f.type) || [];
    list.push(f);
    byType.set(f.type, list);
  }
  const topFindings = Array.from(byType.entries()).flatMap(([type, list]) =>
    [...list].sort((a, b) => impactScore(b) - impactScore(a)).slice(0, MAX_PER_TYPE[type] ?? 10)
  );

  const history = await fetchAgentHistory(supabase, AGENT_NAME);

  const prompt = `You are the Google Ads Agent for a barber & cosmetology industry directory site.
Mission: ${MISSION}

Below is REAL data from Google Ads Keyword Planner (market-wide, independent of our own site's current rankings) and Search Console (our own real performance, used only to confirm what we don't already show up for). Do not invent or alter any numbers. Each item has a "type":
- content_gap: real market demand for this keyword, low-medium competition, and we have ZERO real impressions for it in Search Console — Google doesn't know we exist for this term at all. No relevant existing page was found either — needs new content.
- low_hanging_fruit: same real-gap signal as content_gap, but a relevant EXISTING PAGE was found (matchedPageRoute/matchedPageTitle on the item) that already covers this same real intent — the fix is an on-page SEO update (title/meta description/copy) to that specific existing page, not new content. Always name the exact page (matchedPageRoute) in your directive when this is set.
- city_expansion_opportunity: real search demand for barbershop/salon services in a Texas city we don't currently have any real business coverage in.
- seasonal_pattern: a real month-by-month historical spike (from up to 4 years of real market data, not just our own site's short history) — worth timing content/campaigns around.
- competitive_pressure_increase: a keyword's real competition level has risen meaningfully since we last checked it — a leading indicator SEO is getting harder there.

For each item, write one concise, direct "directive" (2-3 sentences) explaining the opportunity and the specific next step. For low_hanging_fruit items, name the exact existing page (matchedPageRoute) to update — don't recommend building anything new.

You have memory of your own past runs. Recently denied findings — don't re-suggest the same thing unless the situation has clearly changed: ${JSON.stringify(history.recentDenials)}
Findings still open and recurring — acknowledge repeats: ${JSON.stringify(history.recurringOpen)}

Data:
${JSON.stringify(topFindings, null, 2)}

Return ONLY valid JSON: an array of objects, each { "index": <0-based position in the array above>, "directive_text": "..." }.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
  for (let i = 0; i < topFindings.length; i++) {
    const f = topFindings[i];
    const match = directives.find((d) => d.index === i);
    const { inserted } = await upsertFinding(supabase, {
      agentName: AGENT_NAME,
      mission: MISSION,
      subjectKey: subjectKeyFor(f),
      directiveText: match?.directive_text || `${f.type} opportunity detected — review evidence for details.`,
      evidence: f,
    });
    if (inserted) insertedCount++;
  }

  return NextResponse.json({ totalFindings: findings.length, inserted: insertedCount, resolved: resolvedCount });
}
