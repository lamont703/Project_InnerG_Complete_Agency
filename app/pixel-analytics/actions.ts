"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export type AnalyticsData = {
  totalViews: number
  totalClicks: number
  activeUsers: number
  engagedUsers: number
  returningUsers: number
  qualifiedVisitors: number
  totalSearches: number
  uniqueSearchers: number
  outboundLeads: number
  shopClaims: number
  aiModeActivations: number
  aiMessagesSent: number
  aiRateLimitHits: number
  topPages: { url: string; count: number }[]
  topInsights: { url: string; count: number }[]
  topReferrers: { url: string; count: number }[]
  topFilters: { filter_id: string; count: number }[]
  topSearchPerformers: { name: string; href: string; resultType: string; impressions: number; avgPosition: number; clicks: number; ctr: number }[]
  categoryViews: { category: string; views: number; visitors: number }[]
  recentEvents: any[]
}

// result_type "school"/"store" span two tables each (barber vs. cosmetology
// school, barber vs. beauty supply store) — both get checked since the RPC
// only knows the generic type, not which specific table an id lives in.
async function resolveEntityNames(rows: { entity_id: string; result_type: string }[]) {
  const idsByType: Record<string, string[]> = {}
  for (const r of rows) {
    (idsByType[r.result_type] ||= []).push(r.entity_id)
  }

  const nameMap = new Map<string, { name: string; href: string }>()
  const key = (type: string, id: string) => `${type}:${id}`

  const lookups: PromiseLike<void>[] = []

  if (idsByType.shop?.length) {
    lookups.push(supabase.from('agent_barbershop_leads').select('id, slug, shop_name').in('id', idsByType.shop)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('shop', d.id), { name: d.shop_name, href: `/shop/${d.slug}` }))))
  }
  if (idsByType.salon?.length) {
    lookups.push(supabase.from('agent_salon_leads').select('id, slug, shop_name').in('id', idsByType.salon)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('salon', d.id), { name: d.shop_name, href: `/salons/${d.slug}` }))))
  }
  if (idsByType.barber?.length) {
    lookups.push(supabase.from('agent_barber_leads').select('id, slug, name').in('id', idsByType.barber)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('barber', d.id), { name: d.name, href: `/barbers/${d.slug}` }))))
  }
  if (idsByType.cosmetologist?.length) {
    lookups.push(supabase.from('agent_cosmetologist_leads').select('id, slug, name').in('id', idsByType.cosmetologist)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('cosmetologist', d.id), { name: d.name, href: `/cosmetologists/${d.slug}` }))))
  }
  if (idsByType.school?.length) {
    lookups.push(supabase.from('agent_barber_school_leads').select('id, slug, school_name').in('id', idsByType.school)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('school', d.id), { name: d.school_name, href: `/schools/${d.slug}` }))))
    lookups.push(supabase.from('agent_cosmetology_school_leads').select('id, slug, school_name').in('id', idsByType.school)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('school', d.id), { name: d.school_name, href: `/schools/${d.slug}` }))))
  }
  if (idsByType.store?.length) {
    lookups.push(supabase.from('agent_barber_supply_store_leads').select('id, slug, name').in('id', idsByType.store)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('store', d.id), { name: d.name, href: `/stores/${d.slug}` }))))
    lookups.push(supabase.from('agent_beauty_supply_store_leads').select('id, slug, name').in('id', idsByType.store)
      .then(({ data }) => data?.forEach((d: any) => nameMap.set(key('store', d.id), { name: d.name, href: `/stores/${d.slug}` }))))
  }

  await Promise.all(lookups);
  return nameMap;
}

