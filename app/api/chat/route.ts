import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';

import { createAdminClient } from '@/lib/supabase/admin';
import { computeShopEcosystemReport, getRentStatsByZip, findOpenChairs, findProfessionalEmployment, getTopVenuesByWorkerCount, getWorkersAtVenue, getConfirmationStats, listUnconfirmedMatches, getEmploymentMatchOverview, getSchoolExamStats, getStatewideExamStats, findStudentExamRecord, getSchoolRankingsByRegion, getTopSchoolsByPassRate, getSchoolTestTakers, getUpcomingEvents } from '@/lib/shop-ecosystem';
import { currentMember, memberById, getJourney, appendToThread, otherChannelTurns, recentOutreach } from '@/lib/member-context';
import { getViewAsContext } from '@/lib/account/view-as';
import { memberPerformanceContext } from '@/lib/member-performance-context';
import { ownerConnectContext } from '@/lib/owner-connect-context';
import { policyForChannel } from '@/lib/agent-policy';
import { agentJourneyContext, stateCoverageForChat } from '@/lib/member-journey';
import { AUDIENCES } from '@/lib/audiences';
import { slimContext, contextChars } from '@/lib/chat-context-slim';
import { extractUsage, sumUsage, EMPTY_USAGE, type TokenUsage } from '@/lib/ai-usage';
import { recordAiUsage } from '@/lib/ai-usage-record';
import { resolveChatKey, keyFingerprint } from '@/lib/gemini-keys';

// Next.js patches the global fetch() to cache responses by default, which
// can end up caching the Gemini SDK's own internal fetch calls (identical
// prompts silently returning a stale cached completion instead of a fresh
// one). Chat responses must never be cached — force this route dynamic.
export const dynamic = 'force-dynamic';

// TWO ANSWERS FOR ANYONE NOT SIGNED IN. The third question asks for an account.
//
// The counter is incremented only on the SUCCESS path below, so it counts
// answers actually delivered rather than requests attempted — a failed or
// rate-limited call costs the visitor nothing.
//
// WHY TWO. Membership has to be worth something at the moment someone can feel
// it, and the second answer is where a conversation starts being worth keeping;
// the in-chat signup offer appears at exactly the same point, so the guard and
// the offer reinforce rather than compete. It is also the only real control on
// cost: every request is an embedding call plus one or two Gemini generations,
// and the free tier has already returned 429 RESOURCE_EXHAUSTED once.
//
// WHAT IT WILL AND WILL NOT DO TODAY. Only 16 of 197 chat sessions have ever
// reached two model replies and the median session is a single message, so this
// fires rarely right now — it is a ceiling for when the traffic arrives, not a
// lever that changes this week's numbers.
//
// PER 24 HOURS, NOT FOREVER, and that is a deliberate reading of "two total".
// The counter is a cookie: making it permanent would block someone who asked
// two questions six months ago, while still being cleared by anyone who opens
// a private window. A daily reset is the honest version of a soft guard.
const MAX_REQUESTS = 2;
const MAX_REQUESTS_MEMBER = 50;
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

// The chat model.
//
// Moved off gemini-2.5-flash on 2026-08-12, not by choice: it is closed to new
// users, and the ShearQuery-Production / ShearQuery-Development Cloud projects
// are new. The old shared project was grandfathered, which is why this surfaced
// only once chat got its own key — a 404 reading "no longer available to new
// users", not a deprecation notice anyone could have read in advance.
//
// generateContent is unaffected and still fully supported, so this is a model
// ID change rather than an API migration.
//
// Flash-lite tier on purpose: the job is to read grounded JSON and answer in
// under 100 words. At $0.25/M in and $1.50/M out this is cheaper than what it
// replaced ($0.30 / $2.50) — see MODEL_PRICING in lib/ai-usage.ts, and keep the
// two in step or the cost dashboard quietly starts reporting fiction.
//
// EVERYTHING ELSE FOLLOWED ON 2026-08-25. That earlier note said the other call
// sites should stay on gemini-2.5-flash because changing them "would be a
// migration nobody asked for". What forced it was quota, not preference: the
// grandfathered project is on the free tier at 20 requests per DAY per model,
// and roughly sixty call sites were sharing that one ceiling. Features simply
// stopped working, silently, whenever the day's allowance went.
//
// gemini-3.1-flash-lite works on EVERY key we hold — old shared, ShearQuery
// Production and Development alike — which is the property that matters: a
// feature can now be moved to a different project without also being rewritten.
// The old model can only ever run on the grandfathered project.
//
// The daily cap is per PROJECT PER MODEL, so the change alone bought fresh
// quota even where the key did not change.
const CHAT_MODEL = 'gemini-3.1-flash-lite';

