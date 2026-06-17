"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export type AnalyticsData = {
  totalViews: number
  totalClicks: number
  uniqueVisitors: number
  topPages: { url: string; count: number }[]
  topInsights: { url: string; count: number }[]
  topReferrers: { url: string; count: number }[]
  recentEvents: any[]
}

export async function fetchAnalyticsData(days?: number): Promise<AnalyticsData> {
  let allEvents: any[] = []
  let hasMore = true
  let page = 0
  const pageSize = 1000

  // Calculate cutoff date if days is provided
  let cutoffDate: string | undefined;
  if (days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    cutoffDate = d.toISOString();
  }

  while (hasMore) {
    let query = supabase
      .from("pixel_events")
      .select("*")
      .or("page_url.ilike.%localhost%,page_url.ilike.%innergcomplete.com%")
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)
      
    if (cutoffDate) {
      query = query.gte("created_at", cutoffDate)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching pixel events:", error)
      break // Stop fetching on error, but process what we have
    }

    if (data && data.length > 0) {
      allEvents = [...allEvents, ...data]
      if (data.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  const events = allEvents

  let totalViews = 0
  let totalClicks = 0
  const visitors = new Set<string>()
  const pageCounts: Record<string, number> = {}
  const insightsCounts: Record<string, number> = {}
  const referrerCounts: Record<string, number> = {}

  for (const event of events) {
    if (event.event_name === "page_view") {
      totalViews++
    } else if (event.event_name === "click") {
      totalClicks++
    }

    if (event.visitor_id) {
      visitors.add(event.visitor_id)
    }

    // Top Pages and Insights
    if (event.page_url) {
      // Normalize URL (strip query params for cleaner top pages view)
      try {
        const urlObj = new URL(event.page_url)
        const cleanUrl = urlObj.pathname === "/" ? "Home" : urlObj.pathname
        pageCounts[cleanUrl] = (pageCounts[cleanUrl] || 0) + 1
        
        if (cleanUrl.startsWith("/insights")) {
           insightsCounts[cleanUrl] = (insightsCounts[cleanUrl] || 0) + 1
        }
      } catch {
        pageCounts[event.page_url] = (pageCounts[event.page_url] || 0) + 1
      }
    }

    // Top Referrers
    if (event.referrer) {
      try {
        const refObj = new URL(event.referrer)
        const cleanRef = refObj.hostname
        referrerCounts[cleanRef] = (referrerCounts[cleanRef] || 0) + 1
      } catch {
        referrerCounts[event.referrer] = (referrerCounts[event.referrer] || 0) + 1
      }
    }
  }

  const topPages = Object.entries(pageCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    
  const topInsights = Object.entries(insightsCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topReferrers = Object.entries(referrerCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const recentEvents = events.slice(0, 20)

  return {
    totalViews,
    totalClicks,
    uniqueVisitors: visitors.size,
    topPages,
    topInsights,
    topReferrers,
    recentEvents,
  }
}