export async function fetchAnalyticsData(days?: number): Promise<AnalyticsData> {
  // 1. Calculate Cutoff Date
  let cutoffDate: string | undefined;
  if (days) {
    const d = new Date();
    const daysToSubtract = days === 1 ? 0 : days;
    d.setDate(d.getDate() - daysToSubtract);
    d.setHours(0, 0, 0, 0);
    cutoffDate = d.toISOString();
  }

  // 2. Fetch the pre-aggregated summary from our new PostgreSQL RPC
  // This completely eliminates the need to pull thousands of rows into server memory!
  const { data: summaryData, error: summaryError } = await supabase
    .rpc('get_pixel_analytics_summary', { p_cutoff: cutoffDate });

  if (summaryError) {
    console.error("Error fetching pixel RPC summary:", summaryError);
    // Return empty fallback if the RPC fails
    return {
      totalViews: 0, totalClicks: 0, activeUsers: 0, engagedUsers: 0, returningUsers: 0, qualifiedVisitors: 0,
      totalSearches: 0, uniqueSearchers: 0, outboundLeads: 0, shopClaims: 0,
      aiModeActivations: 0, aiMessagesSent: 0, aiRateLimitHits: 0,
      topPages: [], topInsights: [], topReferrers: [], topFilters: [], topSearchPerformers: [], categoryViews: [], recentEvents: []
    }
  }

  const summary = summaryData as any || {};

  // 3. Fetch Recent Events (Lightweight: only 20 rows)
  let recentEventsQuery = supabase
    .from("pixel_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (cutoffDate) {
    recentEventsQuery = recentEventsQuery.gte("created_at", cutoffDate);
  }
  const { data: recentEvents } = await recentEventsQuery;

  // 4. Top Search Performers — analytics only, does not feed ranking.
  // Impressions/clicks/CTR per entity, resolved from raw ids to real
  // names/links since a dashboard full of UUIDs isn't useful to look at.
  const { data: searchPerformanceRows } = await supabase
    .rpc('get_search_performance_by_entity', { p_cutoff: cutoffDate || null });
  const performanceRows = (searchPerformanceRows || []) as any[];
  const nameMap = await resolveEntityNames(performanceRows);
  const topSearchPerformers = performanceRows
    .map((r) => {
      const resolved = nameMap.get(`${r.result_type}:${r.entity_id}`);
      if (!resolved) return null; // entity was deleted/renamed since the click/impression happened
      return {
        name: resolved.name,
        href: resolved.href,
        resultType: r.result_type,
        impressions: Number(r.impressions),
        avgPosition: Number(r.avg_position),
        clicks: Number(r.clicks),
        ctr: Number(r.ctr),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  return {
    totalViews: summary.totalViews || 0,
    totalClicks: summary.totalClicks || 0,
    activeUsers: summary.activeUsers || 0,
    engagedUsers: summary.engagedUsers || 0,
    returningUsers: summary.returningUsers || 0,
    qualifiedVisitors: summary.qualifiedVisitors || 0,
    totalSearches: summary.totalSearches || 0,
    uniqueSearchers: summary.uniqueSearchers || 0,
    outboundLeads: summary.outboundLeads || 0,
    shopClaims: summary.shopClaims || 0,
    aiModeActivations: summary.aiModeActivations || 0,
    aiMessagesSent: summary.aiMessagesSent || 0,
    aiRateLimitHits: summary.aiRateLimitHits || 0,
    topPages: summary.topPages || [],
    topInsights: summary.topInsights || [],
    topReferrers: summary.topReferrers || [],
    topFilters: summary.topFilters || [],
    topSearchPerformers,
    categoryViews: summary.categoryViews || [],
    recentEvents: recentEvents || [],
  }
}

export type ClickBreakdownItem = { label: string; elementType: string; count: number };

// Per-entity button labels like "REQUEST A SHOP DAY AT MIRIAM J BEAUTY
// SALON" would otherwise count as a different button for every single
// entity page — this collapses them back to the one conceptual button
// ("REQUEST A SHOP DAY") so the drill-down shows what people are actually
// clicking across the category, not one row per shop/salon/school name.
function normalizeElementName(raw: string | null): string {
  if (!raw || !raw.trim()) return "(icon or unlabeled button)";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const atSuffixMatch = cleaned.match(/^(.{3,}?)\s+AT\s+.{4,}$/i);
  if (atSuffixMatch) return atSuffixMatch[1].trim();
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

export async function fetchCategoryClickBreakdown(category: string, days?: number): Promise<ClickBreakdownItem[]> {
  let cutoffDate: string | undefined;
  if (days) {
    const d = new Date();
    d.setDate(d.getDate() - (days === 1 ? 0 : days));
    d.setHours(0, 0, 0, 0);
    cutoffDate = d.toISOString();
  }

  const { data, error } = await supabase.rpc("get_category_click_breakdown", {
    p_category: category,
    p_cutoff: cutoffDate || null,
  });

  if (error) {
    console.error("Error fetching category click breakdown:", error);
    return [];
  }

  const merged = new Map<string, ClickBreakdownItem>();
  for (const row of (data as any[]) || []) {
    const label = normalizeElementName(row.element_name);
    const key = `${label}__${row.element_type || ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += Number(row.count);
    } else {
      merged.set(key, { label, elementType: row.element_type || "", count: Number(row.count) });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.count - a.count);
}

export type BotRequestStats = {
  totalRequests: number
  knownBotRequests: number
  byBotName: { botName: string; count: number }[]
  topEntities: { entityType: string; slug: string; count: number }[]
}

// Separate from pixel_events on purpose — this counts hits to the .md
// AI-crawler endpoints (app/api/llm/[entityType]/[slug]/route.ts), which
// bots fetch directly with no JS execution, so the browser-side pixel
// never fires for this traffic at all.
export async function fetchBotRequestStats(days?: number): Promise<BotRequestStats> {
  let cutoffDate: string | undefined
  if (days) {
    const d = new Date()
    d.setDate(d.getDate() - (days === 1 ? 0 : days))
    d.setHours(0, 0, 0, 0)
    cutoffDate = d.toISOString()
  }

  let query = supabase.from("llm_bot_requests").select("entity_type, slug, bot_name, is_known_bot")
  if (cutoffDate) query = query.gte("requested_at", cutoffDate)

  const { data, error } = await query
  if (error) {
    console.error("Error fetching llm_bot_requests:", error)
    return { totalRequests: 0, knownBotRequests: 0, byBotName: [], topEntities: [] }
  }

  const rows = data || []
  const byBotNameMap = new Map<string, number>()
  const byEntityMap = new Map<string, { entityType: string; slug: string; count: number }>()

  let knownBotRequests = 0
  for (const row of rows) {
    if (row.is_known_bot && row.bot_name) {
      knownBotRequests++
      byBotNameMap.set(row.bot_name, (byBotNameMap.get(row.bot_name) || 0) + 1)
    }
    const key = `${row.entity_type}/${row.slug}`
    const existing = byEntityMap.get(key)
    if (existing) {
      existing.count++
    } else {
      byEntityMap.set(key, { entityType: row.entity_type, slug: row.slug, count: 1 })
    }
  }

  return {
    totalRequests: rows.length,
    knownBotRequests,
    byBotName: Array.from(byBotNameMap.entries())
      .map(([botName, count]) => ({ botName, count }))
      .sort((a, b) => b.count - a.count),
    topEntities: Array.from(byEntityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  }
}

