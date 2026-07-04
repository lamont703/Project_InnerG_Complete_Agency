import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';

import { createAdminClient } from '@/lib/supabase/admin';
import { computeShopEcosystemReport } from '@/lib/shop-ecosystem';

// Next.js patches the global fetch() to cache responses by default, which
// can end up caching the Gemini SDK's own internal fetch calls (identical
// prompts silently returning a stale cached completion instead of a fresh
// one). Chat responses must never be cached — force this route dynamic.
export const dynamic = 'force-dynamic';

// Simple Rate Limit: 5 per 24 hours
const MAX_REQUESTS = 5;
const RATE_LIMIT_RESET_HOURS = 24;

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
        .select('id, shop_name, city, latitude, longitude, rent_rate')
        .eq('id', shopId)
        .single() as { data: { id: string; shop_name: string; city: string | null; latitude: number | null; longitude: number | null; rent_rate: string | null } | null };
      if (shopRow) {
        const report = await computeShopEcosystemReport(supabase as any, shopRow);
        if (report) {
          shopEcosystemContext = { shop_name: shopRow.shop_name, city: shopRow.city, profile_url: `/shop/${shopRow.id}`, ...report };
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
      barbershops: withProfileUrl(shops, '/shop'),
      professionals: withProfileUrl(barbers, '/barbers'),
      barber_and_cosmetology_schools: withProfileUrl(schoolsForLookup, '/schools'),
      salons: withProfileUrl(salons, '/salons'),
      cosmetologists: withProfileUrl(cosmetologists, '/cosmetologists'),
      supply_stores: withProfileUrl([...barberSupplyStores, ...beautySupplyStores], '/stores'),
      articles_and_videos: webPages,
      software_tools: platformTools,
    };

    // 4. Construct System Prompt
    const systemPrompt = `You are the Inner G Complete AI Assistant, deeply knowledgeable about the barber, beauty and wellness industry — including barbershops, salons, individual barbers and cosmetologists, barber/cosmetology schools, supply stores, and 2026 Texas Class A Barber and Cosmetology Operator licensing exam outcomes (pass/fail rates and student testing volume per school, for each exam separately).
You MUST answer the user's questions based ONLY on the following context data fetched directly from our database.
If the answer is not in the context, say you don't know based on current data.
CRITICAL INSTRUCTION: Keep your answer extremely concise, friendly, and helpful. You MUST keep your entire response under 100 words. Do not ramble. If you write more than 100 words, your response will be abruptly cut off.

LINKING RULE: Whenever you mention a specific tool from software_tools, or a specific barbershop/barber/school/salon/cosmetologist/store that has a profile_url (or profileUrl) field in the context, you MUST format that mention as a markdown link using its EXACT value, e.g. [Barber & Cosmetology Placement](/barber-beauty-network). Every one of those internal links is a relative path starting with "/" — NEVER use a link starting with "http" or "https" for these (this includes Google Places URLs like places.googleapis.com, which sometimes appear elsewhere in this data as image sources, not link destinations). If an item you want to mention does NOT have a profile_url/profileUrl in the context, mention it by plain name with NO link at all — do not construct, guess, or reuse a URL from anywhere else in the data.
The ONE exception is articles_and_videos: each entry's "url" field IS meant to be used as-is (it's a real external link to that article or video, not our own site) — link to it directly, but keep the link label short (the page's title or topic), never the raw_text field, which is scraped page content for your own reference only and must never appear in your response.
Use each link only once per response.

MY_SHOP_ECOSYSTEM_REPORT RULE: If my_shop_ecosystem_report is present, the user is that shop's owner asking about their own local market — it has real computed stats (talent pipeline, labor supply, competition, supply chain, rent) within a radius of their shop, not a search result. Given the 100-word limit, lead with the single most decision-relevant insight (e.g. a tight labor market, a standout nearby school, or rent well above/below the local median) rather than listing every number. If they ask a strategic follow-up (e.g. "should I raise my rent," "should I hire now") that the report's numbers directly speak to, give a concrete, data-grounded answer using those numbers (e.g. rent sitting well below the local median directly supports room to raise it) — don't deflect to "I don't have enough information" when the relevant number is already in my_shop_ecosystem_report. Only decline if the question needs information genuinely outside this data (e.g. their specific finances, lease terms, or customer base).

Context Data (JSON):
${JSON.stringify(mergedContext).substring(0, 120000)}
`;

    // 5. Generate Response (Limit output tokens to keep costs cheap!)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }))
      ],
      config: {
        maxOutputTokens: 250, // Strict output limit
        // Gemini 2.5 Flash's internal "thinking" tokens count against
        // maxOutputTokens by default — for this simple RAG-lookup-and-
        // summarize task, thinking was eating 200+ of the 250 token budget
        // before generating any visible text, silently truncating almost
        // every response. Disabled since no multi-step reasoning is needed.
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    // Update rate limit cookies
    const newCount = usageCount + 1;
    const nextReset = resetTime && new Date() > new Date(resetTime) ? resetTime : new Date(Date.now() + RATE_LIMIT_RESET_HOURS * 60 * 60 * 1000).toISOString();

    const res = NextResponse.json({ text: response.text });
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
