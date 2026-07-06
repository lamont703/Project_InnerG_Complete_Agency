import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';

import { createAdminClient } from '@/lib/supabase/admin';
import { computeShopEcosystemReport, getRentStatsByZip, findProfessionalEmployment } from '@/lib/shop-ecosystem';

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
    const systemPrompt = `You are the Inner G Complete AI Assistant, deeply knowledgeable about the barber, beauty and wellness industry — including barbershops, salons, individual barbers and cosmetologists, barber/cosmetology schools, supply stores, and 2026 Texas Class A Barber and Cosmetology Operator licensing exam outcomes (pass/fail rates and student testing volume per school, for each exam separately).
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

FIND_PROFESSIONAL_EMPLOYMENT TOOL RULE: For "where does [person's name] work" style questions (e.g. from a school confirming a graduate's placement), ALWAYS call find_professional_employment with whatever name was given — a full name, a first name only, or a nickname are all valid inputs, and the tool itself is built to fuzzy-match a real name against booking-platform handles that often don't look like a real name at all ("KamKutz" for "Kam"). Do NOT decline or ask for a "full name" before trying — that defeats the entire point of the tool, which exists precisely because names on file often aren't full "First Last" names. Call it first; only ask a clarifying question afterward if the tool actually returns an empty array. This is a GEOCODED INFERENCE, not a confirmed fact, so results are ranked candidates, never a certainty. Always state the confidenceScore in plain terms (e.g. "high confidence" for 70+, "low confidence, worth double-checking" below 40) and name it as unconfirmed — never say flatly "X works at Y." If multiple candidates come back, say so explicitly rather than picking one silently — the name may match more than one person. If the tool returns an empty array, say plainly that no match was found on file — don't guess or invent a shop/salon name. Each result includes professionalHref and venueHref — per the LINKING RULE, hyperlink BOTH the professional and the venue using these exact values whenever you mention them (either can be null if that entity type has no profile page — in that case mention that one by plain name only).

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
      // markdown link). Still a real ceiling, just sized for the longer,
      // now-mandatory-linking responses rather than the plain-text ones
      // this was originally tuned for.
      maxOutputTokens: 400,
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
    const res = NextResponse.json({ text: finalText });
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
