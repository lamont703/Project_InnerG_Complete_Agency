import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import { upsertFinding, resolveStaleFindings, fetchAgentHistory, getThresholdMultiplier } from "@/lib/agent-directives";
import { internalEnv } from "@/lib/google-internal-oauth"
import { SITE_URL } from "@/lib/site"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AGENT_NAME = "Website Traffic Optimization Agent";
const MISSION =
  "Find real traffic-growth opportunities in Search Console data — striking-distance keywords, CTR gaps, cannibalization, rising demand, and coverage gaps.";

// GSC's own data isn't finalized for the most recent ~2-3 days — querying
// "today" returns incomplete numbers. Search Analytics (unlike URL
// Inspection) has no per-day quota, so a single run can cover the whole
// site's query/page data in one call.
const LAG_DAYS = 3;
const WINDOW_DAYS = 30;
const MAX_FINDINGS_PER_RUN = 20;

const STRIKING_DISTANCE_MIN_POS = 11;
const STRIKING_DISTANCE_MAX_POS = 20;
const STRIKING_DISTANCE_MIN_IMPRESSIONS = 10;

const CTR_OUTLIER_MIN_IMPRESSIONS = 20;
const CTR_OUTLIER_RATIO_THRESHOLD = 0.5;

const CANNIBALIZATION_MIN_IMPRESSIONS_PER_PAGE = 5;

const RISING_QUERY_MIN_PREVIOUS = 5;
const RISING_QUERY_MIN_CURRENT = 10;
const RISING_QUERY_GROWTH_THRESHOLD = 0.5;
const RISING_QUERY_PERIOD_DAYS = 14;

const ACCIDENTAL_RANKING_MIN_IMPRESSIONS = 15;
const GENERIC_PAGES = new Set([`${SITE_URL}/`, `${SITE_URL}/search`]);

const GEOGRAPHIC_GAP_MIN_IMPRESSIONS = 10;
// Static list on purpose — deriving this from formatted_address strings
// across every entity table needs real parsing (inconsistent comma
// placement) for a first version. Expand manually as new metros come into
// scope, same as the dedicated suburb pages built earlier this session.
const TX_CITIES = [
  "houston", "katy", "pearland", "pasadena", "humble", "austin", "dallas",
  "san antonio", "sugar land", "the woodlands", "spring", "cypress",
  "missouri city", "baytown", "conroe", "league city", "fort worth",
  "el paso", "corpus christi", "plano", "laredo", "irving", "garland",
  "amarillo", "mckinney", "frisco", "brownsville", "pflugerville",
  "college station", "beaumont", "waco", "tyler", "sherman", "eagle pass",
];

// A live test run caught "20260 katy freeway" (a Houston street/highway
// name — I-10 is locally known as "Katy Freeway") being misread as demand
// for the suburb of Katy — a plain substring match can't tell "Katy" the
// place from "Katy" inside an unrelated proper noun. This excludes the
// match when the city name is immediately followed by a landmark/street
// word instead of standing alone as a real place reference.
const CITY_FALSE_POSITIVE_SUFFIXES = new Set(["freeway", "fwy", "hwy", "highway", "mall", "blvd", "boulevard", "hospital"]);

function matchRealCity(query: string): string | null {
  for (const city of TX_CITIES) {
    const idx = query.indexOf(city);
    if (idx === -1) continue;
    const after = query.slice(idx + city.length).trim();
    const nextWord = after.split(/\s+/)[0] || "";
    if (CITY_FALSE_POSITIVE_SUFFIXES.has(nextWord)) continue;
    return city;
  }
  return null;
}

const TREND_PERIOD_DAYS = 30;
const TREND_MIN_IMPRESSIONS = 10;

// Well-known industry-average CTR-by-position benchmarks (Advanced Web
// Ranking / Backlinko-style studies). Only reliable for page-1 positions —
// striking_distance covers 11-20 separately, so no overlap.
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.317, 2: 0.147, 3: 0.103, 4: 0.073, 5: 0.053,
  6: 0.042, 7: 0.033, 8: 0.028, 9: 0.025, 10: 0.022,
};

