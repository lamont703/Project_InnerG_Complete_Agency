"use server";

import { createClient } from "@supabase/supabase-js";

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

    // Fetch dynamic rules from DB
    const { data: rules } = await supabase.from('search_engine_rules').select('*');
    const stopWordsList = rules?.filter(r => r.rule_type === 'stop_word').map(r => r.value) || [];
    const intentRules = rules?.filter(r => r.rule_type === 'intent_mapping') || [];

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
    }

    // 2. Web Results (Postgres Full-Text Search)
    let webMatches: any[] = [];
    if (filterTab === 'All' || filterTab === 'Articles' || filterTab === 'Videos') {
      let webQuery = supabase.from('scraped_web_pages').select('id, url, raw_text, domain_id, og_image_url, is_video, crawler_seed_domains(domain_url)').limit(20);
      
      if (filterTab === 'Articles') {
        webQuery = webQuery.eq('is_video', false);
      } else if (filterTab === 'Videos') {
        webQuery = webQuery.eq('is_video', true);
      }

      if (cleanQuery.length >= 2) {
        // websearch type handles quotes, hyphens, and multi-word gracefully
        webQuery = webQuery.textSearch('raw_text', `'${cleanQuery}'`, { type: 'websearch', config: 'english' });
      }
      const webRes = await webQuery;
      webMatches = (webRes.data || []).map(page => {
        const matchIndex = page.raw_text.toLowerCase().indexOf(cleanQuery);
        let snippet = page.raw_text;
        if (matchIndex !== -1 && cleanQuery.length >= 2) {
          const start = Math.max(0, matchIndex - 60);
          const end = Math.min(page.raw_text.length, matchIndex + cleanQuery.length + 60);
          snippet = (start > 0 ? '...' : '') + page.raw_text.substring(start, end) + (end < page.raw_text.length ? '...' : '');
        } else {
          snippet = page.raw_text.substring(0, 150) + '...';
        }
        return { 
          id: page.id, 
          url: page.url, 
          domain_url: Array.isArray(page.crawler_seed_domains) ? (page.crawler_seed_domains[0] as any)?.domain_url : (page.crawler_seed_domains as any)?.domain_url, 
          snippet, 
          og_image_url: page.og_image_url, 
          is_video: page.is_video,
          resultType: 'web' 
        };
      });
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

    let shopQ = supabase.from('agent_barbershop_leads')
      .select('id, shop_name, city, formatted_address, phone, hiring_need, booth_count_available, rent_type, rent_rate, ai_culture_summary, rating, opportunity_status, google_images', { count: 'exact' });
    
    if (isHiring) shopQ = shopQ.eq('hiring_need', true).gt('booth_count_available', 0);
    if (rentTypeFilter) shopQ = shopQ.eq('rent_type', rentTypeFilter);
    if (cleanQuery.length >= 2) shopQ = shopQ.or(`shop_name.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%,rent_type.ilike.%${cleanQuery}%,ai_culture_summary.ilike.%${cleanQuery}%,opportunity_status.ilike.%${cleanQuery}%`);

    let shopData: any[] = [];
    let shopCount = 0;

    if (shopLimit > 0 && (filterTab === 'All' || filterTab === 'Barbershops')) {
      const { data, count, error } = await shopQ.range(shopOffset, shopOffset + shopLimit - 1);
      if (error) throw error;
      shopData = data || [];
      shopCount = count || 0;
    } else if (filterTab === 'All' || filterTab === 'Barbershops') {
      const { count, error } = await shopQ.limit(1);
      if (error) throw error;
      shopCount = count || 0;
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
