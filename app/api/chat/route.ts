import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';

import { createAdminClient } from '@/lib/supabase/admin';
import { computeShopEcosystemReport, getRentStatsByZip, findProfessionalEmployment, getTopVenuesByWorkerCount, getWorkersAtVenue, getConfirmationStats, listUnconfirmedMatches, getEmploymentMatchOverview, getSchoolExamStats, getStatewideExamStats, findStudentExamRecord, getSchoolRankingsByRegion, getTopSchoolsByPassRate, getSchoolTestTakers } from '@/lib/shop-ecosystem';

// Next.js patches the global fetch() to cache responses by default, which
// can end up caching the Gemini SDK's own internal fetch calls (identical
// prompts silently returning a stale cached completion instead of a fresh
// one). Chat responses must never be cached — force this route dynamic.
export const dynamic = 'force-dynamic';

// Simple Rate Limit: 5 per 24 hours
const MAX_REQUESTS = 5;
const RATE_LIMIT_RESET_HOURS = 24;

// The LINKING RULE in the system prompt tells the model never to invent a
// URL for an item without a profile_url — but prompting alone isn't
// reliable (confirmed: retested against the pre-tool-calling code and it
// invented a link for a school district, which has no profile_url at all,
// in 3 of 3 attempts — "/school-districts/...", "null", literal "None").
// This is the deterministic backstop: collect every real URL actually
// present in the context we gave the model, then strip any markdown link
// in its response that doesn't exactly match one of them back to plain
// text. Catches invented paths, "null"/"None" artifacts, AND wrong-ID
// swaps (a link to a real-looking but uncontexted URL), not just missing
// ones.
function collectValidLinks(obj: any, links: Set<string>) {
  if (Array.isArray(obj)) {
    for (const item of obj) collectValidLinks(item, links);
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Matches profile_url/profileUrl/url/href AND tool-specific fields
      // like professionalHref/venueHref — any key ending in "url" or
      // "href" (case-insensitive) is treated as a link field, so a new
      // tool doesn't need this function edited every time it adds one.
      const k = key.toLowerCase();
      if ((k.endsWith('url') || k.endsWith('href')) && typeof value === 'string' && value) {
        links.add(value);
      } else {
        collectValidLinks(value, links);
      }
    }
  }
}

