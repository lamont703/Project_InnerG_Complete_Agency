"use server";

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchBarbershops(query: string, page: number = 1, filterTab: string = 'All') {
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

    // Apply intent mappings dynamically
    intentRules.forEach(rule => {
      if (cleanQuery.includes(rule.value.toLowerCase())) {
        if (rule.target === 'hiring') isHiring = true;
        if (rule.target === 'Booth Rent' || rule.target === 'Commission') rentTypeFilter = rule.target;
        cleanQuery = cleanQuery.replace(rule.value.toLowerCase(), '').trim();
      }
    });

    stopWordsList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanQuery = cleanQuery.replace(regex, '');
    });
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

    // 1. Internal Pages (Semantic Tool Ranker)
    let internalMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Tools') {
      if (cleanQuery.length >= 2) {
        const { data: toolRes, error: toolErr } = await supabase.rpc('search_platform_tools_ranked', {
          query_text: cleanQuery,
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
          limit_val: 3
        });
        
        if (!toolErr && toolRes) {
          internalMatches = toolRes.map((tool: any) => ({
            label: tool.name,
            href: tool.url,
            description: tool.description,
            image_url: tool.image_url,
            resultType: 'internal',
            match_score: tool.match_score
          }));
        }
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
        limit_val: 20,
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
            match_score: page.match_score
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
        limit_val: filterTab === 'All' ? 10 : 20
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
        limit_val: 10,
        offset_val: 0,
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
        limit_val: ITEMS_PER_PAGE,
        offset_val: fromIndex,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
      });
      if (!error && data) {
        shopMatches = data.map((s: any) => ({ ...s, resultType: 'shop', match_score: s.trust_score }));
        shopCount = (data.length > 0 && data[0].total_matched) ? Number(data[0].total_matched) : 0;
      }
    }

    // 4. Combine Results & Pagination
    let pageResults: any[] = [];
    let totalResults = 0;

    if (filterTab === 'All') {
      // Dynamic Unified Ranking
      // 1. Normalize scores so no category has an unfair baseline advantage
      const maxBarber = Math.max(...barberMatches.map(b => b.match_score || 0), 1);
      const maxShop = Math.max(...shopMatches.map(s => s.match_score || 0), 1);
      const maxWeb = Math.max(...webMatches.map(w => w.match_score || 0), 1);

      // 2. Determine Intent Bias from the original query
      let shopBonus = 0;
      let barberBonus = 0;
      let webBonus = 0;
      
      const q = query.toLowerCase();
      if (/\\b(how|why|what is|best way|guide|tutorial|tips)\\b/.test(q)) webBonus = 200;
      if (/\\b(barbers?|stylists?|braiders?|locticians?|people|someone)\\b/.test(q)) barberBonus = 200;
      if (/\\b(shops?|barbershops?|salons?|studios?|suites?|places?)\\b/.test(q)) {
        shopBonus = 200;
        if (q.includes('barbershop')) barberBonus = 0; // Prevent 'barber' regex from overriding
      }

      // 3. Combine with Normalization + Bias
      const others = [
        ...barberMatches.map(b => ({ ...b, sort_score: ((b.match_score / maxBarber) * 100) + barberBonus })),
        ...webMatches.map(w => ({ ...w, sort_score: ((w.match_score / maxWeb) * 100) + webBonus })),
        ...shopMatches.map(s => ({ ...s, sort_score: ((s.match_score / maxShop) * 100) + shopBonus }))
      ];
      
      others.sort((a, b) => (b.sort_score || 0) - (a.sort_score || 0));
      const unifiedMatches = [...internalMatches, ...others];
      
      totalResults = unifiedMatches.length;
      pageResults = unifiedMatches.slice(fromIndex, fromIndex + ITEMS_PER_PAGE);
    } else {
      // Tab-specific logic
      if (filterTab === 'Tools') {
         totalResults = internalMatches.length;
         pageResults = internalMatches.slice(fromIndex, fromIndex + ITEMS_PER_PAGE);
      } else if (filterTab === 'Barbers') {
         totalResults = barberMatches.length;
         pageResults = barberMatches.slice(fromIndex, fromIndex + ITEMS_PER_PAGE);
      } else if (filterTab === 'Articles' || filterTab === 'Videos') {
         totalResults = webMatches.length;
         pageResults = webMatches.slice(fromIndex, fromIndex + ITEMS_PER_PAGE);
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
