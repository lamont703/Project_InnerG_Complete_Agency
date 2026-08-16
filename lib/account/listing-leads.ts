import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext } from "@/lib/account/view-as";

// "Leads we sent you" data layer. Attribution runs through get_listing_lead_report
// (page_url slug matching); this file resolves WHICH listing to report on —
// either the one a logged-in owner has claimed, or (for admin outreach) any
// listing by its route + slug.

export type ListingRoute =
  | "shop" | "salons" | "schools" | "barbers" | "stores" | "cosmetologists" | "events";

// Claim-link entity_type (from community_member_entity_links / CLAIM_ENTITY_TYPES)
// → the URL route segment + backing table + display-name column. Note the two
// school types and two store types collapse onto one route each (/schools, /stores),
// matching the profile routes get_entity_profile_engagement parses.
export const LEAD_LISTING_BY_CLAIM_KEY: Record<string, { route: ListingRoute; table: string; nameCol: string }> = {
  shop: { route: "shop", table: "agent_barbershop_leads", nameCol: "shop_name" },
  salon: { route: "salons", table: "agent_salon_leads", nameCol: "shop_name" },
  barber_school: { route: "schools", table: "agent_barber_school_leads", nameCol: "school_name" },
  cosmetology_school: { route: "schools", table: "agent_cosmetology_school_leads", nameCol: "school_name" },
  barber_supply_store: { route: "stores", table: "agent_barber_supply_store_leads", nameCol: "name" },
  beauty_supply_store: { route: "stores", table: "agent_beauty_supply_store_leads", nameCol: "name" },
  barber: { route: "barbers", table: "agent_barber_leads", nameCol: "name" },
  cosmetologist: { route: "cosmetologists", table: "agent_cosmetologist_leads", nameCol: "name" },
  event: { route: "events", table: "events", nameCol: "title" },
};

// One route can be served by more than one table (schools, stores) — used by the
// admin one-pager, which only knows the route + slug, not the claim key.
const TABLES_BY_ROUTE: Record<ListingRoute, { table: string; nameCol: string }[]> = {
  shop: [{ table: "agent_barbershop_leads", nameCol: "shop_name" }],
  salons: [{ table: "agent_salon_leads", nameCol: "shop_name" }],
  schools: [
    { table: "agent_barber_school_leads", nameCol: "school_name" },
    { table: "agent_cosmetology_school_leads", nameCol: "school_name" },
  ],
  barbers: [{ table: "agent_barber_leads", nameCol: "name" }],
  stores: [
    { table: "agent_barber_supply_store_leads", nameCol: "name" },
    { table: "agent_beauty_supply_store_leads", nameCol: "name" },
  ],
  cosmetologists: [{ table: "agent_cosmetologist_leads", nameCol: "name" }],
  events: [{ table: "events", nameCol: "title" }],
};

export const ROUTE_LABEL: Record<ListingRoute, string> = {
  shop: "Barbershop",
  salons: "Salon",
  schools: "School",
  barbers: "Barber",
  stores: "Supply store",
  cosmetologists: "Cosmetologist",
  events: "Event",
};

export interface ResolvedListing {
  route: ListingRoute;
  slug: string;
  name: string;
  entityType: string;
  entityId: string;
}

export interface LeadMonth {
  month: string; // YYYY-MM-DD (first of month)
  visits: number;
  uniqueVisitors: number;
  callClicks: number;
  websiteClicks: number;
  emailClicks: number;
  totalLeads: number;
}

// The listing the authenticated user has claimed, if any — resolved server-side
// from session → community_members → community_member_entity_links, never from a
// client-supplied id. Unlike resolveOwnedEntity (shop/salon edit only), this
// covers every claimable type, since leads matter for all of them.
export async function resolveOwnedListing():
  Promise<{ status: 401 } | { listing: null } | { listing: ResolvedListing }> {
  // Member comes from resolveMemberContext(), so an admin with View As active
  // sees that member's listing insights instead of their own.
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { status: 401 };

  const admin = createAdminClient();

  const { data: link } = await (admin
    .from("community_member_entity_links") as any)
    .select("entity_type, entity_id")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();
  if (!link) return { listing: null };

  const cfg = LEAD_LISTING_BY_CLAIM_KEY[link.entity_type];
  if (!cfg) return { listing: null };

  const { data: row } = await (admin
    .from(cfg.table) as any)
    .select(`slug, ${cfg.nameCol}`)
    .eq("id", link.entity_id)
    .maybeSingle();
  if (!row || !row.slug) return { listing: null };

  return {
    listing: {
      route: cfg.route,
      slug: row.slug,
      name: row[cfg.nameCol] || row.slug,
      entityType: link.entity_type,
      entityId: link.entity_id,
    },
  };
}

// For the admin cold-outreach one-pager: resolve any listing's display name from
// its route + slug (checks every table that serves that route). Returns null if
// no matching listing exists.
export async function resolveListingByRouteSlug(route: string, slug: string): Promise<ResolvedListing | null> {
  const tables = TABLES_BY_ROUTE[route as ListingRoute];
  if (!tables) return null;
  const admin = createAdminClient();
  for (const { table, nameCol } of tables) {
    const { data: row } = await (admin.from(table) as any)
      .select(`id, ${nameCol}`)
      .eq("slug", slug)
      .maybeSingle();
    if (row) {
      return {
        route: route as ListingRoute,
        slug,
        name: row[nameCol] || slug,
        entityType: route,
        entityId: row.id,
      };
    }
  }
  return null;
}

// Monthly lead time-series for one listing over the trailing `months` window.
export async function fetchListingLeadReport(route: string, slug: string, months = 12): Promise<LeadMonth[]> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (months - 1), 1);
  cutoff.setHours(0, 0, 0, 0);

  const { data, error } = await (admin as any).rpc("get_listing_lead_report", {
    p_route: route,
    p_slug: slug,
    p_cutoff: cutoff.toISOString(),
  });
  if (error || !data) return [];

  return (data as any[]).map((r) => ({
    month: r.month,
    visits: Number(r.visits) || 0,
    uniqueVisitors: Number(r.unique_visitors) || 0,
    callClicks: Number(r.call_clicks) || 0,
    websiteClicks: Number(r.website_clicks) || 0,
    emailClicks: Number(r.email_clicks) || 0,
    totalLeads: Number(r.total_leads) || 0,
  }));
}

// Roll a month series into totals + this-month / last-month splits for the cards.
export function summarizeLeads(series: LeadMonth[]) {
  const totals = series.reduce(
    (a, m) => ({
      visits: a.visits + m.visits,
      uniqueVisitors: a.uniqueVisitors + m.uniqueVisitors,
      callClicks: a.callClicks + m.callClicks,
      websiteClicks: a.websiteClicks + m.websiteClicks,
      emailClicks: a.emailClicks + m.emailClicks,
      totalLeads: a.totalLeads + m.totalLeads,
    }),
    { visits: 0, uniqueVisitors: 0, callClicks: 0, websiteClicks: 0, emailClicks: 0, totalLeads: 0 }
  );
  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];
  return { totals, thisMonth, lastMonth };
}
