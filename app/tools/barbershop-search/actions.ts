"use server";

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    let queryEmbedding: number[] | null = null;

    // Explicit Filter Overrides from UI
    if (activeFilters.includes('hiring_now')) isHiring = true;
    if (activeFilters.includes('booth_rent')) rentTypeFilter = 'Booth Rent';
    if (activeFilters.includes('commission')) rentTypeFilter = 'Commission';

    // Ping Gemini to get semantic vector
    if (cleanQuery.length >= 2) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: cleanQuery,
          config: { outputDimensionality: 768 }
        });
        if (res.embeddings && res.embeddings[0].values) {
          queryEmbedding = res.embeddings[0].values;
        }
      } catch (e) {
        console.error("Failed to generate query embedding (falling back to standard search):", e);
      }
    }

    // Fetch dynamic rules from DB
    const { data: rules } = await supabase.from('search_engine_rules').select('*');
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
    let shopLim = 3, barberLim = 3, webLim = 2, toolLim = 2; // Default (Unbiased)
    let intentType = 'default';
    const qRaw = query.toLowerCase();
    
    if (/\b(how|why|what is|best way|guide|tutorial|tips|learn)\b/.test(qRaw)) {
      // Educational Intent
      intentType = 'educational';
      webLim = 5; toolLim = 2; barberLim = 2; shopLim = 1;
    } else if (/\b(shops?|barbershops?|salons?|studios?|suites?|places?|hiring|near me|booth|commission)\b/.test(qRaw)) {
      // Employment / Location Intent
      intentType = 'location';
      shopLim = 5; barberLim = 3; webLim = 1; toolLim = 1;
    } else if (/\b(barbers?|stylists?|braiders?|locticians?|people|someone)\b/.test(qRaw)) {
      // Networking / People Intent
      intentType = 'networking';
      barberLim = 5; shopLim = 3; webLim = 1; toolLim = 1;
    }
    // --------------------------------

    // 1. Internal Tools (Platform Tools)
    let internalMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Tools') {
      const { data: toolRes, error: toolErr } = await supabase.rpc('search_platform_tools_ranked', {
        query_text: cleanQuery,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: filterTab === 'All' ? toolLim : ITEMS_PER_PAGE,
        offset_val: filterTab === 'All' ? (page - 1) * toolLim : fromIndex
      });
      
      if (!toolErr && toolRes) {
        internalMatches = toolRes.map((tool: any) => ({
          label: tool.name,
          href: tool.url,
          description: tool.description,
          image_url: tool.image_url,
          resultType: 'internal',
          match_score: tool.match_score,
          total_matched: tool.total_matched
        }));
      }
    }

    // 2. Web Results (Postgres Full-Text + Semantic Hybrid Search)
    let webMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Articles' || filterTab === 'Videos') {
      let isVideoFilter: boolean | null = null;
      if (filterTab === 'Articles') isVideoFilter = false;
      if (filterTab === 'Videos') isVideoFilter = true;

      const { data: webRes, error: webErr } = await supabase.rpc('search_web_pages_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: filterTab === 'All' ? webLim : ITEMS_PER_PAGE,
        offset_val: filterTab === 'All' ? (page - 1) * webLim : fromIndex,
        is_video_filter: isVideoFilter
      });

      if (!webErr && webRes) {
        webMatches = webRes.map((page: any) => {
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
            resultType: 'web',
            match_score: page.match_score,
            total_matched: page.total_matched
          };
        });
      }
    }

    // 2.5 Barber Results
    let barberMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Barbers') {
      const { data: barberRes, error: barberErr } = await supabase.rpc('search_barbers_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        limit_val: filterTab === 'All' ? barberLim : ITEMS_PER_PAGE,
        offset_val: filterTab === 'All' ? (page - 1) * barberLim : fromIndex
      });
      if (!barberErr && barberRes) {
        barberMatches = barberRes.map((b: any) => ({
          ...b,
          resultType: 'barber'
        }));
      }
    }

    // 3. Shop Results
    let shopMatches: any[] = [];
    let shopCount = 0;

    if (filterTab === 'All') {
      const { data, error } = await supabase.rpc('search_barbershops_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        is_hiring_filter: isHiring,
        rent_type_filter: rentTypeFilter || '',
        limit_val: shopLim * (activeFilters.includes('rating_4.5') ? 3 : 1), // Fetch more if filtering locally
        offset_val: (page - 1) * shopLim,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
      });
      if (!error && data) {
        shopMatches = data.map((s: any) => ({ ...s, resultType: 'shop', match_score: s.trust_score }));
      }
    } else if (filterTab === 'Barbershops') {
      const { data, error } = await supabase.rpc('search_barbershops_ranked', {
        query_text: cleanQuery.length >= 2 ? cleanQuery : '',
        is_hiring_filter: isHiring,
        rent_type_filter: rentTypeFilter || '',
        limit_val: ITEMS_PER_PAGE * (activeFilters.includes('rating_4.5') ? 3 : 1),
        offset_val: fromIndex,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
      });
      if (!error && data) {
        shopMatches = data.map((s: any) => ({ ...s, resultType: 'shop', match_score: s.trust_score }));
        shopCount = (data.length > 0 && data[0].total_matched) ? Number(data[0].total_matched) : 0;
      }
    }

    if (activeFilters.includes('rating_4.5')) {
      shopMatches = shopMatches.filter(s => s.rating && s.rating >= 4.5);
      if (filterTab === 'All') shopMatches = shopMatches.slice(0, shopLim);
      else shopMatches = shopMatches.slice(0, ITEMS_PER_PAGE);
    }

    // 4. Combine Results & Pagination
    let pageResults: any[] = [];
    let totalResults = 0;

    if (filterTab === 'All') {
      // Grouped Bento Box (Prioritized Concatenation)
      let interleaved: any[] = [];
      
      if (intentType === 'educational') {
        // Educational Anchor: All Articles -> All Tools -> All Barbers -> All Shops
        interleaved = [...webMatches, ...internalMatches, ...barberMatches, ...shopMatches];
      } else if (intentType === 'networking') {
        // Networking Anchor: All Barbers -> All Shops -> All Tools -> All Articles
        interleaved = [...barberMatches, ...shopMatches, ...internalMatches, ...webMatches];
      } else {
        // Default / Location Anchor: All Shops -> All Barbers -> All Articles -> All Tools
        interleaved = [...shopMatches, ...barberMatches, ...webMatches, ...internalMatches];
      }
      
      // Calculate the total number of pages needed for each category based on its consumption rate
      const shopPages = Math.ceil((shopCount || 0) / shopLim);
      const barberTotal = barberMatches.length > 0 && barberMatches[0].total_matched ? Number(barberMatches[0].total_matched) : 0;
      const barberPages = Math.ceil(barberTotal / barberLim);
      const webTotal = webMatches.length > 0 && webMatches[0].total_matched ? Number(webMatches[0].total_matched) : 0;
      const webPages = Math.ceil(webTotal / webLim);
      const toolTotal = internalMatches.length > 0 && internalMatches[0].total_matched ? Number(internalMatches[0].total_matched) : 0;
      const toolPages = Math.ceil(toolTotal / toolLim);

      // Find the deepest category in terms of total pages required
      const maxPagesRequired = Math.max(shopPages, barberPages, webPages, toolPages);

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
      } else if (filterTab === 'Articles' || filterTab === 'Videos') {
         totalResults = (webMatches.length > 0 && webMatches[0].total_matched) ? Number(webMatches[0].total_matched) : webMatches.length;
         pageResults = webMatches;
      } else if (filterTab === 'Barbershops') {
         totalResults = shopCount;
         pageResults = shopMatches;
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
