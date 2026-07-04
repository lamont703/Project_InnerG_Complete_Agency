"use server";

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cosmetologist profiles don't have a clean category column — the profession
// shows up in the scraped name ("Jane Doe Makeup Artist") and in the booksy
// service names, so category filters match against that combined text.
const COSMET_CATEGORY_PATTERNS: Record<string, RegExp> = {
  cosmet_hair: /\b(hair|stylist|cosmetologist)\b/i,
  cosmet_makeup: /\bmakeup\b/i,
  cosmet_nails: /\b(nail|manicure|pedicure)\b/i,
  cosmet_esthetician: /\b(esthetic|facial|skin)\b/i,
  cosmet_lashes: /\blash/i,
};

// When a facet filter (rating, pass rate, city, etc.) is active, results are
// filtered client-side after fetching from the RPC. Fetching a small,
// per-page batch and slicing by page offset BEFORE filtering doesn't work:
// consecutive pages fetch overlapping RPC windows, and the number of items
// surviving the filter varies per window, so pages end up with an
// inconsistent, sometimes-overlapping count of results instead of a clean
// 10. The fix is to fetch a large enough batch to cover the whole ranked
// candidate pool ONCE (from offset 0), filter it completely, and only then
// slice out the requested page's window — so pagination reflects the true
// filtered result set.
const FILTERED_FETCH_LIMIT = 500;

// search_engine_rules (stop words, intent mappings, routing rules) is admin
// config that barely ever changes, but was being re-fetched from the DB on
// every single search request. A short TTL cache avoids that round-trip for
// the common case without risking meaningfully stale rules.
const RULES_CACHE_TTL_MS = 60_000;
let rulesCache: { data: any[]; expiresAt: number } | null = null;

async function getSearchEngineRules(): Promise<any[]> {
  if (rulesCache && rulesCache.expiresAt > Date.now()) {
    return rulesCache.data;
  }
  const { data } = await supabase.from('search_engine_rules').select('*');
  const rows = data || [];
  rulesCache = { data: rows, expiresAt: Date.now() + RULES_CACHE_TTL_MS };
  return rows;
}

function paginateFiltered<T extends Record<string, any>>(filtered: T[], pageOffset: number, pageSize: number): T[] {
  const total = filtered.length;
  return filtered.slice(pageOffset, pageOffset + pageSize).map((item) => ({ ...item, total_matched: total }));
}

function cosmetMatchesCategory(c: any, activeFilters: string[]): boolean {
  const activeCategoryFilters = Object.keys(COSMET_CATEGORY_PATTERNS).filter((f) => activeFilters.includes(f));
  if (activeCategoryFilters.length === 0) return true;
  const serviceNames = Array.isArray(c.booksy_services) ? c.booksy_services.map((s: any) => s.name).join(' ') : '';
  const haystack = `${c.name || ''} ${serviceNames}`;
  return activeCategoryFilters.some((f) => COSMET_CATEGORY_PATTERNS[f].test(haystack));
}