function expectedCtrForPosition(position: number): number | null {
  const rounded = Math.round(position);
  if (rounded < 1 || rounded > 10) return null;
  return EXPECTED_CTR_BY_POSITION[rounded] ?? null;
}

const ENTITY_TYPE_BY_PATH: { pattern: RegExp; type: string }[] = [
  { pattern: /\/shop\//, type: "barbershop" },
  { pattern: /\/barbers\//, type: "barbershop" },
  { pattern: /\/salons\//, type: "salon" },
  { pattern: /\/cosmetologists\//, type: "salon" },
  { pattern: /\/schools\//, type: "school" },
  { pattern: /\/stores\//, type: "store" },
];

const QUERY_INTENT_KEYWORDS: { keywords: string[]; type: string }[] = [
  { keywords: ["school", "academy", "institute", "cosmetology program", "exam prep"], type: "school" },
  { keywords: ["supply", "supplies", "wholesale"], type: "store" },
  { keywords: ["salon", "nail", "hair color", "spa"], type: "salon" },
  { keywords: ["barber", "barbershop", "fade", "clippers", "shave"], type: "barbershop" },
];

function inferPageEntityType(url: string): string | null {
  for (const { pattern, type } of ENTITY_TYPE_BY_PATH) {
    if (pattern.test(url)) return type;
  }
  return null;
}

function inferQueryIntentType(query: string): string | null {
  const lower = query.toLowerCase();
  for (const { keywords, type } of QUERY_INTENT_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return null;
}

type GscRow = { keys?: string[] | null; clicks: number; impressions: number; ctr: number; position: number };

export async function POST() {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_GSC_REFRESH_TOKEN", "GSC_SITE_URL"].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    return NextResponse.json({ error: "Search Console not configured", missing_env_vars: missing }, { status: 503 });
  }

  const oauth2Client = new google.auth.OAuth2(internalEnv().GOOGLE_CLIENT_ID, internalEnv().GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_GSC_REFRESH_TOKEN });
  const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });
  const siteUrl = process.env.GSC_SITE_URL!;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgoStr = (days: number) => new Date(now - days * dayMs).toISOString().slice(0, 10);

  async function queryGSC(startDate: string, endDate: string, dimensions: string[]): Promise<GscRow[]> {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions, rowLimit: 25000 },
    });
    return (res.data.rows || []) as GscRow[];
  }

  const lagEnd = daysAgoStr(LAG_DAYS);
  const windowStart = daysAgoStr(LAG_DAYS + WINDOW_DAYS);

  const queryPageRows = await queryGSC(windowStart, lagEnd, ["query", "page"]);

  // Adaptive thresholds — a check repeatedly denied as "too minor" raises
  // its own bar rather than keep re-flagging the same class of low-value
  // noise (see lib/agent-directives.ts).
  const [strikingMult, ctrMult, geoMult] = await Promise.all([
    getThresholdMultiplier(supabase, AGENT_NAME, "striking_distance"),
    getThresholdMultiplier(supabase, AGENT_NAME, "ctr_outlier"),
    getThresholdMultiplier(supabase, AGENT_NAME, "geographic_gap"),
  ]);
  const effStrikingMinImpressions = Math.round(STRIKING_DISTANCE_MIN_IMPRESSIONS * strikingMult);
  const effCtrMinImpressions = Math.round(CTR_OUTLIER_MIN_IMPRESSIONS * ctrMult);
  const effGeoMinImpressions = Math.round(GEOGRAPHIC_GAP_MIN_IMPRESSIONS * geoMult);

  const findings: any[] = [];
  // Every subject actually evaluated this run (whether or not it produced a
  // finding), grouped by type — used below to know which previously-open
  // findings can honestly be marked resolved.
  const scope: Record<string, Set<string>> = {
    striking_distance: new Set(),
    ctr_outlier: new Set(),
    cannibalization: new Set(),
    rising_query: new Set(),
    accidental_ranking_opportunity: new Set(),
    query_to_page_mismatch: new Set(),
    geographic_gap: new Set(),
    sustained_growth_trend: new Set(),
  };

  // 1. Striking distance — page 2 (position 11-20), real impressions, few/no clicks
  for (const row of queryPageRows) {
    const [query, page] = row.keys as [string, string];
    scope.striking_distance.add(`${query}|${page}`);
    if (row.position >= STRIKING_DISTANCE_MIN_POS && row.position <= STRIKING_DISTANCE_MAX_POS && row.impressions >= effStrikingMinImpressions) {
      findings.push({ type: "striking_distance", query, page, position: Number(row.position.toFixed(1)), impressions: row.impressions, clicks: row.clicks });
    }
  }

  // 2. CTR-vs-position outliers — ranks well but earns far less clicks than typical
  for (const row of queryPageRows) {
    const [query, page] = row.keys as [string, string];
    scope.ctr_outlier.add(`${query}|${page}`);
    if (row.impressions < effCtrMinImpressions) continue;
    const expected = expectedCtrForPosition(row.position);
    if (expected == null) continue;
    if (row.ctr < expected * CTR_OUTLIER_RATIO_THRESHOLD) {
      findings.push({ type: "ctr_outlier", query, page, position: Number(row.position.toFixed(1)), actualCtr: Number(row.ctr.toFixed(3)), expectedCtr: expected, impressions: row.impressions });
    }
  }

  // 3. Cannibalization — same query, 2+ distinct pages each with real impressions
  const byQuery = new Map<string, { page: string; impressions: number; clicks: number; position: number }[]>();
  for (const row of queryPageRows) {
    const [query, page] = row.keys as [string, string];
    if (row.impressions < CANNIBALIZATION_MIN_IMPRESSIONS_PER_PAGE) continue;
    const list = byQuery.get(query) || [];
    list.push({ page, impressions: row.impressions, clicks: row.clicks, position: Number(row.position.toFixed(1)) });
    byQuery.set(query, list);
  }
  for (const [query, pages] of byQuery.entries()) {
    scope.cannibalization.add(query);
    if (pages.length >= 2) findings.push({ type: "cannibalization", query, competingPages: pages });
  }

  // 4. Rising queries — last 14d vs previous 14d
  const [currentPeriodRows, priorPeriodRows] = await Promise.all([
    queryGSC(daysAgoStr(LAG_DAYS + RISING_QUERY_PERIOD_DAYS), lagEnd, ["query"]),
    queryGSC(daysAgoStr(LAG_DAYS + RISING_QUERY_PERIOD_DAYS * 2), daysAgoStr(LAG_DAYS + RISING_QUERY_PERIOD_DAYS + 1), ["query"]),
  ]);
  const priorByQuery = new Map(priorPeriodRows.map((r) => [r.keys![0], r.impressions]));
  for (const row of currentPeriodRows) {
    const query = row.keys![0];
    scope.rising_query.add(query);
    const prevImpressions = priorByQuery.get(query) || 0;
    if (prevImpressions < RISING_QUERY_MIN_PREVIOUS || row.impressions < RISING_QUERY_MIN_CURRENT) continue;
    const growth = (row.impressions - prevImpressions) / prevImpressions;
    if (growth >= RISING_QUERY_GROWTH_THRESHOLD) {
      findings.push({ type: "rising_query", query, currentImpressions: row.impressions, previousImpressions: prevImpressions, growthPct: Number((growth * 100).toFixed(0)) });
    }
  }

  // Top page per query — reused by checks 5 and 6
  const byQueryTopPage = new Map<string, { page: string; impressions: number; position: number }>();
  for (const row of queryPageRows) {
    const [query, page] = row.keys as [string, string];
    const existing = byQueryTopPage.get(query);
    if (!existing || row.impressions > existing.impressions) {
      byQueryTopPage.set(query, { page, impressions: row.impressions, position: row.position });
    }
  }

  // 5. Accidental ranking opportunities — a generic hub/homepage absorbing
  // real impressions for a specific-intent query that deserves its own page.
  for (const [query, top] of byQueryTopPage.entries()) {
    scope.accidental_ranking_opportunity.add(query);
    if (top.impressions >= ACCIDENTAL_RANKING_MIN_IMPRESSIONS && GENERIC_PAGES.has(top.page)) {
      findings.push({ type: "accidental_ranking_opportunity", query, currentPage: top.page, impressions: top.impressions, position: Number(top.position.toFixed(1)) });
    }
  }

  // 6. Query-to-page mismatch — page's URL-implied entity type vs. query's
  // keyword-implied intent (e.g. a barbershop page ranking for a
  // cosmetology-school query).
  for (const [query, top] of byQueryTopPage.entries()) {
    if (top.impressions < ACCIDENTAL_RANKING_MIN_IMPRESSIONS) continue;
    scope.query_to_page_mismatch.add(`${query}|${top.page}`);
    const pageType = inferPageEntityType(top.page);
    const queryType = inferQueryIntentType(query);
    if (pageType && queryType && pageType !== queryType) {
      findings.push({ type: "query_to_page_mismatch", query, page: top.page, pageEntityType: pageType, queryImpliedType: queryType, impressions: top.impressions });
    }
  }

  // 7. Geographic gaps — real demand mentioning a known TX city, zero clicks
  const cityQueryAgg = new Map<string, { impressions: number; clicks: number; sampleQuery: string }>();
  for (const row of queryPageRows) {
    const query = (row.keys![0] as string).toLowerCase();
    const matchedCity = matchRealCity(query);
    if (!matchedCity) continue;
    const existing = cityQueryAgg.get(matchedCity) || { impressions: 0, clicks: 0, sampleQuery: query };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    cityQueryAgg.set(matchedCity, existing);
  }
  for (const [city, agg] of cityQueryAgg.entries()) {
    scope.geographic_gap.add(city);
    if (agg.impressions >= effGeoMinImpressions && agg.clicks === 0) {
      findings.push({ type: "geographic_gap", city, impressions: agg.impressions, sampleQuery: agg.sampleQuery });
    }
  }

  // 8. Sustained growth trend — 3 consecutive ~30-day windows, each higher
  // than the last. A scoped-down precursor to true seasonal (year-over-year)
  // forecasting, which needs 12+ months of history — this site only has
  // ~3 months so far, so this is an early trend signal, not real seasonality.
  const [p1Rows, p2Rows, p3Rows] = await Promise.all([
    queryGSC(daysAgoStr(LAG_DAYS + TREND_PERIOD_DAYS), lagEnd, ["query"]),
    queryGSC(daysAgoStr(LAG_DAYS + TREND_PERIOD_DAYS * 2), daysAgoStr(LAG_DAYS + TREND_PERIOD_DAYS + 1), ["query"]),
    queryGSC(daysAgoStr(LAG_DAYS + TREND_PERIOD_DAYS * 3), daysAgoStr(LAG_DAYS + TREND_PERIOD_DAYS * 2 + 1), ["query"]),
  ]);
  const p2Map = new Map(p2Rows.map((r) => [r.keys![0], r.impressions]));
  const p3Map = new Map(p3Rows.map((r) => [r.keys![0], r.impressions]));
  for (const row of p1Rows) {
    const query = row.keys![0];
    scope.sustained_growth_trend.add(query);
    const p1 = row.impressions;
    const p2 = p2Map.get(query) || 0;
    const p3 = p3Map.get(query) || 0;
    if (p1 >= TREND_MIN_IMPRESSIONS && p1 > p2 && p2 > p3 && p3 > 0) {
      findings.push({ type: "sustained_growth_trend", query, period1Impressions: p1, period2Impressions: p2, period3Impressions: p3 });
    }
  }

  // subjectKey encodes the finding type so the same URL/query flagged under
  // two different checks gets tracked as two independent open issues, not
  // merged into one.
  function subjectKeyFor(f: any): string {
    switch (f.type) {
      case "striking_distance":
      case "ctr_outlier":
      case "query_to_page_mismatch":
        return `${f.type}::${f.query}|${f.page}`;
      case "geographic_gap":
        return `${f.type}::${f.city}`;
      default:
        return `${f.type}::${f.query}`;
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

  // Cap and prioritize — a 6,000+ page site can surface far more raw
  // findings than are useful in one daily digest. Sort by rough impact
  // (impressions) and take the top slice rather than flooding the feed.
  const impactScore = (f: any) => f.impressions ?? f.currentImpressions ?? f.period1Impressions ?? 0;
  const topFindings = [...findings].sort((a, b) => impactScore(b) - impactScore(a)).slice(0, MAX_FINDINGS_PER_RUN);

  const history = await fetchAgentHistory(supabase, AGENT_NAME);

  const prompt = `You are the Website Traffic Optimization Agent for a barber & cosmetology industry directory site.
Mission: ${MISSION}

Below is REAL data from Google Search Console analyzing traffic opportunities. Do not invent or alter any numbers — only use what's given. Each item has a "type" field:
- striking_distance: ranks position 11-20 (page 2) with real impressions but few/no clicks — often just needs a modest on-page push (more prominent use of the term, expanded content, better internal links) to reach page 1.
- ctr_outlier: ranks well (page 1) but earns far less click-through than typical for that position — likely a weak title tag/meta description, not a ranking problem.
- cannibalization: multiple pages on this same site competing for the same query, splitting authority and confusing Google about which should rank.
- rising_query: a query gaining real impression volume recently even before ranking well — emerging demand worth building around before it's obvious to competitors.
- accidental_ranking_opportunity: a generic hub page or the homepage is absorbing real impressions for a specific-intent query that deserves its own dedicated page.
- query_to_page_mismatch: the page currently ranking for this query appears to be about a different type of business/entity than the query implies (e.g. a barbershop page ranking for a cosmetology-school query) — worth double-checking real intent, this is a heuristic guess based on keywords, not certain.
- geographic_gap: real search demand mentioning a specific Texas city/metro with zero clicks — may indicate a missing dedicated location page. Explicitly tell the reader to check whether a dedicated page already exists for that city before building a new one, since this check can't verify that itself.
- sustained_growth_trend: a query's impressions have grown for 3 consecutive ~30-day windows — an early, real trend signal. Explicitly note this is NOT true year-over-year seasonality (the site doesn't have 12+ months of history yet), just an early consistent trend.

For each item, write one concise, direct "directive" (2-3 sentences) explaining the opportunity and the specific next step, in this style:
"Query X ranks at position Y with Z impressions but almost no clicks. Directive: <specific, actionable next step>."

You have memory of your own past runs. Recently denied findings (a human explicitly said "not this," with a reason if given) — don't re-suggest the same query/page/city unless the situation has clearly changed: ${JSON.stringify(history.recentDenials)}
Findings still open and recurring (flagged multiple times, not yet resolved) — if today's item matches one, acknowledge it's a repeat (e.g. "still unresolved after N checks"): ${JSON.stringify(history.recurringOpen)}

Data (${topFindings.length} items, indices 0 to ${topFindings.length - 1}):
${JSON.stringify(topFindings, null, 2)}

Return ONLY valid JSON: an array of EXACTLY ${topFindings.length} objects — one for every single item above in the same order, none skipped or summarized away, each { "index": <0-based position of the item in the array above>, "directive_text": "..." }.`;

  // resolveStaleFindings already committed above, so a transient Gemini
  // outage here only delays this run's fresh findings until the next
  // scheduled run — nothing already-written gets lost.
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

  // Confirmed live: Gemini has silently returned directive_text for only a
  // subset of the requested items on a large batch (17 of 25 fell back to
  // the generic placeholder in one real run) despite the prompt asking for
  // all of them. The strengthened prompt above should prevent this, but
  // logging it here means a regression shows up in logs instead of only
  // being discoverable by counting placeholder text in the dashboard.
  if (directives.length < topFindings.length) {
    console.error(`Traffic Optimization Agent: Gemini returned ${directives.length} directive(s) for ${topFindings.length} findings — ${topFindings.length - directives.length} will fall back to placeholder text.`);
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