function sanitizeMarkdownLinks(text: string, validLinks: Set<string>): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => (validLinks.has(url) ? match : label));
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let usageCount = parseInt(cookieStore.get('ai_chat_count')?.value || '0', 10);
    const resetTime = cookieStore.get('ai_chat_reset')?.value;

    // Reset if time has passed
    if (resetTime && new Date() > new Date(resetTime)) {
      usageCount = 0;
    }

    if (usageCount >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: "You've reached your limit of 5 AI searches for today. This resets every 24 hours, so feel free to come back tomorrow — or upgrade your account for more." },
        { status: 429 }
      );
    }

    const { messages, shopId } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = createAdminClient();

    // When a shop owner arrives from their own shop's profile page via "Ask
    // AI About This Market", shopId identifies exactly which shop — this is
    // a direct geospatial computation (haversine + free-text rent parsing),
    // not something a similarity search over embeddings could answer, so it
    // bypasses the RAG grounding below entirely, same as the exam leaderboards.
    let shopEcosystemContext: any = null;
    if (shopId) {
      const { data: shopRow } = await supabase
        .from('agent_barbershop_leads')
        .select('id, shop_name, city, latitude, longitude, rent_rate, census_median_household_income, census_population, school_district_name')
        .eq('id', shopId)
        .single() as { data: { id: string; shop_name: string; city: string | null; latitude: number | null; longitude: number | null; rent_rate: string | null; census_median_household_income: number | null; census_population: number | null; school_district_name: string | null } | null };
      if (shopRow) {
        const report = await computeShopEcosystemReport(supabase as any, shopRow);
        if (report) {
          shopEcosystemContext = {
            shop_name: shopRow.shop_name,
            city: shopRow.city,
            profile_url: `/shop/${shopRow.id}`,
            // Direct properties of the shop's own location, not a radius
            // computation — median_household_income is Census ACS 5-Year
            // data for the shop's tract, used for pricing-vs-local-income
            // reasoning; school_district is a community/cultural anchor.
            local_census_tract_median_household_income: shopRow.census_median_household_income,
            local_census_tract_population: shopRow.census_population,
            school_district: shopRow.school_district_name,
            ...report,
          };
        }
      }
    }

    // 1. Generate Embedding for the user's message
    const embeddingResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: latestMessage,
      config: { outputDimensionality: 768 }
    });

    // Convert Float32Array or array back to standard array format for pgvector
    if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
      return Response.json({ error: 'Failed to generate embedding for your query.' }, { status: 500 });
    }
    const queryEmbedding = Array.from(embeddingResponse.embeddings[0].values!);
    const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`;

    // 2. Run Parallel Multi-Table Vector Hybrid Search across every grounded
    // entity type. Each RPC call is logged on error instead of silently
    // swallowed — a param-name mismatch here previously made two of these
    // (web pages + platform tools) fail on every single request without
    // ever surfacing in logs.
    const rpcCall = async (name: string, params: Record<string, any>): Promise<any[]> => {
      const { data, error } = await (supabase.rpc as any)(name, params);
      if (error) {
        console.error(`AI Chat grounding RPC "${name}" failed:`, error.message);
        return [];
      }
      return data || [];
    };

    const [
      shops,
      barbers,
      schools,
      salons,
      cosmetologists,
      barberSupplyStores,
      beautySupplyStores,
      webPages,
      platformTools,
      testingLeaderboard,
      cosmetologyTestingLeaderboard,
      districtBarbershopRankings,
    ] = await Promise.all([
      rpcCall('search_barbershops_ranked', {
        query_text: latestMessage,
        is_hiring_filter: false,
        rent_type_filter: '',
        limit_val: 3,
        offset_val: 0,
        query_embedding: queryEmbeddingStr
      }),
      rpcCall('search_barbers_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 3,
        offset_val: 0
      }),
      rpcCall('search_schools_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 3,
        offset_val: 0
      }),
      rpcCall('search_salons_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 3,
        offset_val: 0
      }),
      rpcCall('search_cosmetologists_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 3,
        offset_val: 0
      }),
      rpcCall('search_supply_stores_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 2,
        offset_val: 0
      }),
      rpcCall('search_beauty_supply_stores_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 2,
        offset_val: 0
      }),
      rpcCall('search_web_pages_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 2,
        offset_val: 0,
        is_video_filter: null
      }),
      rpcCall('search_platform_tools_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 2,
        offset_val: 0
      }),
      // 2026 TDLR exam data (agent_barber_student_leads) is aggregate/
      // analytical by nature ("which schools tested the most students",
      // "who has the best pass rate") — a plain top-N vector similarity
      // search over individual exam rows can't answer that well, so this is
      // a direct ranked query across both school tables instead, combined
      // and re-sorted below.
      (async () => {
        const [barberSchools, cosmetSchools] = await Promise.all([
          supabase
            .from('agent_barber_school_leads')
            .select('id, school_name, city, written_test_takers_2026, written_pass_rate_2026, practical_test_takers_2026, practical_pass_rate_2026')
            .not('written_test_takers_2026', 'is', null)
            .order('written_test_takers_2026', { ascending: false })
            .limit(8),
          supabase
            .from('agent_cosmetology_school_leads')
            .select('id, school_name, city, written_test_takers_2026, written_pass_rate_2026, practical_test_takers_2026, practical_pass_rate_2026')
            .not('written_test_takers_2026', 'is', null)
            .order('written_test_takers_2026', { ascending: false })
            .limit(8),
        ]);
        return [...(barberSchools.data || []), ...(cosmetSchools.data || [])]
          .sort((a: any, b: any) => (b.written_test_takers_2026 || 0) - (a.written_test_takers_2026 || 0))
          .slice(0, 8);
      })(),
      // Same aggregate/analytical need, but for the 2026 Cosmetology Operator
      // exam — a genuinely different license from Class A Barber, tracked in
      // its own cosmetology_* columns (see agent_cosmetology_student_leads)
      // so a dual-licensed school's two exam populations don't blend.
      (async () => {
        const [barberSchools, cosmetSchools] = await Promise.all([
          supabase
            .from('agent_barber_school_leads')
            .select('id, school_name, city, cosmetology_written_test_takers_2026, cosmetology_written_pass_rate_2026, cosmetology_practical_test_takers_2026, cosmetology_practical_pass_rate_2026')
            .not('cosmetology_written_test_takers_2026', 'is', null)
            .order('cosmetology_written_test_takers_2026', { ascending: false })
            .limit(8),
          supabase
            .from('agent_cosmetology_school_leads')
            .select('id, school_name, city, cosmetology_written_test_takers_2026, cosmetology_written_pass_rate_2026, cosmetology_practical_test_takers_2026, cosmetology_practical_pass_rate_2026')
            .not('cosmetology_written_test_takers_2026', 'is', null)
            .order('cosmetology_written_test_takers_2026', { ascending: false })
            .limit(8),
        ]);
        return [...(barberSchools.data || []), ...(cosmetSchools.data || [])]
          .sort((a: any, b: any) => (b.cosmetology_written_test_takers_2026 || 0) - (a.cosmetology_written_test_takers_2026 || 0))
          .slice(0, 8);
      })(),
      // "Which school district has the best barbershops" is an aggregate
      // across ALL shops grouped by district — a top-3 similarity search
      // can't answer that, same reasoning as the exam leaderboards above.
      rpcCall('get_school_district_barbershop_rankings', {}),
    ]);

    // search_schools_ranked also returns 2026 pass-rate/test-taker fields
    // (for the search UI's "By the Numbers" card), but leaving those in the
    // general lookup context here gave the model two overlapping sources
    // for the same data and it inconsistently picked the wrong one for
    // volume/ranking questions. Strip them so texas_2026_exam_school_leaderboard
    // is the only place that data can come from.
    const schoolsForLookup = schools.map(({ written_pass_rate_2026, written_test_takers_2026, practical_pass_rate_2026, practical_test_takers_2026, ...rest }: any) => rest);

    // The model can mention a specific barbershop/barber/school/etc. by name
    // without any way to link to it — pre-computing the exact profile URL
    // here (rather than asking the model to construct one from an id) means
    // it can just copy a real path into a markdown link instead of guessing
    // or inventing one.
    const withProfileUrl = (items: any[], basePath: string) =>
      items.map((item) => ({ ...item, profile_url: item.id ? `${basePath}/${item.id}` : undefined }));

    // 3. Merge Context Data. texas_2026_exam_school_leaderboard is listed
    // first (defense in depth) since with 9 grounded sources the combined
    // JSON can run 60-70k+ characters — a much smaller truncation cap here
    // previously cut the JSON off before ever reaching a field added later
    // in the object, silently making the model "forget" that data existed.
    const mergedContext = {
      ...(shopEcosystemContext ? { my_shop_ecosystem_report: shopEcosystemContext } : {}),
      texas_2026_exam_school_leaderboard: withProfileUrl(testingLeaderboard, '/schools'),
      texas_2026_cosmetology_exam_school_leaderboard: withProfileUrl(cosmetologyTestingLeaderboard, '/schools'),
      school_district_barbershop_rankings: districtBarbershopRankings,
      barbershops: withProfileUrl(shops, '/shop'),
      professionals: withProfileUrl(barbers, '/barbers'),
      barber_and_cosmetology_schools: withProfileUrl(schoolsForLookup, '/schools'),
      salons: withProfileUrl(salons, '/salons'),
      cosmetologists: withProfileUrl(cosmetologists, '/cosmetologists'),
      supply_stores: withProfileUrl([...barberSupplyStores, ...beautySupplyStores], '/stores'),
      articles_and_videos: webPages,
      software_tools: platformTools,
    };

    const validLinks = new Set<string>();
    collectValidLinks(mergedContext, validLinks);

    // 4. Construct System Prompt
    // Today's date, so relative time language ("this year," "currently,"
    // "so far") has an actual anchor — without it, a real question ("how
    // many students have taken the barber exam this year") got a
    // non-answer asking to clarify "this year" instead of just using the
    // 2026 data, since the model had no way to know what year it even was.
    const todayDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are the Inner G Complete AI Assistant, deeply knowledgeable about the barber, beauty and wellness industry — including barbershops, salons, individual barbers and cosmetologists, barber/cosmetology schools, supply stores, and 2026 Texas Class A Barber and Cosmetology Operator licensing exam outcomes (pass/fail rates and student testing volume per school, for each exam separately).
Today's date is ${todayDate}. All exam data on file is for exam_year 2026 — the only year that exists in the data. If asked about exam activity "this year," "currently," "so far," or similar relative time language, just answer using the 2026 data directly rather than asking the user to clarify what year they mean — 2026 is the only year on file, so there's nothing to disambiguate.
You MUST answer the user's questions based ONLY on the following context data fetched directly from our database.
If the answer is not in the context, say you don't know based on current data.
CRITICAL INSTRUCTION: Keep your answer extremely concise, friendly, and helpful. You MUST keep your entire response under 100 words. Do not ramble. If you write more than 100 words, your response will be abruptly cut off.

LINKING RULE: Whenever you mention a specific tool from software_tools, or a specific barbershop/barber/school/salon/cosmetologist/store that has a profile_url (or profileUrl) field in the context, you MUST format that mention as a markdown link using its EXACT value, e.g. [Barber & Cosmetology Placement](/barber-beauty-network). Every one of those internal links is a relative path starting with "/" — NEVER use a link starting with "http" or "https" for these (this includes Google Places URLs like places.googleapis.com, which sometimes appear elsewhere in this data as image sources, not link destinations). If an item you want to mention does NOT have a profile_url/profileUrl in the context, mention it by plain name with NO link at all — do not construct, guess, or reuse a URL from anywhere else in the data.
The ONE exception is articles_and_videos: each entry's "url" field IS meant to be used as-is (it's a real external link to that article or video, not our own site) — link to it directly, but keep the link label short (the page's title or topic), never the raw_text field, which is scraped page content for your own reference only and must never appear in your response.
Use each link only once per response.

MY_SHOP_ECOSYSTEM_REPORT RULE: If my_shop_ecosystem_report is present, the user is that shop's owner asking about their own local market — it has real computed stats (talent pipeline, labor supply, competition, supply chain, rent) within a radius of their shop, not a search result. Given the 100-word limit, lead with the single most decision-relevant insight (e.g. a tight labor market, a standout nearby school, or rent well above/below the local median) rather than listing every number. If they ask a strategic follow-up (e.g. "should I raise my rent," "should I hire now") that the report's numbers directly speak to, give a concrete, data-grounded answer using those numbers (e.g. rent sitting well below the local median directly supports room to raise it) — don't deflect to "I don't have enough information" when the relevant number is already in my_shop_ecosystem_report. Only decline if the question needs information genuinely outside this data (e.g. their specific finances, lease terms, or customer base).
local_census_tract_median_household_income and school_district (also inside my_shop_ecosystem_report, when present — some shops haven't been enriched yet) are two more direct signals about the shop's own location, not a radius computation. Use school_district only when it's actually relevant to what they're asking (e.g. marketing, target clientele, "who are my customers") — Texas barbershops are neighborhood/community hubs, so being in a specific ISD is a real identity signal, but don't force it into every answer.

INCOME/POPULATION: my_shop_ecosystem_report has TWO distinct pairs of figures — don't conflate them. (1) local_census_tract_median_household_income and local_census_tract_population describe ONLY the shop's own immediate census tract, a small area (often just a couple thousand people) — the single most precise figure for its exact block, but not representative of its full trade area. (2) marketDemographics.weightedAvgMedianHouseholdIncome and marketDemographics.estimatedPopulation are aggregated across every census tract found within the SAME radiusMiles as the rest of this report (see marketDemographics.tractsSampled for how many tracts that covers) — this is the right figure for "how many people/what income level is in my market" since it matches the scope of every other stat in this report (competition, labor supply, schools). Prefer marketDemographics for general "my market/my area" questions; use the tract-level figure only when they're specifically asking about their immediate block. If marketDemographics values are null (tractsSampled is 0), fall back to the tract-level figures and say so.
Outside of my_shop_ecosystem_report entirely (no shop context at all), there is no general area/city-wide income or population lookup. Say clearly that you have income/population data scoped to a specific shop's market (via its profile page) but not as a standalone general lookup — don't just say "I don't have information on income data" as if the concept doesn't exist at all, since that's misleading about what the platform can actually do.

RADIUS IS FIXED: my_shop_ecosystem_report.radiusMiles is a fixed value computed once for this report (10 miles by default) — you cannot recompute it at a different radius, and there is no live tool call available to do so mid-conversation. If asked for a different radius (e.g. "what about a 5-mile radius"), say plainly that this report is fixed at radiusMiles and you don't have the ability to recompute it at a different distance — do NOT say "we can adjust this" or otherwise imply that's possible.

SCHOOL_DISTRICT_NAME RULE: barbershops, salons, professionals, and cosmetologists in the general lookup context (not just my_shop_ecosystem_report) may include a school_district_name field — mention it when relevant (e.g. comparing two shops' neighborhoods, or a "what area is this in" question), same community-identity framing as above.

SCHOOL_DISTRICT_BARBERSHOP_RANKINGS RULE: This is a direct ranked list of school districts by average barbershop rating (shop_count and hiring_shop_count are also included), already sorted best-to-worst, for "which school district/area has the best barbershops" style questions — only districts with at least 3 rated shops are included, so small-sample outliers aren't cherry-picked. Use this instead of trying to infer district quality from the handful of individual barbershops elsewhere in the context. IMPORTANT: entries here have NO profile_url — there is no page on this site for browsing by school district. Mention district names as plain text only, exactly like any other item without a profile_url per the LINKING RULE above — do not invent, guess, or construct a URL for a school district under any circumstances (e.g. never write something like "/school-districts/...").

GET_RENT_STATS_BY_ZIP TOOL RULE: Booth rent is NOT in the context above for any zip code — it only exists as free text on individual shop records, never pre-aggregated. If asked about rent, pricing, or affordability for a specific zip code (e.g. "what's rent like in 77099," "which zip has the highest rent"), call get_rent_stats_by_zip with that zip rather than guessing or saying you don't have the data. If the tool returns null, say plainly that there's no rent data on file for that zip — don't invent a number. sampleSize in the result is often small (rent is rarely reported) — if it's 1 or 2, say so explicitly (e.g. "based on the one shop with rent data on file") rather than presenting it as a reliable market rate. This tool only accepts one zip at a time — for a "which zip is highest" question, you may need to call it for a few specific zips mentioned in conversation, but don't call it more than 3-4 times in one turn.

FIND_PROFESSIONAL_EMPLOYMENT TOOL RULE: For "where does [person's name] work" style questions (e.g. from a school confirming a graduate's placement), ALWAYS call find_professional_employment with whatever name was given — a full name, a first name only, or a nickname are all valid inputs, and the tool itself is built to fuzzy-match a real name against booking-platform handles that often don't look like a real name at all ("KamKutz" for "Kam"). Do NOT decline or ask for a "full name" before trying — that defeats the entire point of the tool, which exists precisely because names on file often aren't full "First Last" names. Call it first; only ask a clarifying question afterward if the tool actually returns an empty array. This is a GEOCODED INFERENCE, not a confirmed fact, so results are ranked candidates, never a certainty. Always state the confidenceScore in plain terms (e.g. "high confidence" for 70+, "low confidence, worth double-checking" below 40) and name it as unconfirmed — never say flatly "X works at Y." If multiple candidates come back, say so explicitly rather than picking one silently — the name may match more than one person. If the tool returns an empty array, say plainly that no match was found on file — don't guess or invent a shop/salon name. Each result includes professionalHref/venueHref (hyperlink both per the LINKING RULE, either can be null if that entity type has no profile page) and professionalAddress/venueAddress (either can also be null — if a follow-up question asks for an address and the field is null, say plainly that you don't have an address on file for that one; never fill in a plausible-looking address that isn't literally the value returned).

DO NOT INVENT FACTS — THIS INCLUDES ADDRESSES, NOT JUST LINKS: a real conversation showed the model fabricating a business address on a follow-up turn ("do you have their address?") that didn't exist anywhere in the data, instead of saying it didn't have one. The link-sanitization system only catches invented markdown links — it does NOT catch an invented address, phone number, rating, or any other fact written as plain text. If a follow-up question asks for a specific detail (address, contact info, rating, etc.) about something mentioned earlier and that field isn't present anywhere in the context above or in a tool result already returned this conversation, say plainly you don't have it on file — do not produce a plausible-sounding value from general knowledge of what a real address/phone/etc. looks like.

GET_TOP_VENUES_BY_WORKER_COUNT TOOL RULE: For aggregate questions about professional_employment_matches — "which shop/salon has the most workers," "who employs the most people" — call get_top_venues_by_worker_count. This is a DIFFERENT tool from find_professional_employment: that one looks up a single named person, this one ranks venues by how many matched professionals they have. Do not try to answer this kind of question from find_professional_employment or by counting entries elsewhere in context — call this tool instead. Same "unconfirmed inference" framing applies: mention avgConfidence in plain terms and note these are geocoded matches, not confirmed employment records. Hyperlink each venue using its venueHref per the LINKING RULE.

GET_WORKERS_AT_VENUE TOOL RULE: For "who works at [shop/salon name]" / "list the workers at [venue]" style questions — the INVERSE of find_professional_employment (that's person->venue, this is venue->people) — ALWAYS call get_workers_at_venue with whatever venue name was given, however short or partial (even a single word like "Legends" for "Legends Barbershop"). Do NOT decline or ask for the "full business name" before trying — the tool is built to fuzzy-match a partial name, exactly like find_professional_employment does for people, and refusing to try defeats the purpose. Call it first; only ask a clarifying question afterward if it actually returns an empty array. It can return workers from TWO distinct venues if the name is genuinely ambiguous (e.g. two different real shops both called "Legends Barbershop") — if you see more than one distinct venueName in the results, say so explicitly and group workers under their correct venue rather than presenting them as one list. Hyperlink every professional and the venue per the LINKING RULE. If empty, say plainly no workers were found for that venue name — don't guess. IF THE RESULT HAS MORE THAN 6 WORKERS: don't list every single one — name the top 5-6 by confidence (with their links) and then say "and N more" for the rest, rather than producing an exhaustive list. This keeps the answer readable and avoids running into the output length limit on large rosters.

GET_CONFIRMATION_STATS TOOL RULE: For "how many placements are confirmed," "what's our confirmation rate," or similar aggregate audit questions, call get_confirmation_stats. It's fine, and currently accurate, for confirmedCount/confirmedPct to be 0 — no confirmation/outreach step exists yet, so every match is genuinely still unconfirmed. State this plainly (e.g. "0 of X have been confirmed yet — all are still unconfirmed inferences") rather than treating a 0 as an error or omitting it.

LIST_UNCONFIRMED_MATCHES TOOL RULE: For "show me the matches that need confirming" / "give me a list to follow up on" style requests, call list_unconfirmed_matches. This is a worklist for a human to act on, not a factual answer — frame it that way (e.g. "here are the highest-confidence unconfirmed matches to start with"), and hyperlink every professional and venue per the LINKING RULE. This defaults to returning up to 20 — IF THE RESULT HAS MORE THAN 6, list only the top 5-6 (with links) and say "and N more" for the rest, same reasoning as GET_WORKERS_AT_VENUE: keeps the answer readable and avoids the output length limit.

GET_EMPLOYMENT_MATCH_OVERVIEW TOOL RULE: For broad audit/data-quality questions — "how many total matches do we have," "what's the breakdown by profession type," "how many professionals have no match at all" — call get_employment_match_overview. unmatchedEligibleCount is the count of professionals who had enough data to be searched (address, real name) but weren't within 3 miles of any shop/salon — distinct from professionals who were simply never eligible to search in the first place.

SCHOOL-LEVEL PLACEMENT RATE — NOT SUPPORTED: If asked for a specific school's placement rate or how many of a named school's graduates are employed, say plainly that school affiliation isn't reliably on file for enough professionals to answer that yet (it's self-reported and very sparse) — do not attempt to compute or estimate a per-school rate from context or any tool here.

The tools below are for 2026 TDLR exam data — for school administrators asking about pass rates and student testing performance. They're DIFFERENT from texas_2026_exam_school_leaderboard/texas_2026_cosmetology_exam_school_leaderboard already in context above: those are a fixed top-8 list sorted by test VOLUME, statewide, prebuilt once per conversation — they won't include a mid-size school at all. These tools look up ANY specific school, student, or region on demand.

DO NOT CONFUSE EXAM DATA WITH EMPLOYMENT-MATCH DATA: a real conversation showed "so how many people have taken the test" answered with employment-match counts (1,185 professionals matched to venues) instead of exam test-taker counts — these are two completely unrelated datasets. Any mention of "test," "exam," "tested," "passed/failed," or "score" refers to the TDLR licensing exam tools above, never to employment-match data (find_professional_employment, get_workers_at_venue, get_confirmation_stats, list_unconfirmed_matches, get_employment_match_overview), even if employment matches were discussed earlier in this same conversation. Conversely, "matched," "employed," "placement," or "verification" refers to the employment tools, never the exam ones. When in doubt about which dataset a question means, the specific word used ("test" vs. "match") decides it — don't let recent conversation topic override that.

GET_SCHOOL_EXAM_STATS TOOL RULE: For "what's [school]'s pass rate / how many students tested / what's our leaderboard score" style questions, call get_school_exam_stats with the school name, however partial. Not every school has 2026 data (148 of 205 barber schools do) — if a field is null, say plainly there's no data on file for that exam/program at that school, don't guess. Pass rates are already percentages (0-100) here, not decimals. Some school names span multiple real, distinct campuses (confirmed: "Milan Institute" has separate Houston/San Antonio/Amarillo locations, each with its own stats) — if more than one row comes back, present them as separate campuses using their city to distinguish, never average or merge them into one answer. Hyperlink each school via schoolHref.

GET_STATEWIDE_EXAM_STATS TOOL RULE: For "what's the statewide average pass rate," "how does my school compare to the state," or any benchmark/comparison question, call get_statewide_exam_stats (no arguments). It returns barber and cosmetology numbers separately, and written vs. practical separately — written exams are meaningfully harder than practical (confirmed: ~66-72% written pass rate vs. ~93-97% practical), so don't blend them into one figure. This is student-weighted across the whole state, not an average of school-level rates.

FIND_STUDENT_EXAM_RECORD TOOL RULE: For "did [student name] pass," "what was [name]'s score," "how many attempts did [name] take" — call find_student_exam_record with whatever name was given, full or partial, same as the other name-lookup tools (don't ask for a full name before trying). Returns every attempt for that person — if they have more than one, mention the retake history (attemptNumber, whether isLatestAttempt) rather than only the most recent. If schoolMatchConfidence is "fuzzy" or "ambiguous" for a result, mention the school pairing is less certain. If more than one distinct person could match, say so explicitly rather than picking one silently.

GET_SCHOOL_RANKINGS_BY_REGION TOOL RULE: For "which schools in [city] have the best pass rates" or "how do schools near me compare," call get_school_rankings_by_region with the city name. Already floored at a minimum sample size, so every result shown is a real, meaningful sample — no need to caveat sample size unless asked.

GET_TOP_SCHOOLS_BY_PASS_RATE TOOL RULE: For "which schools statewide have the best/worst pass rates" (ranked by RATE, not by test volume like the fixed leaderboard), call get_top_schools_by_pass_rate with direction 'best' or 'worst' based on what's asked.

GET_SCHOOL_TEST_TAKERS TOOL RULE: For "who were those test takers" / "list the students at [school]" style questions, call get_school_test_takers with the school name. Each result includes isK12School — if true, firstName/lastName are already null (these test-takers are plausibly minors in a K-12 vocational program); say plainly that individual names aren't shown for that school and only give the aggregate result/score breakdown. If isK12School is false, hyperlink the school via schoolHref and list names freely. If there are more than 6 results, list the top 6 (by result/score, whichever is more relevant to what was asked) and say "and N more" for the rest, same reasoning as the employment-match tools — keeps the answer readable and avoids the output length limit.

ENTITY LINKING IS NOT OPTIONAL: AI Mode doubles as navigation into the rest of the site, not just an answer — so the LINKING RULE above applies every single time you mention a specific barbershop/barber/school/salon/cosmetologist/store/tool that has a profile_url (or an equivalent href from a tool result like find_professional_employment), with no exceptions. Don't drop a link just because you've already mentioned that entity earlier in the conversation — link it again each time.

Context Data (JSON):
${JSON.stringify(mergedContext).substring(0, 120000)}
`;

    // 5. Generate Response (Limit output tokens to keep costs cheap!)
    // Rent-by-zip is the one real gap in the fixed RAG context above — it's
    // never pre-fetched for any zip since rent has no queryable numeric
    // column, only free text on individual shop rows. Rather than rebuild
    // the whole context-assembly pattern into a dynamic tool-calling loop,
    // this adds exactly one real tool for exactly that gap and leaves the
    // rest of the (already-tuned) fixed-context approach untouched.
    const RENT_STATS_TOOL = {
      functionDeclarations: [
        {
          name: 'get_rent_stats_by_zip',
          description: "Look up booth rent statistics (median/min/max weekly rent in USD, sample size, and shop/salon counts) for a specific 5-digit zip code. This data is never pre-loaded into context for any zip — call this tool whenever rent/pricing/affordability for a specific zip comes up.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              zip: { type: 'string', description: "A 5-digit US zip code, e.g. '77099'" },
            },
            required: ['zip'],
          },
        },
        {
          name: 'find_professional_employment',
          description: "Look up where a named barber or cosmetologist currently works, inferred from geocoded proximity between their booking-platform listing and shop/salon locations. Returns ranked candidates with a confidence score, never a certainty — call this whenever a specific person's name and current employer/workplace is asked about.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: "The name to search for, exactly as given — a full name ('Lamont Evans'), a single first name, or a nickname ('Kam') are all valid and should be searched as-is. The underlying match is fuzzy (token + trigram similarity against booking-platform handles), so even one word is enough to try." },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_top_venues_by_worker_count',
          description: "Rank shops/salons by how many matched professionals (from geocoded employment-match data) work there. Use for aggregate questions like 'which shop has the most workers' or 'who employs the most people' — this is an aggregate over all venues, not a lookup for one named person (use find_professional_employment for that instead).",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: "How many top venues to return. Defaults to 10 if not specified." },
              venueType: { type: 'string', enum: ['shop', 'salon'], description: "Restrict to only barbershops ('shop') or only salons ('salon'). Omit to rank across both combined — e.g. a question about 'which shop' should pass 'shop', 'which salon' should pass 'salon', a general 'who has the most workers' should omit this entirely." },
            },
          },
        },
        {
          name: 'get_workers_at_venue',
          description: "List the professionals matched to a specific shop or salon by name — the inverse of find_professional_employment (that's person-to-venue, this is venue-to-people). Use for 'who works at X' or 'list the workers at X' questions. The venue name match is fuzzy/partial, same as find_professional_employment.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              venueName: { type: 'string', description: "The shop or salon name to search for, exactly as given, however partial or short. A single word IS a valid, sufficient input on its own — e.g. if asked 'who works at Legends', pass 'Legends' directly; it will correctly match 'Legends Barbershop' via fuzzy search. Never wait for or ask for the full business name first." },
            },
            required: ['venueName'],
          },
        },
        {
          name: 'get_confirmation_stats',
          description: "Get the overall confirmation-status breakdown across all employment matches — total matches, how many are confirmed/denied/unconfirmed, and the confirmation rate. Use for 'how many placements are confirmed' or 'what's our confirmation rate' style questions.",
          parametersJsonSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_unconfirmed_matches',
          description: "Get a worklist of unconfirmed employment matches, highest confidence first, for outreach/follow-up. Use for 'show me matches that need confirming' or 'give me a list to follow up on' style requests.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: "How many to return. Defaults to 20 if not specified." },
              minConfidence: { type: 'number', description: "Only include matches at or above this confidence score (0-100). Omit to include all." },
            },
          },
        },
        {
          name: 'get_employment_match_overview',
          description: "Get overall data-quality stats for the employment-match dataset: total matches, breakdown by profession type (barber/cosmetologist) and venue type (shop/salon), average confidence and distance, and how many eligible professionals had no match found nearby. Use for broad audit questions like 'how many total matches do we have' or 'what's the breakdown by type.'",
          parametersJsonSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_school_exam_stats',
          description: "Look up a specific barber or cosmetology school's 2026 TDLR exam pass rates, test-taker counts, first-attempt pass rate, and leaderboard score, for both the barber and cosmetology programs if the school teaches both. Call this for any question about a specific school's exam performance — it looks up ANY school on demand, unlike the fixed top-8-by-volume leaderboard already in context.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              schoolName: { type: 'string', description: "The school name to search for, exactly as given, however partial — fuzzy matched, no need for the full/exact name." },
            },
            required: ['schoolName'],
          },
        },
        {
          name: 'get_statewide_exam_stats',
          description: "Get real statewide 2026 TDLR exam numbers: total test-takers, pass count, pass rate, first-attempt pass rate, and average attempts-to-pass — separately for barber and cosmetology programs and for written vs. practical exams. Call this for 'what's the statewide average,' 'how does my school compare to the state,' or 'how many people/students have taken the exam/test' style questions. This is about exam test-takers specifically — never confuse with employment-match counts (a completely different dataset about geocoded work-location inference, not testing).",
          parametersJsonSchema: { type: 'object', properties: {} },
        },
        {
          name: 'find_student_exam_record',
          description: "Look up a specific student's 2026 TDLR exam record(s) by name — result (pass/fail), score, attempt number, and whether it was their latest attempt. Returns every attempt on file for that person, not just the most recent, so retakes are visible.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: "The student's name to search for, exactly as given, however partial — a full name, first name only, or partial name are all valid and should be tried as-is, never ask for a full name first." },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_school_rankings_by_region',
          description: "Rank barber/cosmetology schools by 2026 written exam pass rate within a specific city. Call this for 'which schools in my area/city have the best pass rates' style questions.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              city: { type: 'string', description: "The city to search within, e.g. 'Houston'." },
            },
            required: ['city'],
          },
        },
        {
          name: 'get_top_schools_by_pass_rate',
          description: "Rank ALL schools statewide by 2026 written exam pass rate, best or worst — distinct from the fixed leaderboard already in context, which ranks by test VOLUME, not pass rate. Call this for 'which schools have the best/worst pass rates statewide' style questions.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: "How many schools to return. Defaults to 10 if not specified." },
              direction: { type: 'string', enum: ['best', 'worst'], description: "'best' for highest pass rates, 'worst' for lowest. Defaults to 'best'." },
            },
          },
        },
        {
          name: 'get_school_test_takers',
          description: "List individual test-takers at a specific school with their result/score, however partial the school name given. Names are automatically redacted (returned as null) for schools whose name indicates a K-12 high school program, since those test-takers are plausibly minors — this is handled server-side, not something to ask permission for.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              schoolName: { type: 'string', description: "The school name to search for, exactly as given, however partial." },
            },
            required: ['schoolName'],
          },
        },
      ],
    };

    const contents: any[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
      }))
    ];

    const generationConfig = {
      // Raised from 250 — a multi-candidate find_professional_employment
      // response now includes two markdown links per candidate (person +
      // venue), and 250 was observed truncating mid-link for a 3-candidate
      // answer (confirmed live: response cut off inside an unclosed
      // markdown link). Raised again to 600 after get_workers_at_venue
      // (a venue with 14 matched workers) also truncated at 400 — paired
      // with a "summarize past 6" instruction on that tool's rule so this
      // is a safety margin, not the only thing preventing truncation on
      // an even larger roster.
      maxOutputTokens: 600,
      // Gemini 2.5 Flash's internal "thinking" tokens count against
      // maxOutputTokens by default — for this simple RAG-lookup-and-
      // summarize task, thinking was eating 200+ of the 250 token budget
      // before generating any visible text, silently truncating almost
      // every response. Disabled since no multi-step reasoning is needed.
      thinkingConfig: { thinkingBudget: 0 },
    };

    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { ...generationConfig, tools: [RENT_STATS_TOOL] },
    });

    // Single round of tool-calling: if the model asked for rent data,
    // execute it, hand the result back, and let it produce the real
    // answer. Not a full agentic loop — one round covers this one tool.
    //
    // employmentMatches collects raw results from the three employment
    // tools that return individually-actionable matches (not the
    // aggregate ones) — passed back to the frontend alongside the text
    // so it can render a "Request Verification" button per match
    // without parsing it back out of prose. Deliberately NOT tool
    // calling: the model only ever answers the question, it never
    // decides to trigger a verification request — that stays a
    // deterministic UI action tied to structured data, not something an
    // unauthenticated chat surface can be talked into doing.
    const employmentMatches: any[] = [];
    if (response.functionCalls && response.functionCalls.length > 0) {
      contents.push({
        role: 'model',
        parts: response.functionCalls.map((fc) => ({ functionCall: fc })),
      });

      const functionResponseParts = await Promise.all(
        response.functionCalls.map(async (fc) => {
          let result: any = null;
          if (fc.name === 'get_rent_stats_by_zip') {
            const zip = fc.args?.zip as string | undefined;
            result = zip ? await getRentStatsByZip(supabase as any, zip) : null;
          } else if (fc.name === 'find_professional_employment') {
            const name = fc.args?.name as string | undefined;
            result = name ? await findProfessionalEmployment(supabase as any, name) : [];
            employmentMatches.push(...(result as any[]));
          } else if (fc.name === 'get_top_venues_by_worker_count') {
            const limit = (fc.args?.limit as number | undefined) || 10;
            const venueType = fc.args?.venueType as ('shop' | 'salon' | undefined);
            result = await getTopVenuesByWorkerCount(supabase as any, limit, venueType);
          } else if (fc.name === 'get_workers_at_venue') {
            const venueName = fc.args?.venueName as string | undefined;
            result = venueName ? await getWorkersAtVenue(supabase as any, venueName) : [];
            employmentMatches.push(...(result as any[]));
          } else if (fc.name === 'get_confirmation_stats') {
            result = await getConfirmationStats(supabase as any);
          } else if (fc.name === 'list_unconfirmed_matches') {
            const limit = (fc.args?.limit as number | undefined) || 20;
            const minConfidence = (fc.args?.minConfidence as number | undefined) || 0;
            result = await listUnconfirmedMatches(supabase as any, limit, minConfidence);
            employmentMatches.push(...(result as any[]));
          } else if (fc.name === 'get_employment_match_overview') {
            result = await getEmploymentMatchOverview(supabase as any);
          } else if (fc.name === 'get_school_exam_stats') {
            const schoolName = fc.args?.schoolName as string | undefined;
            result = schoolName ? await getSchoolExamStats(supabase as any, schoolName) : [];
          } else if (fc.name === 'get_statewide_exam_stats') {
            result = await getStatewideExamStats(supabase as any);
          } else if (fc.name === 'find_student_exam_record') {
            const name = fc.args?.name as string | undefined;
            result = name ? await findStudentExamRecord(supabase as any, name) : [];
          } else if (fc.name === 'get_school_rankings_by_region') {
            const city = fc.args?.city as string | undefined;
            result = city ? await getSchoolRankingsByRegion(supabase as any, city) : [];
          } else if (fc.name === 'get_top_schools_by_pass_rate') {
            const limit = (fc.args?.limit as number | undefined) || 10;
            const direction = (fc.args?.direction as 'best' | 'worst' | undefined) || 'best';
            result = await getTopSchoolsByPassRate(supabase as any, limit, direction);
          } else if (fc.name === 'get_school_test_takers') {
            const schoolName = fc.args?.schoolName as string | undefined;
            result = schoolName ? await getSchoolTestTakers(supabase as any, schoolName) : [];
          }
          return { functionResponse: { name: fc.name, response: { result } } };
        })
      );
      contents.push({ role: 'user', parts: functionResponseParts });

      // validLinks was built from the fixed context before this tool ever
      // ran, so hrefs a tool result introduces (professionalHref/venueHref)
      // aren't in it yet — without this, the sanitizer below would strip a
      // real link just because it came from a tool call instead of the
      // static context.
      collectValidLinks(functionResponseParts, validLinks);

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: generationConfig,
      });
    }

    // Update rate limit cookies
    const newCount = usageCount + 1;
    const nextReset = resetTime && new Date() > new Date(resetTime) ? resetTime : new Date(Date.now() + RATE_LIMIT_RESET_HOURS * 60 * 60 * 1000).toISOString();

    const finalText = response.text ? sanitizeMarkdownLinks(response.text, validLinks) : response.text;
    const res = NextResponse.json({ text: finalText, employmentMatches });
    res.cookies.set('ai_chat_count', newCount.toString(), { path: '/' });
    res.cookies.set('ai_chat_reset', nextReset, { path: '/' });

    return res;

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    // Gemini occasionally returns a transient 503 when the model is under
    // heavy load — this isn't the user's daily rate limit, so say so
    // clearly rather than showing a generic failure (a failed attempt like
    // this doesn't consume any of their 5 daily searches either, since the
    // usage cookie is only updated after a successful response above).
    const isTransientOverload = error?.status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(error?.message || '');
    return NextResponse.json(
      {
        error: isTransientOverload
          ? "Our AI is experiencing high demand right now. This didn't count against your daily searches — please try again in a moment."
          : 'Failed to process AI request.',
      },
      { status: 500 }
    );
  }
}
