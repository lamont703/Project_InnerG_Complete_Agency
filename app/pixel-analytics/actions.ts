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
      identifiedLeads: [], identifiedProfessionals: [], topPages: [], topInsights: [], topReferrers: [], topFilters: [], recentEvents: []
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

  // 4. CRM Leads Extraction
  // We only pull events that actually contain a GHL Contact ID
  let crmQuery = supabase
    .from('pixel_events')
    .select('id, event_name, page_url, created_at, metadata')
    .or("page_url.ilike.%ghl_contact_id=%,metadata->>ghl_contact_id.not.is.null");

  if (cutoffDate) crmQuery = crmQuery.gte("created_at", cutoffDate);
  const { data: crmEvents } = await crmQuery;

  const ghlContactStats = new Map<string, { views: number; clicks: number; activity: any[] }>();
  
  if (crmEvents) {
    for (const event of crmEvents) {
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
             stats.activity.push(event);
         }
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

  // 5. Professional Telemetry Extraction
  let profIdentifyQuery = supabase
    .from("pixel_events")
    .select("visitor_id, metadata")
    .or("event_name.eq.identify,event_name.eq.$identify");
    
  if (cutoffDate) profIdentifyQuery = profIdentifyQuery.gte("created_at", cutoffDate);
  const { data: identifyEvents } = await profIdentifyQuery;

  const professionalVisitorMap = new Map<string, { barberId: string; name: string; phone: string }>();
  if (identifyEvents) {
    for (const ev of identifyEvents) {
      if (ev.metadata?.role === "professional" && ev.visitor_id && ev.metadata.barberId) {
        professionalVisitorMap.set(ev.visitor_id, {
          barberId: ev.metadata.barberId,
          name: ev.metadata.name || "Professional",
          phone: ev.metadata.email || "",
        });
      }
    }
  }

  let identifiedProfessionals: AnalyticsData['identifiedProfessionals'] = [];
  
  if (professionalVisitorMap.size > 0) {
    const profVisitorIds = Array.from(professionalVisitorMap.keys());
    
    // Fetch ONLY events for these specific professional visitor_ids
    let profEventsQuery = supabase
      .from('pixel_events')
      .select('id, event_name, page_url, created_at, visitor_id, metadata')
      .in('visitor_id', profVisitorIds);
      
    if (cutoffDate) profEventsQuery = profEventsQuery.gte("created_at", cutoffDate);
    const { data: profEvents } = await profEventsQuery;
    
    const professionalStats = new Map<string, { barberId: string; name: string; phone: string; views: number; clicks: number; activity: any[] }>();
    
    if (profEvents) {
      for (const event of profEvents) {
        const profInfo = professionalVisitorMap.get(event.visitor_id!)!;
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
          stats.activity.push(event);
        }
      }
    }

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
    identifiedLeads,
    identifiedProfessionals,
    recentEvents: recentEvents || [],
  }
}

