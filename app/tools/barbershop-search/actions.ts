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

    // 1. Internal Pages
    const internalPages = [
      { label: "Barber & Cosmetology Shop Day", href: "/barber-cosmetology-placement" },
      { label: "Barber & Cosmetology Placement", href: "/barber-beauty-network" },
      { label: "Texas Barber Exam Intelligence Prep", href: "/texas-barber-exam-intelligence-prep" },
      { label: "Accreditation Advisory Committee Toolkit", href: "/program-advisory-committee-kit" },
      { label: "Shop Day Map", href: "/shop-day-map" },
      { label: "Shop Day Matches", href: "/shop-day-matches" },
      { label: "Shop Day Requests", href: "/shop-day-requests" },
      { label: "Texas Barber Exam Intelligence Deck", href: "/tools/texas-barber-exam-practice-deck" },
      { label: "Texas Barber Instructor Intelligence Dashboard", href: "/tools/texas-barber-instructor-intelligence-dashboard" },
      { label: "Texas Barber School Benchmarking Intelligence", href: "/texas-school-benchmarking" },
      { label: "Texas Barber School Historical Performance Tracker", href: "/texas-barber-school-historical-performance" },
      { label: "Texas Barbershop Placement Matcher & Agent", href: "/texas-barbershop-placement-matcher" },
      { label: "Texas Barber & Cosmetology Continuing Education Portal", href: "/barber-cos-continuing-education" },
      { label: "Pixel Analytics", href: "/pixel-analytics" },
      { label: "Shop Day Connections", href: "/shop-day-connections" },
      { label: "AI Booth Station Tool", href: "/tools/ai-booth-station" },
      { label: "Foot Traffic Radar Tool", href: "/tools/foot-traffic-radar" },
      { label: "Barbershop Search Engine", href: "/tools/barbershop-search" },
      { label: "Web Crawler Domain Management", href: "/tools/domain-management" },
    ];
    
    let internalMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Tools') {
      internalMatches = cleanQuery.length >= 2 
        ? internalPages.filter(p => p.label.toLowerCase().includes(cleanQuery)).map(p => ({ ...p, resultType: 'internal' }))
        : [];
        
      // Apply AI-generated internal routing rules (Self-healing telemetry loop)
      internalRoutingRules.forEach(rule => {
        const ruleWords = rule.value.toLowerCase().split(/\s+/).filter((w: string) => w.length > 0);
        const queryText = query.toLowerCase();
        
        // Check if ALL words from the rule are present in the user's query
        const isMatch = ruleWords.every((word: string) => queryText.includes(word));
        
        if (isMatch) {
          const matchedTool = internalPages.find(p => p.href === rule.target);
          if (matchedTool && !internalMatches.find(m => m.href === matchedTool.href)) {
            internalMatches.push({ ...matchedTool, resultType: 'internal' });
          }
        }
      });
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
            resultType: 'web' 
          };
        });
      }
    }

    const topMatches = [...internalMatches, ...webMatches];
    const topCount = topMatches.length;

    // 3. Shop Results (Calculate Pagination Offsets)
    let shopLimit = 0;
    let shopOffset = 0;

    if (fromIndex < topCount) {
      const remainingForPage = ITEMS_PER_PAGE - (topCount - fromIndex);
      if (remainingForPage > 0) {
        shopLimit = remainingForPage;
        shopOffset = 0;
      }
    } else {
      shopLimit = ITEMS_PER_PAGE;
      shopOffset = fromIndex - topCount;
    }

    let shopData: any[] = [];
    let shopCount = 0;

    if (filterTab === 'All' || filterTab === 'Barbershops') {
      const rpcQuery = cleanQuery.length >= 2 ? cleanQuery : '';
      
      if (shopLimit > 0) {
        const { data, error } = await supabase.rpc('search_barbershops_ranked', {
          query_text: rpcQuery,
          is_hiring_filter: isHiring,
          rent_type_filter: rentTypeFilter || '',
          limit_val: shopLimit,
          offset_val: shopOffset,
          query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null
        });
        
        if (error) throw error;
        shopData = data || [];
        shopCount = (shopData.length > 0 && shopData[0].total_matched) ? Number(shopData[0].total_matched) : 0;
      }
    }

    const shopMatches = shopData.map(s => ({ ...s, resultType: 'shop' }));

    // 4. Combine Results
    const pageResults = [];
    if (fromIndex < topCount) {
      pageResults.push(...topMatches.slice(fromIndex, fromIndex + ITEMS_PER_PAGE));
    }
    pageResults.push(...shopMatches);

    const totalResults = topCount + shopCount;

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