export async function POST(req: Request) {
  // Declared outside the try so the catch can still record a failed attempt.
  // A quota block consumes no tokens and is the most costly kind of event in
  // business terms — a ledger that logged only successes would fall silent at
  // exactly the moment something was wrong.
  const startedAt = Date.now();
  const usageParts: TokenUsage[] = [];
  let contextSize: number | null = null;
  let memberIdForUsage: string | null = null;
  let generations = 0;
  let toolCallCount = 0;

  try {
    /*
     * PARSED FIRST because the member lookup below can now depend on it. An
     * internal agent has no cookie to identify itself with and passes a member
     * id in the body instead — see the note on isInternalAgent. req.json() is
     * single-use, so it happens once, here.
     */
    const { messages, shopId, memberId: bodyMemberId, channel } = await req.json();

    const cookieStore = await cookies();
    let usageCount = parseInt(cookieStore.get('ai_chat_count')?.value || '0', 10);
    const resetTime = cookieStore.get('ai_chat_reset')?.value;

    // Reset if time has passed
    if (resetTime && new Date() > new Date(resetTime)) {
      usageCount = 0;
    }

    // Who is asking. Established from their own session cookie — never from
    // anything in the request body — and null for the anonymous majority.
    // Everything downstream treats a null member as the existing behaviour.
    //
    // THE ONE EXCEPTION IS AN INTERNAL AGENT, and the shared secret is the
    // whole guard. The Instagram DM agent has no cookie jar to present: its
    // caller is a Meta webhook, and identity there is a sender id it has
    // already resolved to a member against its own table. Without the header
    // the memberId field in the body is ignored completely, so the worst a
    // leaked URL can do is what an anonymous visitor could already do.
    //
    // Its own rate limit lives in instagram_dm_threads for the same reason —
    // no cookies — so the cookie counter below is left alone here rather than
    // being made to mean two different things.
    const agentSecret = process.env.INTERNAL_AGENT_SECRET;
    const isInternalAgent = Boolean(
      agentSecret && req.headers.get("x-internal-agent") === agentSecret
    );
    /*
     * VIEW AS CHANGES WHO THIS IS, and it was not consulted here at all. An
     * admin viewing the site as a member saw their OWN conversation and their
     * own context — which defeats the point of the feature, since the whole
     * question being asked is "what does the agent say to them".
     *
     * getViewAsContext is the authoritative answer and does its own admin
     * check, so a stale or forged cookie on a non-admin session resolves to
     * null rather than to somebody else's account.
     */
    const viewAs = isInternalAgent ? null : await getViewAsContext();
    const member = isInternalAgent
      ? await memberById(bodyMemberId)
      : viewAs?.viewingAs
        ? await memberById(viewAs.viewingAs.memberId)
        : await currentMember();
    const isViewingAs = Boolean(viewAs?.viewingAs);
    memberIdForUsage = member?.id ?? null;
    const limit = member ? MAX_REQUESTS_MEMBER : MAX_REQUESTS;

    if (usageCount >= limit) {
      return NextResponse.json(
        {
          error: member
            ? `You've reached your limit of ${MAX_REQUESTS_MEMBER} AI searches for today. This resets every 24 hours.`
            // Names what they get, not what they hit. "You've reached your
            // limit" is a door closing; the account is the door.
            : `That's your ${MAX_REQUESTS} free answers for today. A free account gives you ${MAX_REQUESTS_MEMBER} a day — and once it knows your state, licence track and exam date, it stops answering in general and starts answering about your exam.`,
          // Lets the client show a real signup path instead of a dead end.
          upgradeHref: member ? null : '/membership?for=student&src=ai_mode_guard',
          // Lets the client fire a distinct event, so guard-shown can be
          // measured against signups the same way the in-chat offer is.
          reason: member ? 'member_daily_limit' : 'anonymous_limit',
        },
        { status: 429 }
      );
    }

    const latestMessage = messages[messages.length - 1].content;

    // The chat feature's OWN key, pointing at its OWN Cloud project.
    //
    // Google rate-limits per project, not per key, and GEMINI_API_KEY is shared
    // with ~25 batch scripts and ~15 edge functions — so before this split, a
    // backfill run from a laptop drew down the same allowance as live chat, and
    // a staging test drew down production's. Chat gets its own quota here.
    //
    // Falls back to the shared key so nothing breaks mid-migration, but says so
    // loudly: someone who has set up two Cloud projects and deployed should not
    // be able to *believe* the environments are isolated while they are still
    // sharing a ceiling.
    const chatKey = resolveChatKey(process.env as Record<string, string | undefined>);
    if (!chatKey.isolated) {
      console.warn(`[AI Chat] ${chatKey.note}`);
    }
    const ai = new GoogleGenAI({ apiKey: chatKey.key });
    const supabase = createAdminClient();

    // What we know about this member's own situation — state, licence track,
    // school, exam date, ZIP. This is the one category of fact in the whole
    // prompt that isn't a claim about the industry: it's a claim about the
    // person asking, which they told us themselves.
    //
    // Null for anonymous visitors and for members who haven't filled anything
    // in, and in both cases the prompt below simply doesn't mention it — an
    // empty journey object would invite the model to comment on how little it
    // knows, which is worse than saying nothing.
    const todayIso = new Date().toISOString().split('T')[0];
    let journeyContext: Record<string, unknown> | null = null;
    if (member) {
      const facts = await getJourney(member.id);
      journeyContext = agentJourneyContext(facts, todayIso, member.firstName);
    }
    const audienceBrief = member?.audience ? AUDIENCES[member.audience].agentBrief : null;

    /*
     * EVERY SIGNED-IN AUDIENCE, INCLUDING STUDENTS.
     *
     * Students were excluded at first, reasoning that the student brief forbids
     * pitching listing claims. That conflated two different things. The brief
     * bans an UNPROMPTED pitch — a student asking about exam prep should not be
     * steered into an owner funnel — and that guard still stands, in the brief
     * where it belongs. It is not a reason to withhold the facts when a student
     * ASKS, and students in this trade rent booths and open shops, frequently
     * before the licence is even issued.
     *
     * Withholding the context does not make the assistant tactful, it makes it
     * wrong: with no owner_connect_context it cannot tell a student who already
     * connected Google from one who never has, and falls back to "I can't help
     * with that" — the exact bug this whole change exists to fix.
     *
     * Nor is it limited to the 'owner' audience: people mislabel themselves at
     * signup, and a licensed professional renting a suite is an owner in every
     * way that matters here.
     */
    const ownerConnect = await ownerConnectContext(member?.id ?? null);

    /*
     * What they said to their agent somewhere OTHER than this chat. The chat
     * transcript already arrives with the request; this is the SMS and email
     * half that used to be invisible here.
     */
    const otherChannels = member ? await otherChannelTurns(member.id) : [];

    /*
     * What we SENT them, as facts rather than conversation. Kept apart from the
     * turns above so the agent can know an offer was made without believing it
     * was something the two of them discussed.
     */
    const outreach = member ? await recentOutreach(member.id) : [];

    /*
     * Their own numbers — listing traffic, booking requests, ad placements.
     * Three pages already hold this and none of it reached the model, so an
     * owner asking how their listing was doing got a general answer about the
     * directory: the least useful moment to be generic, since it is the one
     * question only we can answer for them.
     */
    const performance = member
      ? await memberPerformanceContext(member.id, (member as any).userId ?? null)
      : null;

    // When a shop owner arrives from their own shop's profile page via "Ask
    // AI About This Market", shopId identifies exactly which shop — this is
    // a direct geospatial computation (haversine + free-text rent parsing),
    // not something a similarity search over embeddings could answer, so it
    // bypasses the RAG grounding below entirely, same as the exam leaderboards.
    let shopEcosystemContext: any = null;
    if (shopId) {
      const { data: shopRow } = await supabase
        .from('agent_barbershop_leads')
        .select('id, slug, shop_name, city, latitude, longitude, rent_rate, census_median_household_income, census_population, school_district_name')
        .eq('id', shopId)
        .single() as { data: { id: string; slug: string; shop_name: string; city: string | null; latitude: number | null; longitude: number | null; rent_rate: string | null; census_median_household_income: number | null; census_population: number | null; school_district_name: string | null } | null };
      if (shopRow) {
        const report = await computeShopEcosystemReport(supabase as any, shopRow);
        if (report) {
          shopEcosystemContext = {
            shop_name: shopRow.shop_name,
            city: shopRow.city,
            profile_url: `/shop/${shopRow.slug}`,
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
      items.map((item) => ({ ...item, profile_url: item.slug ? `${basePath}/${item.slug}` : undefined }));

    // 3. Merge Context Data. texas_2026_exam_school_leaderboard is listed
    // first (defense in depth) since with 9 grounded sources the combined
    // JSON can run 60-70k+ characters — a much smaller truncation cap here
    // previously cut the JSON off before ever reaching a field added later
    // in the object, silently making the model "forget" that data existed.
    const mergedContext = {
      // First in the object, for the same defense-in-depth reason the exam
      // leaderboard is: this JSON gets truncated at 120k characters, and who
      // the member is must never be the thing that falls off the end.
      ...(journeyContext ? { member_journey_context: journeyContext } : {}),
      ...(ownerConnect ? { owner_connect_context: ownerConnect } : {}),
      ...(otherChannels.length ? { recent_other_channels: otherChannels } : {}),
      ...(outreach.length ? { recent_outreach: outreach } : {}),
      ...(performance ? { my_performance: performance } : {}),
      ...(shopEcosystemContext ? { my_shop_ecosystem_report: shopEcosystemContext } : {}),
      // Near the top for the same truncation reason as the two above. Someone
      // arriving from a state page's suggested question has NO journey profile,
      // so this is the only thing that lets the assistant answer for a state
      // other than Texas instead of refusing.
      state_licensing_coverage: stateCoverageForChat(),
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

    // TRIM BEFORE ANYTHING ELSE READS IT.
    //
    // slimContext drops ranking internals, nulls and image URLs, and caps the
    // scraped article bodies that measurement showed to be 43% of the entire
    // payload. Applied here, before validLinks is collected, so the two can
    // never disagree about what the model was actually shown — and so an image
    // URL that is no longer in the context is no longer a legal link target
    // either, which is what the prompt has always said and could not enforce.
    const slimmedContext = slimContext(mergedContext);
    contextSize = contextChars(slimmedContext);

    const validLinks = new Set<string>();
    collectValidLinks(slimmedContext, validLinks);

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
${audienceBrief ? `\nWHO YOU ARE TALKING TO: ${audienceBrief}\n` : ''}${journeyContext ? `
MEMBER_JOURNEY_CONTEXT RULE: member_journey_context is in the context data below. It is not a search result — it is what this specific person told us about their own situation, and it is the reason they made an account. Use it without being asked to.
- ANSWER FOR THEIR STATE AND THEIR LICENCE, always. Rules, fees, exam format and kit requirements differ per state and per licence far more than the names suggest. Never hand a California student a Texas figure, or a manicurist a cosmetology answer, just because that is the more common case in the data.
- days_until_exam is already computed for you. Use that number directly; do not do date arithmetic of your own, and do not ask what today's date is.
- IF state_has_practical_exam IS FALSE, THERE IS NO PRACTICAL EXAM AND NO KIT. Do not mention kit lists, mannequins, models, or what to pack — not even as a "you may also need to". Their licence is decided by the written examination alone. Saying otherwise sends someone to buy equipment they will never use.
- their_kit_list_url, their_requirements_url and each next_steps[].url are real internal links — hyperlink them per the LINKING RULE when they are relevant to what was asked.
- A null field means they have not told us, NOT that the answer is unknown or that it does not apply. If a null field would materially change your answer (most often exam_date, state or license_track), ask for that one thing in a single short question rather than guessing or hedging across every possibility.
- Do not recite their profile back at them, do not open with a greeting that lists what you know, and use their first name at most once in a conversation. Someone who told you their exam date wants a better answer, not a demonstration that you remembered.
- NEVER invent a journey fact. If member_journey_context says school_name is null, you do not know where they study — the same rule as every other fact on this page.
` : ''}
MY_PERFORMANCE RULE: my_performance holds THIS member's own numbers — their listing traffic, their booking requests and their ad placements. It is not a search result and not the directory average. Use it whenever they ask how they are doing, whether something is working, or what any of those three features is for.
- gbp_audit IS THE ONLY SOURCE FOR THEIR GOOGLE PROFILE SCORE. It carries the current score, its grade, when it was measured and the previous score. If a number appears anywhere else in the context — in an email we sent them, in something they wrote — it is history, not their score today. Answering with a figure lifted from a notification is how you tell somebody their score is 75 when the page in front of them says 88.
- IF gbp_audit IS ABSENT they have not connected Google or have never run the audit. Say that and point at owner_connect_context, rather than reaching for any number you can find.
- ANSWER WITH THEIR NUMBERS, NOT A DESCRIPTION OF THE FEATURE. "You had 340 visits last month, up from 280" is the answer. "Listing Insights shows your traffic" is a brochure.
- direction IS ALREADY COMPUTED — use it and do not recompute from the two figures. If it says "not_enough_history" then say there is not enough history yet rather than comparing against a zero.
- A MISSING SECTION MEANS NOTHING IS SET UP, NOT ZERO PERFORMANCE. If booking_requests is absent they have had no requests or have not claimed a listing; if ads is absent they are not running any. Say which, and say what would change it — never report an absent section as poor results.
- EACH SECTION CARRIES ITS page_url. Link it per the LINKING RULE when you point them at the detail; these are real internal pages exactly like owner_connect_context's.
- NEVER INVENT A COMPARISON. There is no industry benchmark in here. "That's above average for a barbershop" is not something you know.
- most_recent DELIBERATELY OMITS PHONE AND EMAIL. Those are on the booking requests page and are not needed to answer a question about how many came in.

RECENT_OTHER_CHANNELS RULE: recent_other_channels, when present, is what THIS member said to you — and what you replied — on channels other than this chat, most often SMS. Each entry has a channel, a role, the text and a timestamp.
- IT IS NOT PART OF THIS CONVERSATION. Never say "as I mentioned above" or "as you just said" about one of these. They happened elsewhere and possibly days ago. Refer to them for what they are: "you texted me last week that...".
- USE IT WITHOUT BEING ASKED, the same as member_journey_context. Someone who told you their booth rent by text should not be asked for it again in chat — being asked twice is the whole reason this exists.
- role 'human' means a person on our team wrote it, not you. Do not claim you said it.
- IT IS A RECENT SLICE, NOT EVERYTHING. Do not say "you have never mentioned that" on the strength of this — you are seeing a handful of the latest turns per channel, not their whole history. Absence here is not evidence.
- NEVER SAY YOU HAVE NO ACCESS TO A CHANNEL because you see nothing from it here. Saying "I do not have access to any email conversations" when the window simply held none is a claim about your capabilities, and it is false — you would have seen email if there were recent email. Say what is true instead: nothing from that channel is in the recent slice.
- NEVER REPEAT IT BACK AS A SUMMARY. Do not open by listing what they told you elsewhere. Use it to give a better answer, exactly as with their journey.

RECENT_OUTREACH RULE: recent_outreach is what ShearQuery has SENT this member — offers, nurture emails, product notices — with a short label, a date and how many times it went out. It is NOT conversation and must never be described as one.
- NEVER SAY "AS I MENTIONED" OR "WE DISCUSSED" ABOUT ANY OF IT. Nobody discussed it; a system sent it. Treat it the way you would treat knowing which page they visited.
- ENGAGEMENT TELLS YOU WHICH ONES MATTER, and they are not equal. "delivered" means it was never opened — that is the weakest thing here and usually says the message did not land, not that they refused. "opened" means they read it and moved on. "clicked" means they were interested enough to follow the link and then stopped, which is the only one strong enough to raise on its own.
- A NULL ENGAGEMENT MEANS UNKNOWN, NOT IGNORED. SMS carries no status at all. Never treat an absent value as evidence they did not engage.
- IT SAYS SENT, NOT READ. A message going out three times with nothing beyond "delivered" may well mean they are not interested, or that it never reached them. Do not read the list as a queue of things to pitch.
- USE IT ONLY WHEN IT ANSWERS WHAT THEY ASKED. If someone asks how to get more Saturday bookings and they were offered a profile audit twice without taking it, that offer is the answer and worth raising. If they ask about booth rent, it is not. Opportunistic, never promotional — the same rule as OWNER_CONNECT_CONTEXT.
- IF THEY ASK WHAT WE HAVE SENT THEM, answer from this plainly and completely. That is a fair question about their own account and there is nothing to be coy about.
- NEVER REPRODUCE THE MARKETING WORDING. You have a label, not the copy. Say what the offer was about in your own words.
- NEVER TAKE A FACT OUT OF ONE OF THESE LABELS. They are truncated subject lines from messages sent weeks ago, and any figure inside one is a snapshot of that day — a score, a count, a price. Reading "Score 75" out of an August email and reporting it as their score today is exactly the error this line exists to prevent. Current numbers live in my_performance and nowhere else.

OWNER_CONNECT_CONTEXT RULE: owner_connect_context describes THIS person's own listing and Google connection, and is always present. It is not a search result. Use it to answer anything about claiming a listing, connecting Google, or managing their own business on here.
- YOU CAN HELP WITH THIS. Connecting a Google Business Profile is a real, shipped feature. Never say you are unable to help with it, and never send them somewhere else to do it.
- BUT YOU CANNOT DO IT FOR THEM, and must not imply otherwise. Google requires the owner to sign in on Google's own site and approve the consent screen; nobody can approve it on their behalf. The honest offer is "here is the link, it takes about a minute" — never "I've connected it" or "I'll take care of it".
- THE GOOGLE STEP OPENS IN A NEW TAB, everything else opens beside the chat. Google refuses to be framed, so connect_url deliberately leaves the panel. Set that expectation in passing — "it'll open in a new tab" — so the switch does not read as the flow breaking, and tell them to come back to the chat afterwards. Do not describe it as leaving the site.
- IF signed_in IS FALSE, they have no account yet, so lead with signup_url. Say plainly why it comes first: the account is what lets you remember them between messages, and what the listing and the Google connection attach to. Then connect_url is the next step — it sends them through sign-in and straight into Google's approval, so they do not have to find it again. Offer login_url instead if they say they already have an account. Give them the steps as links they can open right there; do not tell them to go away and come back.
- IF signed_in IS TRUE and google_connected is FALSE, link connect_url and say in one line what it gets them — pick the one or two items from unlocked that fit their question rather than reciting the list.
- IF google_connected is TRUE, they are already connected (google_account_email says which account). Do not pitch connecting again. Point them at whichever of the unlocked pages answers what they actually asked.
- If claimed_listing is present, name it. Knowing which business is theirs is the difference between a useful offer and a generic pitch. If it is null they have not claimed a listing yet, so link claim_url — claiming and connecting are separate steps and claiming comes first.
- NEVER invent a listing. A null claimed_listing means we do not know which business is theirs, not that they have none. Ask which shop or salon is theirs rather than guessing from anything else in the context.
- STAY ON THIS UNTIL IT IS DONE. If they are part-way through, pick up where they are rather than restarting the pitch, and answer the next question they will actually hit — which Google account to use, that the shop must already exist on Google, what happens after approval.
- Do not raise this when it is not what they asked about. An owner asking about booth rent wants an answer about booth rent, and a student asking about exam prep wants exam prep. Raise it when THEY raise it, or when it is the direct answer to what they asked.
- This applies to students too. Do not refuse a student who asks about claiming a listing or connecting Google — many are already renting a booth or opening a shop. Answer them exactly as you would an owner.

STATE COVERAGE RULE: state_licensing_coverage lists every state this site covers, whether that state has a practical exam at all, and the kit lists we publish for it. Use it whenever someone asks about a state — including states with no business listings, where it may be the only thing you hold on them. Three things it settles that you must not get wrong:
- If has_practical_exam is false, that state licenses on the written examination alone. Say so plainly and do not mention kits, mannequins or what to pack.
- MATCH THE LICENCE LOOSELY BEFORE CONCLUDING WE HAVE NOTHING. The labels are formal; people are not. "esthetics" and "skin care" are Esthetician. "nails", "manicure" and "nail tech" are Manicurist / Nail Technician. "teaching" and "instructor" are Instructor. "hair" is usually Cosmetology. If any entry in practical_exam_kit_lists plausibly covers the licence they named, link THAT entry.
- LICENSING_GUIDES IS THE REST OF WHAT WE PUBLISH FOR THAT STATE, alongside the kit list: requirements_url (how to get licensed), exam_prep_url (the written exam) and renewal_url (renewing and CE). Each is a real internal page — hyperlink it per the LINKING RULE whenever it answers what was asked, exactly as you would a kit list. These were absent from the context until now, so a renewal or requirements page could only be described in plain text; that is no longer true and there is no reason to describe one without linking it.
- A missing field in licensing_guides means we do not publish that page for that licence — link the state hub instead. Never adapt another state's guide: fees, hours and CE rules differ per state, and the whole point of these being separate pages is that they are not interchangeable.
- Only say we do not publish a kit list when practical_exam_kit_lists for that state is EMPTY, or when nothing in it covers their licence at all. Then link the state hub. Never substitute another state's kit — the exam vendors differ (PSI, NIC, and several boards run their own), and so do the kits.
- Every profile_url in this block is a real internal link. Hyperlink it per the LINKING RULE.
Exam data (the 2026 leaderboards) is Texas-only. Never present a Texas pass rate as though it applied to another state.

LINKING RULE: Whenever you mention a specific tool from software_tools, or a specific barbershop/barber/school/salon/cosmetologist/store that has a profile_url (or profileUrl) field in the context, you MUST format that mention as a markdown link using its EXACT value, e.g. [Barber & Cosmetology Placement](/barber-beauty-network). Every one of those internal links is a relative path starting with "/" — NEVER use a link starting with "http" or "https" for these (this includes Google Places URLs like places.googleapis.com, which sometimes appear elsewhere in this data as image sources, not link destinations). If an item you want to mention does NOT have a profile_url/profileUrl in the context, mention it by plain name with NO link at all — do not construct, guess, or reuse a URL from anywhere else in the data.
owner_connect_context IS LINKABLE, and this is a deliberate exception. Its connect_url, signup_url, login_url and claim_url, and every url inside its unlocked list, are real internal paths meant to be used exactly as given — treat them like a profile_url. This has to be said explicitly because the rule above forbids linking anything without a profile_url, and the result was an owner asking to connect Google being handed a link to an unrelated tool that happened to have one. NEVER substitute a different link because you want to give one: if the right destination is in owner_connect_context, use it, and if there is no right destination, give no link at all.
The ONE exception is articles_and_videos: each entry's "url" field IS meant to be used as-is (it's a real external link to that article or video, not our own site) — link to it directly, but keep the link label short (the page's title or topic), never the raw_text field, which is scraped page content for your own reference only and must never appear in your response.
Use each link only once per response.

MY_SHOP_ECOSYSTEM_REPORT RULE: If my_shop_ecosystem_report is present, the user is that shop's owner asking about their own local market — it has real computed stats (talent pipeline, labor supply, competition, supply chain, rent) within a radius of their shop, not a search result. Given the 100-word limit, lead with the single most decision-relevant insight (e.g. a tight labor market, a standout nearby school, or rent well above/below the local median) rather than listing every number. If they ask a strategic follow-up (e.g. "should I raise my rent," "should I hire now") that the report's numbers directly speak to, give a concrete, data-grounded answer using those numbers (e.g. rent sitting well below the local median directly supports room to raise it) — don't deflect to "I don't have enough information" when the relevant number is already in my_shop_ecosystem_report. Only decline if the question needs information genuinely outside this data (e.g. their specific finances, lease terms, or customer base).
local_census_tract_median_household_income and school_district (also inside my_shop_ecosystem_report, when present — some shops haven't been enriched yet) are two more direct signals about the shop's own location, not a radius computation. Use school_district only when it's actually relevant to what they're asking (e.g. marketing, target clientele, "who are my customers") — Texas barbershops are neighborhood/community hubs, so being in a specific ISD is a real identity signal, but don't force it into every answer.

INCOME/POPULATION: my_shop_ecosystem_report has TWO distinct pairs of figures — don't conflate them. (1) local_census_tract_median_household_income and local_census_tract_population describe ONLY the shop's own immediate census tract, a small area (often just a couple thousand people) — the single most precise figure for its exact block, but not representative of its full trade area. (2) marketDemographics.weightedAvgMedianHouseholdIncome and marketDemographics.estimatedPopulation are aggregated across the census tracts of the tracked venues and labor pool within this report's radii (see marketDemographics.tractsSampled for how many tracts that covers) — this is the right figure for "how many people/what income level is in my market" since it matches the scope of the other stats in this report (competition, labor market, schools). Prefer marketDemographics for general "my market/my area" questions; use the tract-level figure only when they're specifically asking about their immediate block. If marketDemographics values are null (tractsSampled is 0), fall back to the tract-level figures and say so.
Outside of my_shop_ecosystem_report entirely (no shop context at all), there is no general area/city-wide income or population lookup. Say clearly that you have income/population data scoped to a specific shop's market (via its profile page) but not as a standalone general lookup — don't just say "I don't have information on income data" as if the concept doesn't exist at all, since that's misleading about what the platform can actually do.

RADII ARE FIXED: my_shop_ecosystem_report.radii holds the fixed per-section radii this report was computed at (talent/labor/supply/rent within 15 miles, competition within 10 miles) — each section is scoped to its own radius, and you cannot recompute at a different distance, nor is there a live tool call to do so mid-conversation. If asked for a different radius (e.g. "what about a 5-mile radius"), say plainly that this report is fixed at those radii and you don't have the ability to recompute it — do NOT say "we can adjust this" or otherwise imply that's possible.

SCHOOL_DISTRICT_NAME RULE: barbershops, salons, professionals, and cosmetologists in the general lookup context (not just my_shop_ecosystem_report) may include a school_district_name field — mention it when relevant (e.g. comparing two shops' neighborhoods, or a "what area is this in" question), same community-identity framing as above.

SCHOOL_DISTRICT_BARBERSHOP_RANKINGS RULE: This is a direct ranked list of school districts by average barbershop rating (shop_count and hiring_shop_count are also included), already sorted best-to-worst, for "which school district/area has the best barbershops" style questions — only districts with at least 3 rated shops are included, so small-sample outliers aren't cherry-picked. Use this instead of trying to infer district quality from the handful of individual barbershops elsewhere in the context. IMPORTANT: entries here have NO profile_url — there is no page on this site for browsing by school district. Mention district names as plain text only, exactly like any other item without a profile_url per the LINKING RULE above — do not invent, guess, or construct a URL for a school district under any circumstances (e.g. never write something like "/school-districts/...").

FIND_OPEN_CHAIRS TOOL RULE: WHICH VENUES HAVE A CHAIR FREE IS NOT IN THE CONTEXT BELOW, AND YOU MUST NOT ANSWER IT FROM THERE. The barbershops and salons arrays are a partial, location-agnostic sample carrying no trustworthy availability figure and no distance from the person asking. Answering an availability question out of them produces a confidently wrong total — measured, not hypothetical: it reported "372 open chairs across 28 venues" when the real inventory was 202 across 52, and listed a shop 7 miles away as the nearest while three sat within 1.6 miles. ANY question about a chair, booth, station or space being open, available, free or for rent — however short — REQUIRES a find_open_chairs call before you answer. If you have not called it, you do not know.
THIS IS ALSO THE QUESTION THE INSTAGRAM BIO TELLS PEOPLE TO ASK. The bio says: DM "open chairs near 77026". So a message that is nothing but a zip code, or "any chairs", or "who's renting", is a complete question — call find_open_chairs with whatever location is in it and answer. NEVER ask them to rephrase, and never reply that you need more detail before looking: a person who messaged an account that advertised an answer must get one.
- "NEAR" MEANS NEAR, NOT IN, AND THIS IS THE ONE THAT GOES WRONG. Only 38 zips have any open chair, so a zip with none of its own IS THE NORMAL CASE — the tool has already handled it by anchoring on that zip and measuring outward. A shop one mile away in the next zip is a CORRECT and welcome answer to "open chairs near 77026". IF THE TOOL RETURNED ANY LISTINGS, NEVER REPLY THAT WE HAVE NOTHING IN THAT ZIP; give the nearest few with their distances. Saying "no barbershops in 77026 on file" while holding three listings within two miles is the single worst answer available: it is false, and it turns the person away from inventory that was sitting right there. Say we have nothing ONLY when listings is empty, or anchorResolved is false.
- A BARE ZIP, OR A SHORT PHRASE WITH ONE IN IT, IS A COMPLETE QUESTION. "open chairs near 77026" is the exact wording our Instagram bio prints, so it will arrive verbatim and often. Call the tool, answer with the nearest listings, full stop.
- NEVER SAY "NEAREST" WHEN distanceMiles IS null. With no anchor the list is ordered by how many chairs each venue has, not by distance, so calling them nearest is simply false — you do not know where the person is. Call them the biggest, or just "shops with space", and ask where they are.
- NO LOCATION AT ALL? CALL IT ANYWAY, WITH NO ARGUMENTS. Then say what exists and where — "202 open chairs across 52 shops, mostly Houston" — and ask for their zip to narrow it. Never ask for a zip before telling them what we have: on Instagram a stranger gets three free messages, and spending the first one collecting input rather than giving an answer is how the conversation ends.
- IF YOU SAY "SEVERAL", LIST SEVERAL. Three or four, not one.
- IT IS NOT get_rent_stats_by_zip. That tool returns median/min/max PRICE for a zip and no listings; this one returns the actual venues with a chair free. "What's rent like in 77099" is that tool. "Any open chairs in 77099" is this one. If someone asks both, call both.
- weeklyRent: null MEANS THEY NEVER TOLD US A PRICE. It does not mean free, and it does not mean cheap. Say "rent not listed — worth asking them" and move on. Do not skip a listing for having no price; 21 of the venues with a free chair have no rent on file and they are real chairs.
- USE distanceMiles, because it is why the answer is trustworthy. "1 mile away" is the thing that makes them act. Round it as given.
- anchorResolved: false MEANS WE COULD NOT PLACE THEIR LOCATION — usually somewhere we have no listings at all. Then the listings are NOT near them and are sorted by size instead. Say plainly that we have nothing in their area yet, say where the inventory actually is (totalOpenChairs across totalOpenVenues, currently Houston and Dallas), and do not present a Houston shop to someone in California as if it were nearby. nearestIsFar: true is the same warning in a place we do cover — lead with the distance.
- LINK EVERY LISTING with its href per the LINKING RULE.
- KEEP IT TO 3 OR 4. Name the nearest few with chairs, rent and distance. totalOpenChairs is the whole inventory, so it is fair to close with how many more there are — but do not list them.

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

GET_UPCOMING_EVENTS TOOL RULE: For any question about barber/beauty/wellness industry events — expos, trade shows, competitions, education/CEU classes, networking, charity events — call get_upcoming_events. This is a completely separate, unrelated dataset from exam data and employment matches — "event" language here means an actual scheduled happening (a date, a venue), never confuse it with a "test event" or "employment match." Always upcoming-only; if asked about past events, say plainly that only upcoming events are tracked. Hyperlink every event via eventHref, and its ticketHref too if present (label that one "tickets" or "buy tickets", not the event name itself, so the two links aren't confused). If more than 6 results come back, list the soonest 6 and say "and N more" for the rest.

ENTITY LINKING IS NOT OPTIONAL: AI Mode doubles as navigation into the rest of the site, not just an answer — so the LINKING RULE above applies every single time you mention a specific barbershop/barber/school/salon/cosmetologist/store/tool that has a profile_url (or an equivalent href from a tool result like find_professional_employment), with no exceptions. Don't drop a link just because you've already mentioned that entity earlier in the conversation — link it again each time.

${policyForChannel(channel)}

Context Data (JSON):
${JSON.stringify(slimmedContext).substring(0, 120000)}
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
          name: 'find_open_chairs',
          description: "List barbershops and salons that have a booth/chair OPEN RIGHT NOW, nearest first, with how many chairs, the weekly rent when we know it, and a link. This is the inventory question — 'any open chairs near me', 'who's renting a booth in 77026', 'which shops are hiring', 'where can I rent a chair'. Distinct from get_rent_stats_by_zip, which returns price statistics and no listings. Pass whatever location was given; both arguments are optional.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              zip: { type: 'string', description: "A 5-digit US zip code if one was given, e.g. '77026'." },
              city: { type: 'string', description: "A city name, e.g. 'Houston'. Use when a city was named but no zip." },
              limit: { type: 'number', description: "How many listings to return. Defaults to 6. Use 3-4 when replying on Instagram, where answers must be short." },
            },
          },
        },
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
        {
          name: 'get_upcoming_events',
          description: "Find upcoming barber/beauty/wellness industry events (trade shows, competitions, education/CEU classes, networking, charity) — always excludes past events automatically. Call this for ANY question about industry events, however phrased, e.g. 'what barber events are coming up', 'any expos in Houston', 'competitions this year' — try calling with the city/keyword as the query even for a short or partial location name, don't ask for clarification first.",
          parametersJsonSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: "Free-text to match against event title/description/venue/city — a SPECIFIC term like 'Houston' or a single keyword. For a broad/generic question with no specific city or keyword (e.g. 'any barber events coming up', 'what industry events are there') pass an EMPTY STRING here, not the literal question text — confirmed live: passing a whole descriptive phrase like 'barber industry events' fails to match real events since that exact phrase isn't in any event's data, while an empty string correctly lists everything upcoming." },
              category: { type: 'string', enum: ['Trade Show', 'Competition', 'Education/CEU', 'Networking', 'Charity', 'Other'], description: "Optional exact category filter." },
              limit: { type: 'number', description: "How many events to return. Defaults to 10 if not specified." },
            },
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
      model: CHAT_MODEL,
      contents,
      config: { ...generationConfig, tools: [RENT_STATS_TOOL] },
    });
    generations += 1;
    usageParts.push(extractUsage(response));

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
      toolCallCount = response.functionCalls.length;

      // SEND BACK THE MODEL'S OWN TURN, VERBATIM. Do not rebuild it.
      //
      // This used to be `response.functionCalls.map(fc => ({ functionCall: fc }))`,
      // which looks equivalent and is not. `functionCalls` is a convenience
      // accessor returning the PARSED calls; the parts it hands back have lost
      // the `thoughtSignature` that Gemini attached to the originals. Sending
      // the reconstructed turn therefore drops the signature, and the second
      // generation fails:
      //
      //   400 INVALID_ARGUMENT — "Function call is missing a thought_signature
      //   in functionCall parts. This is required for tools to work correctly."
      //
      // Google's thinking guide is explicit that when you manage history
      // yourself you "MUST always resend all thought blocks exactly as they
      // were received from the model", and that for generateContent those
      // signatures ride on the functionCall parts themselves.
      //
      // THIS BUG WAS LATENT, NOT NEW. gemini-2.5-flash did not enforce the
      // requirement, so the reconstruction worked by luck for as long as we
      // were on it. Moving to gemini-3.1-flash-lite (forced — 2.5-flash is
      // closed to new Cloud projects) is what made it fire, and it broke every
      // one of the 15 tools at once while plain answers kept working, which is
      // why it read as "worked at first, then stopped".
      //
      // Note that thinkingBudget: 0 does NOT exempt us: the docs state that
      // reducing thinking does not remove the signature requirement.
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn && Array.isArray(modelTurn.parts) && modelTurn.parts.length > 0) {
        contents.push({ ...modelTurn, role: modelTurn.role || 'model' });
      } else {
        // Only if the response shape is not what we expect. Reconstructing is
        // better than pushing nothing — a turn with no model reply at all is a
        // guaranteed failure, where this is merely the old broken behaviour.
        console.warn('[AI Chat] no candidate content on a tool-calling turn — falling back to reconstruction');
        contents.push({
          role: 'model',
          parts: response.functionCalls.map((fc) => ({ functionCall: fc })),
        });
      }

      const functionResponseParts = await Promise.all(
        response.functionCalls.map(async (fc) => {
          let result: any = null;
          if (fc.name === 'find_open_chairs') {
            result = await findOpenChairs(supabase as any, {
              zip: fc.args?.zip as string | undefined,
              city: fc.args?.city as string | undefined,
              limit: fc.args?.limit as number | undefined,
            });
          } else if (fc.name === 'get_rent_stats_by_zip') {
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
          } else if (fc.name === 'get_upcoming_events') {
            result = await getUpcomingEvents(supabase as any, {
              query: fc.args?.query as string | undefined,
              category: fc.args?.category as string | undefined,
              limit: fc.args?.limit as number | undefined,
            });
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

      // The second generation re-sends the ENTIRE context along with the tool
      // result, so a tool-calling turn costs roughly double. Counted as its
      // own generation rather than folded in, because "why was that message
      // twice the price" is a question the dashboard should answer.
      response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: generationConfig,
      });
      generations += 1;
      usageParts.push(extractUsage(response));
    }

    // Update rate limit cookies
    const newCount = usageCount + 1;
    const nextReset = resetTime && new Date() > new Date(resetTime) ? resetTime : new Date(Date.now() + RATE_LIMIT_RESET_HOURS * 60 * 60 * 1000).toISOString();

    const finalText = response.text ? sanitizeMarkdownLinks(response.text, validLinks) : response.text;

    // Persist the exchange for signed-in members only. Anonymous chats stay in
    // sessionStorage exactly as before and are never written to the database —
    // there is no account to attach them to, and storing them against a cookie
    // would be collecting conversations from people who never asked us to.
    //
    // Awaited rather than fired and forgotten: this runs on a serverless
    // function that may be frozen the moment the response is returned, so a
    // dangling promise here is a write that usually doesn't happen. It is
    // written post-sanitization, so what the member sees is what gets stored.
    if (member && finalText) {
      /*
       * NOT PERSISTED WHILE IMPERSONATING. Reading their history is the point
       * of View As; writing to it is not. An admin testing what the agent says
       * to a member must not leave that member a message they never sent — it
       * would land in their thread, feed back as memory, and the agent would
       * later refer to a conversation that never happened.
       *
       * So this is deliberately read-their-context, write-nothing.
       */
      if (!isViewingAs) {
        await appendToThread(member.id, latestMessage, finalText);
      }
    }

    // Awaited, not fired and forgotten: this is a serverless function and work
    // still in flight when the response returns may simply be killed, which
    // would make the ledger quietly lossy — and a ledger you cannot trust to
    // be complete is worse than none, because it still gets used.
    await recordAiUsage({
      route: '/api/chat',
      model: CHAT_MODEL,
      usage: sumUsage(usageParts),
      contextChars: contextSize,
      generations,
      toolCalls: toolCallCount,
      latencyMs: Date.now() - startedAt,
      status: 'ok',
      communityMemberId: memberIdForUsage,
    });

    const res = NextResponse.json({ text: finalText, employmentMatches });
    res.cookies.set('ai_chat_count', newCount.toString(), { path: '/' });
    res.cookies.set('ai_chat_reset', nextReset, { path: '/' });

    return res;

  } catch (error: any) {
    // WHY THIS BLOCK IS NOT JUST console.error + "something went wrong".
    //
    // It used to be, and it cost a full afternoon. A 500 on staging was
    // indistinguishable from a Gemini quota block, a missing environment
    // variable, and a malformed request — the response said "Failed to process
    // AI request" for all of them, and the browser console said 500. Three
    // rounds of hypotheses were needed to rule out a free-tier quota that had
    // never been the cause, because nothing anywhere named the actual error.
    //
    // The failure mode worth naming: a 429 from Gemini (RESOURCE_EXHAUSTED —
    // the real quota block) was being flattened into the same generic 500 as
    // everything else, so an upstream rate limit was invisible while a user's
    // OWN daily limit got a clear, friendly message.
    const status = error?.status ?? error?.response?.status;
    const message = String(error?.message || '');

    const kind =
      status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(message)
        ? 'upstream_overloaded'
        : status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)
        ? 'upstream_quota'
        : /is not set|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|invalid authentication/i.test(message)
        ? 'misconfigured'
        : 'unknown';

    // One structured line, so a log search finds the classification rather than
    // a stack trace that has to be read.
    // keySource and the 4-character fingerprint are the two facts that turn
    // "the AI is broken" into "this deployment picked up the wrong key" — the
    // question an environment split creates and nothing else answers.
    const keyInfo = resolveChatKey(process.env as Record<string, string | undefined>);
    console.error(
      `[AI Chat Error] kind=${kind} status=${status ?? 'none'} name=${error?.name || 'Error'} ` +
      `keySource=${keyInfo.source} key=${keyFingerprint(keyInfo.key)} isolated=${keyInfo.isolated}: ${message}`
    );

    // Failures are recorded too. A quota block burns no tokens, so a ledger
    // that only logged successes would go silent exactly when something was
    // wrong — and silence reads as "nothing happening" rather than "blocked".
    await recordAiUsage({
      route: '/api/chat',
      model: CHAT_MODEL,
      usage: usageParts.length ? sumUsage(usageParts) : EMPTY_USAGE,
      contextChars: contextSize,
      generations,
      toolCalls: toolCallCount,
      latencyMs: Date.now() - startedAt,
      status: 'error',
      errorKind: kind,
      communityMemberId: memberIdForUsage,
    });

    const userMessage =
      kind === 'upstream_overloaded'
        ? "Our AI is experiencing high demand right now. This didn't count against your daily searches — please try again in a moment."
        : kind === 'upstream_quota'
        ? "Our AI has hit its usage cap for now — that's on us, not your account, and it didn't count against your daily searches. Please try again a little later."
        : kind === 'misconfigured'
        ? "The AI isn't configured correctly on this environment. This has been logged — it's not something you did."
        : 'Failed to process AI request.';

    return NextResponse.json(
      {
        error: userMessage,
        // A stable machine-readable code, safe to expose: it names the class of
        // failure without revealing anything about the internals.
        code: kind,
        // The raw message, on non-production deployments ONLY.
        //
        // This is what makes a preview or staging deployment diagnose itself
        // instead of requiring log access that, as it turns out, isn't reliably
        // available. It is gated on VERCEL_ENV so production never leaks an
        // upstream error string — those routinely carry internal endpoints,
        // project identifiers and occasionally partial keys.
        ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
          ? {
              detail: `${error?.name || 'Error'}${status ? ` [${status}]` : ''}: ${message}`.slice(0, 500),
              // Which variable this deployment read, and the last 4 characters
              // of the key it got. Never more than that.
              keySource: keyInfo.source,
              keyFingerprint: keyFingerprint(keyInfo.key),
            }
          : {}),
      },
      // A quota block upstream is our capacity problem, not a bug in the
      // request — 503 says "try later", which is both true and the correct
      // signal for anything watching status codes.
      { status: kind === 'upstream_overloaded' || kind === 'upstream_quota' ? 503 : 500 }
    );
  }
}
