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
  identifiedLeads: { 
    contactId: string; 
    shopName: string; 
    phone: string; 
    views: number;
    clicks: number;
    activity: any[];
  }[]
  identifiedProfessionals: {
    barberId: string;
    name: string;
    phone: string;
    views: number;
    clicks: number;
    activity: any[];
  }[]
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
    // If 'Today' (days=1), we want midnight of the current day (subtract 0).
    // Otherwise subtract the number of days (e.g. 7 or 30).
    const daysToSubtract = days === 1 ? 0 : days;
    d.setDate(d.getDate() - daysToSubtract);
    d.setHours(0, 0, 0, 0); // Strict calendar day reset at midnight
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
  const engagedSet = new Set<string>()
  const ghlContactStats = new Map<string, { views: number; clicks: number; activity: any[] }>()
  
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
      
      // Check for engagement
      if (
        event.event_name === "click" || 
        (event.event_name === "scroll" && event.metadata?.depth === "50%") ||
        (event.event_name === "page_leave" && event.metadata?.duration_seconds >= 60)
      ) {
        engagedSet.add(event.visitor_id)
      }
    }
    
    // GHL Resolution
    let contactId: string | null = null;
    if (event.metadata?.ghl_contact_id) {
       contactId = event.metadata.ghl_contact_id;
    } else if (event.page_url && event.page_url.includes('ghl_contact_id=')) {
       try {
           const url = new URL(event.page_url);
           const id = url.searchParams.get('ghl_contact_id');
           if (id && id !== '{{contact.id}}') contactId = id;
       } catch (e) {}
    }

    if (contactId) {
       if (!ghlContactStats.has(contactId)) {
           ghlContactStats.set(contactId, { views: 0, clicks: 0, activity: [] });
       }
       const stats = ghlContactStats.get(contactId)!;
       if (event.event_name === "page_view") stats.views++;
       if (event.event_name === "click") stats.clicks++;
       
       if (stats.activity.length < 50) {
           stats.activity.push({
               id: event.id,
               event_name: event.event_name,
               page_url: event.page_url,
               created_at: event.created_at,
               metadata: event.metadata || {}
           });
       }
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

  let returningUsersCount = 0;
  if (visitors.size > 0) {
    if (cutoffDate) {
      // Chunk check for past events
      const visitorsArr = Array.from(visitors);
      const chunk = 500;
      const returningSet = new Set<string>();
      for (let i = 0; i < visitorsArr.length; i += chunk) {
         const { data: pastEvents } = await supabase
           .from("pixel_events")
           .select("visitor_id")
           .in("visitor_id", visitorsArr.slice(i, i+chunk))
           .lt("created_at", cutoffDate)
           .limit(10000);
         if (pastEvents) {
           pastEvents.forEach((e: any) => returningSet.add(e.visitor_id));
         }
      }
      returningUsersCount = returningSet.size;
    } else {
      // All time: Returning means they visited on > 1 distinct date
      const visitorDates = new Map<string, Set<string>>();
      for (const event of events) {
         if (!event.visitor_id || !event.created_at) continue;
         const d = new Date(event.created_at).toISOString().split('T')[0];
         if (!visitorDates.has(event.visitor_id)) visitorDates.set(event.visitor_id, new Set());
         visitorDates.get(event.visitor_id)!.add(d);
      }
      for (const dates of visitorDates.values()) {
         if (dates.size > 1) returningUsersCount++;
      }
    }
  }
  
  let identifiedLeads: AnalyticsData['identifiedLeads'] = [];
  if (ghlContactStats.size > 0) {
     const contactIds = Array.from(ghlContactStats.keys());
     const chunk = 500;
     for (let i = 0; i < contactIds.length; i += chunk) {
         const { data: leads } = await supabase
             .from("agent_barbershop_leads")
             .select("shop_name, phone, contact_id")
             .in("contact_id", contactIds.slice(i, i+chunk));
             
         if (leads) {
             for (const lead of leads) {
                 if (lead.contact_id && ghlContactStats.has(lead.contact_id)) {
                     const stats = ghlContactStats.get(lead.contact_id)!;
                     identifiedLeads.push({
                         contactId: lead.contact_id,
                         shopName: lead.shop_name || 'Unknown Shop',
                         phone: lead.phone || '',
                         views: stats.views,
                         clicks: stats.clicks,
                         activity: stats.activity
                     });
                 }
             }
         }
     }
     identifiedLeads.sort((a, b) => b.views - a.views);
  }

  // Identify Professional Telemetry
  let identifiedProfessionals: AnalyticsData['identifiedProfessionals'] = [];
  const uniqueVisitorIds = Array.from(visitors);
  const professionalVisitorMap = new Map<string, { barberId: string; name: string; phone: string }>();

  if (uniqueVisitorIds.length > 0) {
    const chunk = 500;
    for (let i = 0; i < uniqueVisitorIds.length; i += chunk) {
      const { data: idEvents } = await supabase
        .from("pixel_events")
        .select("visitor_id, metadata")
        .in("visitor_id", uniqueVisitorIds.slice(i, i + chunk))
        .or("event_name.eq.identify,event_name.eq.$identify");

      if (idEvents) {
        for (const ev of idEvents) {
          if (ev.metadata?.role === "professional" && ev.visitor_id) {
            professionalVisitorMap.set(ev.visitor_id, {
              barberId: ev.metadata.barberId,
              name: ev.metadata.name || "Professional",
              phone: ev.metadata.email || "",
            });
          }
        }
      }
    }
  }

  const professionalStats = new Map<string, { barberId: string; name: string; phone: string; views: number; clicks: number; activity: any[] }>();
  for (const event of events) {
    if (event.visitor_id && professionalVisitorMap.has(event.visitor_id)) {
      const profInfo = professionalVisitorMap.get(event.visitor_id)!;
      const barberId = profInfo.barberId;
      if (!professionalStats.has(barberId)) {
        professionalStats.set(barberId, {
          barberId,
          name: profInfo.name,
          phone: profInfo.phone,
          views: 0,
          clicks: 0,
          activity: [],
        });
      }
      const stats = professionalStats.get(barberId)!;
      if (event.event_name === "page_view") stats.views++;
      if (event.event_name === "click") stats.clicks++;

      if (stats.activity.length < 50) {
        stats.activity.push({
          id: event.id,
          event_name: event.event_name,
          page_url: event.page_url,
          created_at: event.created_at,
          metadata: event.metadata || {},
        });
      }
    }
  }

  if (professionalStats.size > 0) {
    const barberIds = Array.from(professionalStats.keys());
    const chunk = 500;
    for (let i = 0; i < barberIds.length; i += chunk) {
      const { data: barbers } = await supabase
        .from("agent_barber_leads")
        .select("id, name, phone")
        .in("id", barberIds.slice(i, i + chunk));

      if (barbers) {
        for (const b of barbers) {
          if (professionalStats.has(b.id)) {
            const stats = professionalStats.get(b.id)!;
            identifiedProfessionals.push({
              barberId: b.id,
              name: b.name || stats.name || "Professional",
              phone: b.phone || stats.phone || "",
              views: stats.views,
              clicks: stats.clicks,
              activity: stats.activity,
            });
          }
        }
      }
    }
    identifiedProfessionals.sort((a, b) => b.views - a.views);
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
    activeUsers: visitors.size,
    engagedUsers: engagedSet.size,
    returningUsers: returningUsersCount,
    identifiedLeads,
    identifiedProfessionals,
    topPages,
    topInsights,
    topReferrers,
    recentEvents,
  }
}
