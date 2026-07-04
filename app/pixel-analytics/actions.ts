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
  recentEvents: any[]
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
      totalViews: 0, totalClicks: 0, activeUsers: 0, engagedUsers: 0, returningUsers: 0,
      totalSearches: 0, uniqueSearchers: 0, outboundLeads: 0, shopClaims: 0,
      aiModeActivations: 0, aiMessagesSent: 0, aiRateLimitHits: 0,
      topPages: [], topInsights: [], topReferrers: [], topFilters: [], recentEvents: []
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

  return {
    totalViews: summary.totalViews || 0,
    totalClicks: summary.totalClicks || 0,
    activeUsers: summary.activeUsers || 0,
    engagedUsers: summary.engagedUsers || 0,
    returningUsers: summary.returningUsers || 0,
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
    recentEvents: recentEvents || [],
  }
}