export async function searchBarbershops(query: string, page: number = 1, filterTab: string = 'All', activeFilters: string[] = []) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: { results: [], total: 0 } };
    }

    const ITEMS_PER_PAGE = 10;
    const fromIndex = (page - 1) * ITEMS_PER_PAGE;

    let cleanQuery = query.toLowerCase().trim();
    let isHiring = false;
    let rentTypeFilter: string | null = null;

    // Explicit Filter Overrides from UI
    if (activeFilters.includes('hiring_now')) isHiring = true;
    if (activeFilters.includes('booth_rent')) rentTypeFilter = 'Booth Rent';
    if (activeFilters.includes('commission')) rentTypeFilter = 'Commission';

    // Embedding generation (Gemini round-trip) and rules lookup are
    // independent of each other's result — the embedding is computed from
    // the raw cleaned query, and rules only affect cleanQuery afterward.
    // Running them concurrently instead of one-after-another halves this
    // phase's latency down to whichever of the two is slower.
    const embeddingPromise: Promise<number[] | null> = (async () => {
      if (cleanQuery.length < 2) return null;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: cleanQuery,
          config: { outputDimensionality: 768 }
        });
        if (res.embeddings && res.embeddings[0].values) {
          return res.embeddings[0].values;
        }
      } catch (e) {
        console.error("Failed to generate query embedding (falling back to standard search):", e);
      }
      return null;
    })();

    const [queryEmbedding, rules] = await Promise.all([embeddingPromise, getSearchEngineRules()]);

    const stopWordsList = rules?.filter(r => r.rule_type === 'stop_word').map(r => r.value) || [];
    const intentRules = rules?.filter(r => r.rule_type === 'intent_mapping') || [];
    const internalRoutingRules = rules?.filter(r => r.rule_type === 'internal_routing') || [];

    // Apply intent mappings dynamically (only if not explicitly set by UI toggles)
    intentRules.forEach(rule => {
      if (cleanQuery.includes(rule.value.toLowerCase())) {
        if (rule.target === 'hiring' && !activeFilters.includes('hiring_now')) isHiring = true;
        if ((rule.target === 'Booth Rent' || rule.target === 'Commission') && !activeFilters.includes('booth_rent') && !activeFilters.includes('commission')) {
          rentTypeFilter = rule.target;
        }
        cleanQuery = cleanQuery.replace(rule.value.toLowerCase(), '').trim();
      }
    });

    stopWordsList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanQuery = cleanQuery.replace(regex, '');
    });
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

    // --- Dynamic Bento Box Ratios ---
    let shopLim = 3, barberLim = 3, webLim = 2, toolLim = 2, schoolLim = 2, storeLim = 2, salonLim = 2, cosmetologistLim = 2; // Default (Unbiased)
    let intentType = 'default';
    const qRaw = query.toLowerCase();

    if (/\b(cosmetologist|makeup artist|nail tech|nail technician|esthetician|eyelash|lash artist|lash tech|manicure|pedicure|facial)\b/.test(qRaw)) {
      // Cosmetologist / Beauty Professional Intent
      intentType = 'cosmetologists';
      cosmetologistLim = 5; shopLim = 1; barberLim = 1; webLim = 1; toolLim = 1; schoolLim = 1; storeLim = 1; salonLim = 1;
    } else if (/\b(salons?|hair salon|beauty salon|hairstylist|blowout|updo|balayage)\b/.test(qRaw)) {
      // Salon Intent
      intentType = 'salons';
      salonLim = 5; shopLim = 1; barberLim = 1; webLim = 1; toolLim = 1; schoolLim = 1; storeLim = 1; cosmetologistLim = 1;
    } else if (/\b(schools?|academy|academies|college|colleges|enroll|tuition|accredited|financial aid|barber program|cosmetology)\b/.test(qRaw)) {
      // School / Enrollment Intent
      intentType = 'schools';
      schoolLim = 5; webLim = 2; barberLim = 1; shopLim = 1; toolLim = 1; storeLim = 1; salonLim = 1; cosmetologistLim = 1;
    } else if (/\b(supply|supplies|clippers?|shears?|wholesale|products?|equipment)\b/.test(qRaw)) {
      // Supply Store Intent
      intentType = 'supplies';
      storeLim = 5; webLim = 1; barberLim = 1; shopLim = 1; toolLim = 1; schoolLim = 1; salonLim = 1; cosmetologistLim = 1;
    } else if (/\b(how|why|what is|best way|guide|tutorial|tips|learn)\b/.test(qRaw)) {
      // Educational Intent
      intentType = 'educational';
      webLim = 5; toolLim = 2; barberLim = 2; shopLim = 1; schoolLim = 1; storeLim = 1; salonLim = 1; cosmetologistLim = 1;
    } else if (/\b(shops?|barbershops?|studios?|suites?|places?|hiring|near me|booth|commission)\b/.test(qRaw)) {
      // Employment / Location Intent
      intentType = 'location';
      shopLim = 5; barberLim = 3; webLim = 1; toolLim = 1; schoolLim = 1; storeLim = 1; salonLim = 1; cosmetologistLim = 1;
    } else if (/\b(barbers?|stylists?|braiders?|locticians?|people|someone)\b/.test(qRaw)) {
      // Networking / People Intent
      intentType = 'networking';
      barberLim = 5; shopLim = 3; webLim = 1; toolLim = 1; schoolLim = 1; storeLim = 1; salonLim = 1; cosmetologistLim = 1;
    }
    // --------------------------------

    // Every category below is an independent lookup against the same
    // cleanQuery/queryEmbedding/filters — none of them read another
    // category's result. They used to run as sequential awaits (tools, then
    // web, then barbers, then schools, then stores, then salons, then
    // cosmetologists, then shops), which made total latency the SUM of all
    // 8 round-trips. Wrapping each in its own async function and firing them
    // via Promise.all makes it the MAX of the 8 instead.

    // 1. Internal Tools (Platform Tools)
    async function fetchInternalMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Tools')) return [];
      const { data: toolRes, error: toolErr } = await supabase.rpc('search_platform_tools_ranked', {
        query_text: cleanQuery,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: filterTab === 'All' ? toolLim : ITEMS_PER_PAGE,
        offset_val: filterTab === 'All' ? (page - 1) * toolLim : fromIndex
      });

      if (!toolErr && toolRes) {
        return toolRes.map((tool: any) => ({
          label: tool.name,
          href: tool.url,
          description: tool.description,
          image_url: tool.image_url,
          resultType: 'internal',
          match_score: tool.match_score,
          total_matched: tool.total_matched
        }));
      }
      return [];
    }

    // 2. Web Results (Postgres Full-Text + Semantic Hybrid Search)
    async function fetchWebMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Articles' || filterTab === 'Videos' || filterTab === 'Images')) return [];

      let isVideoFilter: boolean | null = null;
      let isImageFilter: boolean | null = null;
      // 'All' and 'Articles' both exclude raw image links (is_image_filter:
      // false) — a direct link to an image file has no article content or
      // reliable og_image, so it rendered as a broken-looking card. Those
      // links now only ever surface in the dedicated Images tab.
      if (filterTab === 'Articles') { isVideoFilter = false; isImageFilter = false; }
      if (filterTab === 'All') { isImageFilter = false; }
      if (filterTab === 'Videos') isVideoFilter = true;
      if (filterTab === 'Images') isImageFilter = true;

      const { data: webRes, error: webErr } = await supabase.rpc('search_web_pages_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: filterTab === 'All' ? webLim : ITEMS_PER_PAGE,
        offset_val: filterTab === 'All' ? (page - 1) * webLim : fromIndex,
        is_video_filter: isVideoFilter,
        is_image_filter: isImageFilter
      });

      if (!webErr && webRes) {
        return webRes.map((page: any) => {
          const matchIndex = page.raw_text ? page.raw_text.toLowerCase().indexOf(cleanQuery) : -1;
          let snippet = page.raw_text || '';

          if (matchIndex !== -1 && cleanQuery.length >= 2) {
            const start = Math.max(0, matchIndex - 60);
            const end = Math.min(snippet.length, matchIndex + cleanQuery.length + 60);
            snippet = (start > 0 ? '...' : '') + snippet.substring(start, end) + (end < snippet.length ? '...' : '');
          } else {
            snippet = snippet.substring(0, 150) + '...';
          }

          return {
            id: page.id,
            url: page.url,
            domain_url: page.domain_url,
            snippet,
            og_image_url: page.og_image_url,
            is_video: page.is_video,
            resultType: page.is_image ? 'image' : 'web',
            match_score: page.match_score,
            total_matched: page.total_matched
          };
        });
      }
      return [];
    }

    // 2.5 Barber Results
    async function fetchBarberMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Barbers')) return [];

      const barberLimBase = filterTab === 'All' ? barberLim : ITEMS_PER_PAGE;
      const barberFilterActive = ['barber_actively_looking', 'barber_wants_booth', 'barber_wants_commission', 'rating_4.5'].some((f) => activeFilters.includes(f));
      const { data: barberRes, error: barberErr } = await supabase.rpc('search_barbers_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: barberFilterActive ? FILTERED_FETCH_LIMIT : barberLimBase,
        offset_val: barberFilterActive ? 0 : (filterTab === 'All' ? (page - 1) * barberLim : fromIndex)
      });

      let matches: any[] = [];
      if (!barberErr && barberRes) {
        matches = barberRes.map((b: any) => ({
          ...b,
          resultType: 'barber'
        }));
      }
      if (activeFilters.includes('barber_actively_looking')) {
        matches = matches.filter((b) => b.is_actively_looking === true);
      }
      if (activeFilters.includes('barber_wants_booth')) {
        matches = matches.filter((b) => /booth/i.test(b.desired_pay_structure || ''));
      }
      if (activeFilters.includes('barber_wants_commission')) {
        matches = matches.filter((b) => /commission/i.test(b.desired_pay_structure || ''));
      }
      if (activeFilters.includes('rating_4.5')) {
        matches = matches.filter((b) => b.booksy_rating && b.booksy_rating >= 4.5);
      }
      if (barberFilterActive) {
        const pageOffset = filterTab === 'All' ? (page - 1) * barberLim : fromIndex;
        matches = paginateFiltered(matches, pageOffset, barberLimBase);
      }
      return matches;
    }

    // 2.7 School Results
    async function fetchSchoolMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Schools')) return [];

      const schoolLimBase = filterTab === 'All' ? schoolLim : ITEMS_PER_PAGE;
      const schoolFilterActive = ['school_accredited', 'school_high_pass_rate', 'school_affordable', 'rating_4.5', 'school_city_houston'].some((f) => activeFilters.includes(f));
      const { data: schoolRes, error: schoolErr } = await supabase.rpc('search_schools_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: schoolFilterActive ? FILTERED_FETCH_LIMIT : schoolLimBase,
        offset_val: schoolFilterActive ? 0 : (filterTab === 'All' ? (page - 1) * schoolLim : fromIndex)
      });

      let matches: any[] = [];
      if (!schoolErr && schoolRes) {
        matches = schoolRes.map((s: any) => ({
          ...s,
          resultType: 'school'
        }));
      }
      if (activeFilters.includes('school_accredited')) {
        matches = matches.filter((s) => s.accreditation_status === 'Accredited');
      }
      if (activeFilters.includes('school_high_pass_rate')) {
        // Written is the harder exam (statewide ~46% pass vs ~84% for
        // practical), so it's the more meaningful signal of how well a
        // school prepares students. Practical is only used as a fallback
        // for schools that don't have written data reported.
        matches = matches.filter((s) =>
          s.written_pass_rate_2026 != null
            ? s.written_pass_rate_2026 >= 0.8
            : (s.practical_pass_rate_2026 != null && s.practical_pass_rate_2026 >= 0.8)
        );
        // Don't re-sort by raw pass rate here — that would bury Houston
        // results under any 100%-pass-rate school statewide. match_score
        // (from search_schools_ranked) already blends location/keyword
        // relevance with a pass-rate bonus, which keeps geography relevant.
      }
      if (activeFilters.includes('school_affordable')) {
        matches = matches.filter((s) => s.annual_tuition != null && Number(s.annual_tuition) <= 10000);
      }
      if (activeFilters.includes('school_city_houston')) {
        // Keyword relevance alone doesn't reliably keep Houston schools
        // above equally-high-pass-rate schools in other cities, so this is
        // a hard filter rather than relying on match_score weighting.
        matches = matches.filter((s) => s.city && /houston/i.test(s.city));
      }
      if (activeFilters.includes('rating_4.5')) {
        matches = matches.filter((s) => s.rating && parseFloat(s.rating) >= 4.5);
      }
      if (schoolFilterActive) {
        const pageOffset = filterTab === 'All' ? (page - 1) * schoolLim : fromIndex;
        matches = paginateFiltered(matches, pageOffset, schoolLimBase);
      }
      return matches;
    }

    // 2.9 Supply Store Results (barber supply stores + beauty supply stores,
    // merged under one "Stores" bucket since they share the same card/profile shape)
    async function fetchStoreMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Stores')) return [];

      const storeLimitVal = filterTab === 'All' ? storeLim : ITEMS_PER_PAGE;
      const storeOffsetVal = filterTab === 'All' ? (page - 1) * storeLim : fromIndex;
      const storeFilterActive = ['rating_4.5', 'store_budget', 'store_moderate'].some((f) => activeFilters.includes(f));

      const [
        { data: barberStoreRes, error: barberStoreErr },
        { data: beautyStoreRes, error: beautyStoreErr }
      ] = await Promise.all([
        supabase.rpc('search_supply_stores_ranked', {
          query_text: cleanQuery.length >= 2 ? cleanQuery : '',
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
          limit_val: storeFilterActive ? FILTERED_FETCH_LIMIT : storeLimitVal,
          offset_val: storeFilterActive ? 0 : storeOffsetVal
        }),
        supabase.rpc('search_beauty_supply_stores_ranked', {
          query_text: cleanQuery.length >= 2 ? cleanQuery : '',
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
          limit_val: storeFilterActive ? FILTERED_FETCH_LIMIT : storeLimitVal,
          offset_val: storeFilterActive ? 0 : storeOffsetVal
        })
      ]);

      const barberStoreMatches = (!barberStoreErr && barberStoreRes)
        ? barberStoreRes.map((s: any) => ({ ...s, resultType: 'store', store_type: 'barber_supply' }))
        : [];
      const beautyStoreMatches = (!beautyStoreErr && beautyStoreRes)
        ? beautyStoreRes.map((s: any) => ({ ...s, resultType: 'store', store_type: 'beauty_supply' }))
        : [];

      const barberStoreTotal = barberStoreMatches.length > 0 && barberStoreMatches[0].total_matched ? Number(barberStoreMatches[0].total_matched) : 0;
      const beautyStoreTotal = beautyStoreMatches.length > 0 && beautyStoreMatches[0].total_matched ? Number(beautyStoreMatches[0].total_matched) : 0;
      const combinedStoreTotal = barberStoreTotal + beautyStoreTotal;

      let matches = [...barberStoreMatches, ...beautyStoreMatches]
        .sort((a, b) => Number(b.match_score) - Number(a.match_score))
        // Stamp the combined total onto every item so downstream logic that
        // reads `storeMatches[0].total_matched` keeps working unchanged.
        .map((s) => ({ ...s, total_matched: combinedStoreTotal }));

      if (activeFilters.includes('rating_4.5')) {
        matches = matches.filter((s) => s.rating && Number(s.rating) >= 4.5);
      }
      if (activeFilters.includes('store_budget')) {
        matches = matches.filter((s) => s.price_level === 'PRICE_LEVEL_INEXPENSIVE');
      }
      if (activeFilters.includes('store_moderate')) {
        matches = matches.filter((s) => s.price_level === 'PRICE_LEVEL_MODERATE');
      }
      matches = storeFilterActive
        ? paginateFiltered(matches, storeOffsetVal, storeLimitVal)
        : matches.slice(0, storeLimitVal);
      return matches;
    }

    // 2.95 Salon Results
    async function fetchSalonMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Salons')) return [];

      const salonLimBase = filterTab === 'All' ? salonLim : ITEMS_PER_PAGE;
      const salonFilterActive = ['rating_4.5', 'salon_100_reviews'].some((f) => activeFilters.includes(f));
      const { data: salonRes, error: salonErr } = await supabase.rpc('search_salons_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: salonFilterActive ? FILTERED_FETCH_LIMIT : salonLimBase,
        offset_val: salonFilterActive ? 0 : (filterTab === 'All' ? (page - 1) * salonLim : fromIndex)
      });

      let matches: any[] = [];
      if (!salonErr && salonRes) {
        matches = salonRes.map((s: any) => ({
          ...s,
          resultType: 'salon'
        }));
      }
      if (activeFilters.includes('rating_4.5')) {
        matches = matches.filter((s) => s.rating && Number(s.rating) >= 4.5);
      }
      if (activeFilters.includes('salon_100_reviews')) {
        matches = matches.filter((s) => s.total_reviews && Number(s.total_reviews) >= 100);
      }
      if (salonFilterActive) {
        const pageOffset = filterTab === 'All' ? (page - 1) * salonLim : fromIndex;
        matches = paginateFiltered(matches, pageOffset, salonLimBase);
      }
      return matches;
    }

    // 2.97 Cosmetologist Results
    async function fetchCosmetologistMatches(): Promise<any[]> {
      if (!(filterTab === 'All' || filterTab === 'Cosmetologist')) return [];

      const cosmetologistLimBase = filterTab === 'All' ? cosmetologistLim : ITEMS_PER_PAGE;
      const cosmetFilterActive = ['rating_4.5', ...Object.keys(COSMET_CATEGORY_PATTERNS)].some((f) => activeFilters.includes(f));
      const { data: cosmetologistRes, error: cosmetologistErr } = await supabase.rpc('search_cosmetologists_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: cosmetFilterActive ? FILTERED_FETCH_LIMIT : cosmetologistLimBase,
        offset_val: cosmetFilterActive ? 0 : (filterTab === 'All' ? (page - 1) * cosmetologistLim : fromIndex)
      });

      let matches: any[] = [];
      if (!cosmetologistErr && cosmetologistRes) {
        matches = cosmetologistRes.map((c: any) => ({
          ...c,
          resultType: 'cosmetologist'
        }));
      }
      if (activeFilters.includes('rating_4.5')) {
        matches = matches.filter((c) => c.booksy_rating && c.booksy_rating >= 4.5);
      }
      matches = matches.filter((c) => cosmetMatchesCategory(c, activeFilters));
      if (cosmetFilterActive) {
        const pageOffset = filterTab === 'All' ? (page - 1) * cosmetologistLim : fromIndex;
        matches = paginateFiltered(matches, pageOffset, cosmetologistLimBase);
      }
      return matches;
    }

    // 3. Shop Results
    const shopFilterActive = activeFilters.includes('rating_4.5');

    async function fetchShopResults(): Promise<{ matches: any[]; count: number }> {
      let matches: any[] = [];
      let count = 0;

      if (filterTab === 'All') {
        const { data, error } = await supabase.rpc('search_barbershops_ranked', {
          query_text: cleanQuery.length >= 2 ? cleanQuery : '',
          is_hiring_filter: isHiring,
          rent_type_filter: rentTypeFilter || '',
          limit_val: shopFilterActive ? FILTERED_FETCH_LIMIT : shopLim,
          offset_val: shopFilterActive ? 0 : (page - 1) * shopLim,
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
        });
        if (!error && data) {
          matches = data.map((s: any) => ({ ...s, resultType: 'shop', match_score: s.trust_score }));
        }
      } else if (filterTab === 'Barbershops') {
        const { data, error } = await supabase.rpc('search_barbershops_ranked', {
          query_text: cleanQuery.length >= 2 ? cleanQuery : '',
          is_hiring_filter: isHiring,
          rent_type_filter: rentTypeFilter || '',
          limit_val: shopFilterActive ? FILTERED_FETCH_LIMIT : ITEMS_PER_PAGE,
          offset_val: shopFilterActive ? 0 : fromIndex,
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
        });
        if (!error && data) {
          matches = data.map((s: any) => ({ ...s, resultType: 'shop', match_score: s.trust_score }));
          if (!shopFilterActive) count = (data.length > 0 && data[0].total_matched) ? Number(data[0].total_matched) : 0;
        }
      }

      if (shopFilterActive) {
        matches = matches.filter(s => s.rating && s.rating >= 4.5);
        const pageOffset = filterTab === 'All' ? (page - 1) * shopLim : fromIndex;
        const pageSize = filterTab === 'All' ? shopLim : ITEMS_PER_PAGE;
        const filteredTotal = matches.length;
        matches = matches.slice(pageOffset, pageOffset + pageSize);
        if (filterTab === 'Barbershops') count = filteredTotal;
      }

      return { matches, count };
    }

    const [
      internalMatches,
      webMatches,
      barberMatches,
      schoolMatches,
      storeMatches,
      salonMatches,
      cosmetologistMatches,
      shopResults,
    ] = await Promise.all([
      fetchInternalMatches(),
      fetchWebMatches(),
      fetchBarberMatches(),
      fetchSchoolMatches(),
      fetchStoreMatches(),
      fetchSalonMatches(),
      fetchCosmetologistMatches(),
      fetchShopResults(),
    ]);

    const shopMatches = shopResults.matches;
    const shopCount = shopResults.count;

    // 4. Combine Results & Pagination
    let pageResults: any[] = [];
    let totalResults = 0;

    if (filterTab === 'All') {
      // Grouped Bento Box (Prioritized Concatenation)
      let interleaved: any[] = [];

      if (intentType === 'cosmetologists') {
        // Cosmetologist Anchor: All Cosmetologists -> All Salons -> All Shops -> All Barbers -> All Articles -> All Stores -> All Schools -> All Tools
        interleaved = [...cosmetologistMatches, ...salonMatches, ...shopMatches, ...barberMatches, ...webMatches, ...storeMatches, ...schoolMatches, ...internalMatches];
      } else if (intentType === 'salons') {
        // Salon Anchor: All Salons -> All Shops -> All Barbers -> All Articles -> All Stores -> All Schools -> All Cosmetologists -> All Tools
        interleaved = [...salonMatches, ...shopMatches, ...barberMatches, ...webMatches, ...storeMatches, ...schoolMatches, ...cosmetologistMatches, ...internalMatches];
      } else if (intentType === 'schools') {
        // School Anchor: All Schools -> All Articles -> All Barbers -> All Shops -> All Stores -> All Salons -> All Cosmetologists -> All Tools
        interleaved = [...schoolMatches, ...webMatches, ...barberMatches, ...shopMatches, ...storeMatches, ...salonMatches, ...cosmetologistMatches, ...internalMatches];
      } else if (intentType === 'supplies') {
        // Supply Store Anchor: All Stores -> All Shops -> All Barbers -> All Articles -> All Salons -> All Cosmetologists -> All Tools
        interleaved = [...storeMatches, ...shopMatches, ...barberMatches, ...webMatches, ...schoolMatches, ...salonMatches, ...cosmetologistMatches, ...internalMatches];
      } else if (intentType === 'educational') {
        // Educational Anchor: All Articles -> All Tools -> All Barbers -> All Shops -> All Schools -> All Stores -> All Salons -> All Cosmetologists
        interleaved = [...webMatches, ...internalMatches, ...barberMatches, ...shopMatches, ...schoolMatches, ...storeMatches, ...salonMatches, ...cosmetologistMatches];
      } else if (intentType === 'networking') {
        // Networking Anchor: All Barbers -> All Cosmetologists -> All Shops -> All Tools -> All Articles -> All Schools -> All Stores -> All Salons
        interleaved = [...barberMatches, ...cosmetologistMatches, ...shopMatches, ...internalMatches, ...webMatches, ...schoolMatches, ...storeMatches, ...salonMatches];
      } else {
        // Default / Location Anchor: All Shops -> All Barbers -> All Salons -> All Cosmetologists -> All Articles -> All Schools -> All Stores -> All Tools
        interleaved = [...shopMatches, ...barberMatches, ...salonMatches, ...cosmetologistMatches, ...webMatches, ...schoolMatches, ...storeMatches, ...internalMatches];
      }

      // Calculate the total number of pages needed for each category based on its consumption rate
      const shopPages = Math.ceil((shopCount || 0) / shopLim);
      const barberTotal = barberMatches.length > 0 && barberMatches[0].total_matched ? Number(barberMatches[0].total_matched) : 0;
      const barberPages = Math.ceil(barberTotal / barberLim);
      const webTotal = webMatches.length > 0 && webMatches[0].total_matched ? Number(webMatches[0].total_matched) : 0;
      const webPages = Math.ceil(webTotal / webLim);
      const toolTotal = internalMatches.length > 0 && internalMatches[0].total_matched ? Number(internalMatches[0].total_matched) : 0;
      const toolPages = Math.ceil(toolTotal / toolLim);
      const schoolTotal = schoolMatches.length > 0 && schoolMatches[0].total_matched ? Number(schoolMatches[0].total_matched) : 0;
      const schoolPages = Math.ceil(schoolTotal / schoolLim);
      const storeTotal = storeMatches.length > 0 && storeMatches[0].total_matched ? Number(storeMatches[0].total_matched) : 0;
      const storePages = Math.ceil(storeTotal / storeLim);
      const salonTotal = salonMatches.length > 0 && salonMatches[0].total_matched ? Number(salonMatches[0].total_matched) : 0;
      const salonPages = Math.ceil(salonTotal / salonLim);
      const cosmetologistTotal = cosmetologistMatches.length > 0 && cosmetologistMatches[0].total_matched ? Number(cosmetologistMatches[0].total_matched) : 0;
      const cosmetologistPages = Math.ceil(cosmetologistTotal / cosmetologistLim);

      // Find the deepest category in terms of total pages required
      const maxPagesRequired = Math.max(shopPages, barberPages, webPages, toolPages, schoolPages, storePages, salonPages, cosmetologistPages);

      // Trick the frontend into generating exactly maxPagesRequired by providing a total that divides by ITEMS_PER_PAGE (10)
      totalResults = maxPagesRequired * ITEMS_PER_PAGE;
      pageResults = interleaved; // Return all combined items to preserve depth
    } else {
      // Tab-specific logic
      if (filterTab === 'Tools') {
         totalResults = (internalMatches.length > 0 && internalMatches[0].total_matched) ? Number(internalMatches[0].total_matched) : internalMatches.length;
         pageResults = internalMatches;
      } else if (filterTab === 'Barbers') {
         totalResults = (barberMatches.length > 0 && barberMatches[0].total_matched) ? Number(barberMatches[0].total_matched) : barberMatches.length;
         pageResults = barberMatches;
      } else if (filterTab === 'Articles' || filterTab === 'Videos' || filterTab === 'Images') {
         totalResults = (webMatches.length > 0 && webMatches[0].total_matched) ? Number(webMatches[0].total_matched) : webMatches.length;
         pageResults = webMatches;
      } else if (filterTab === 'Barbershops') {
         totalResults = shopCount;
         pageResults = shopMatches;
      } else if (filterTab === 'Schools') {
         totalResults = (schoolMatches.length > 0 && schoolMatches[0].total_matched) ? Number(schoolMatches[0].total_matched) : schoolMatches.length;
         pageResults = schoolMatches;
      } else if (filterTab === 'Stores') {
         totalResults = (storeMatches.length > 0 && storeMatches[0].total_matched) ? Number(storeMatches[0].total_matched) : storeMatches.length;
         pageResults = storeMatches;
      } else if (filterTab === 'Salons') {
         totalResults = (salonMatches.length > 0 && salonMatches[0].total_matched) ? Number(salonMatches[0].total_matched) : salonMatches.length;
         pageResults = salonMatches;
      } else if (filterTab === 'Cosmetologist') {
         totalResults = (cosmetologistMatches.length > 0 && cosmetologistMatches[0].total_matched) ? Number(cosmetologistMatches[0].total_matched) : cosmetologistMatches.length;
         pageResults = cosmetologistMatches;
      }
    }

    // 5. Log Telemetry (Fire & Forget)
    if (page === 1 && query.trim().length >= 2) {
      supabase.from('search_engine_queries').insert({
        raw_query: query.trim(),
        clean_query: cleanQuery,
        total_results: totalResults
      }).then(({ error }) => {
        if (error) console.error("Search Telemetry Error:", error);
      });
    }

    return {
      success: true,
      data: {
        results: pageResults,
        total: totalResults
      }
    };
  } catch (err: any) {
    console.error("Error in searchBarbershops:", err);
    return { success: false, error: err.message };
  }
}
