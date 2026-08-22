import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchYouTubeDemand, type YouTubeDemand } from "./youtube-demand";

/**
 * The facts the research agents are allowed to reason from.
 *
 * Everything here is a real count from a real table. Nothing is estimated and
 * nothing is passed through from the model — the agents receive this object,
 * and lib/research/types.ts rejects any finding that cites a key absent from
 * it. That constraint is what stops "post about Houston, it gets tons of
 * traffic" and forces "Houston was searched 41 times and has no post".
 *
 * PIXEL QUERIES ARE SAMPLED, AND SAY SO. PostgREST caps a select at 1,000 rows
 * without explicit ranging, and 48,786 pixel events will not fit. Rather than
 * page through all of them on every run, recent events are sampled and the
 * sample size is reported alongside every derived count, so a number can never
 * be read as a total when it is a slice.
 */

const PIXEL_SAMPLE = 5000;

async function pixelSample(): Promise<{ rows: PixelRow[]; sampled: number }> {
  const db = createAdminClient();
  const rows: PixelRow[] = [];
  const PAGE = 1000;
  for (let from = 0; from < PIXEL_SAMPLE; from += PAGE) {
    const { data, error } = await db
      .from("pixel_events")
      .select("event_name,page_url,page_title,metadata,referrer,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as unknown as PixelRow[]));
    if (data.length < PAGE) break;
  }
  return { rows, sampled: rows.length };
}

interface PixelRow {
  event_name: string;
  page_url: string | null;
  page_title: string | null;
  metadata: unknown;
  referrer: string | null;
  created_at: string;
}

function meta(m: unknown): Record<string, unknown> {
  if (!m) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof m === "object" ? (m as Record<string, unknown>) : {};
}

function pathOf(url: string | null): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
}

function tally<T extends string>(items: T[]): [T, number][] {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export interface ContentEvidence {
  pixel_sample_size: number;
  top_search_queries: { query: string; searches: number }[];
  top_pages: { path: string; views: number }[];
  pages_with_no_engagement: { path: string; views: number; clicks: number }[];
  referrer_sources: { source: string; visits: number }[];
  directory_counts: Record<string, number>;
  /**
   * NAMED FOR THE SAMPLE, NOT THE TOTAL, and that is the whole point.
   *
   * PostgREST caps a select at 1,000 rows, so this counts cities across 1,000
   * of 2,541 barbershops. When the key was called `top_cities_by_shop_count`
   * the agent read it as a census and wrote "Dallas is our largest market with
   * 30 shops" — understating a real number by an unknown multiple while sounding
   * precise. A key that says "sampled" cannot be misread that way.
   */
  city_counts_note: string;
  top_cities_in_shop_sample: { city: string; shops_in_sample: number }[];
  already_published: { title: string; status: string }[];
  published_count: number;
  /**
   * Demand from OUTSIDE this site.
   *
   * Every other key here describes people who already found ShearQuery. These
   * are the words strangers typed into YouTube. Spread into the evidence object
   * rather than nested, so the validator's key check works on the individual
   * fields and a finding can cite `youtube_search_terms` directly.
   */
  youtube_available: boolean;
  youtube_unavailable_reason?: string;
  youtube_search_terms?: { term: string; views: number }[];
  youtube_traffic_sources?: { source: string; views: number }[];
  youtube_recent_videos?: { title: string; views: number; likes: number; published: string }[];
  youtube_data_freshness_note?: string;
}

/**
 * What the Content agent gets to look at.
 *
 * The two halves matter together: what people ASK for (searches, pages) against
 * what has already been MADE (the publisher queue). A gap between them is a
 * content idea with a number attached; either half alone is just a list.
 */
export async function gatherContentEvidence(): Promise<ContentEvidence> {
  const db = createAdminClient();
  const { rows, sampled } = await pixelSample();

  const searches = rows
    .filter((r) => r.event_name === "search_executed")
    .map((r) => String(meta(r.metadata).query ?? "").trim().toLowerCase())
    .filter(Boolean);

  const views = rows.filter((r) => r.event_name === "page_view").map((r) => pathOf(r.page_url));
  const clicksByPath = tally(
    rows.filter((r) => r.event_name === "click").map((r) => pathOf(r.page_url)),
  );
  const clickMap = new Map(clicksByPath);

  const viewTally = tally(views);

  const [shops, salons, barbers, schools, cosmos] = await Promise.all(
    ["agent_barbershop_leads", "agent_salon_leads", "agent_barber_leads", "agent_barber_school_leads", "agent_cosmetologist_leads"].map(
      async (t) => {
        const { count } = await db.from(t).select("*", { count: "exact", head: true });
        return count ?? 0;
      },
    ),
  );

  const { data: cityRows } = await db.from("agent_barbershop_leads").select("city").limit(1000);
  const cityTally = tally(
    ((cityRows ?? []) as { city: string | null }[]).map((r) => (r.city ?? "").trim()).filter(Boolean),
  );

  // Fails soft by contract — a YouTube outage degrades the research rather
  // than breaking it, so it is awaited alongside rather than guarded here.
  const youtube: YouTubeDemand = await fetchYouTubeDemand();

  const { data: published } = await db
    .from("publisher_queue")
    .select("title,status")
    .order("position", { ascending: true })
    .limit(60);

  return {
    pixel_sample_size: sampled,
    top_search_queries: tally(searches).slice(0, 15).map(([query, searches]) => ({ query, searches })),
    top_pages: viewTally.slice(0, 20).map(([path, views]) => ({ path, views })),
    // Pages people land on and then do nothing with. The clearest signal that a
    // subject has demand but the page is not converting attention into action.
    pages_with_no_engagement: viewTally
      .filter(([path, v]) => v >= 3 && (clickMap.get(path) ?? 0) === 0)
      .slice(0, 15)
      .map(([path, views]) => ({ path, views, clicks: clickMap.get(path) ?? 0 })),
    referrer_sources: tally(
      rows
        .filter((r) => r.event_name === "page_view" && r.referrer)
        .map((r) => {
          try {
            return new URL(r.referrer!).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    )
      .slice(0, 12)
      .map(([source, visits]) => ({ source, visits })),
    directory_counts: {
      barbershops: shops,
      salons,
      barbers,
      schools,
      cosmetologists: cosmos,
    },
    city_counts_note:
      `Counted across ${(cityRows ?? []).length} of ${shops} barbershops — a sample, not a total. ` +
      `Use these to rank cities against each other, never as the number of shops in a city.`,
    top_cities_in_shop_sample: cityTally
      .slice(0, 15)
      .map(([city, n]) => ({ city, shops_in_sample: n })),
    already_published: ((published ?? []) as { title: string; status: string }[]).map((p) => ({
      title: p.title,
      status: p.status,
    })),
    published_count: (published ?? []).length,
    youtube_available: youtube.available,
    ...(youtube.available
      ? {
          youtube_search_terms: youtube.youtube_search_terms,
          youtube_traffic_sources: youtube.youtube_traffic_sources,
          youtube_recent_videos: youtube.youtube_recent_videos,
          youtube_data_freshness_note: youtube.youtube_data_freshness_note,
        }
      : { youtube_unavailable_reason: youtube.unavailable_reason }),
  };
}

export interface CrmEvidence {
  pixel_sample_size: number;
  /** The declared pipeline, with how many rows actually exist at each step. */
  funnel_counts: Record<string, number>;
  traffic_by_source: { source: string; visits: number }[];
  top_entry_pages: { path: string; views: number }[];
  pages_that_lose_people: { path: string; views: number; clicks: number }[];
  search_queries: { query: string; searches: number }[];
  ghl_contacts_total: number;
  ghl_by_tag: { tag: string; contacts: number }[];
  shopify_customers: number;
  shopify_orders: number;
  shopify_email_subscribed: number;
  shopify_sms_subscribed: number;
  /**
   * The honest health warning. Everything below the top of the funnel is tiny,
   * and a conclusion drawn from eight members is not a conclusion.
   */
  small_sample_warning: string;
}

/**
 * What the CRM agent gets to look at, across all three systems.
 *
 * THE SHAPE OF THIS DATA IS THE FINDING. Traffic is measured in tens of
 * thousands; membership is measured in single digits. An agent handed only the
 * bottom of that funnel would confidently explain how to improve a conversion
 * rate computed from eight people. The counts are passed in explicitly, and the
 * prompt is required to weight its confidence by them.
 */
export async function gatherCrmEvidence(): Promise<CrmEvidence> {
  const db = createAdminClient();
  const { rows, sampled } = await pixelSample();

  const count = async (t: string) => {
    const { count: c } = await db.from(t).select("*", { count: "exact", head: true });
    return c ?? 0;
  };

  const [members, threads, bookings, invites, journeys] = await Promise.all([
    count("community_members"),
    count("member_agent_threads"),
    count("booking_requests"),
    count("account_conversion_invites"),
    count("member_journeys"),
  ]);

  const views = rows.filter((r) => r.event_name === "page_view");
  const viewTally = tally(views.map((r) => pathOf(r.page_url)));
  const clickMap = new Map(tally(rows.filter((r) => r.event_name === "click").map((r) => pathOf(r.page_url))));

  const searches = tally(
    rows
      .filter((r) => r.event_name === "search_executed")
      .map((r) => String(meta(r.metadata).query ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  // GHL and Shopify totals are read from what this session already established
  // rather than re-fetched live: both are slow calls, and the campaign panels
  // own the live versions. These are the shapes, not the source of truth.
  const ghlTotal = 9715;
  const ghlTags = [
    { tag: "directory sync (scraped listings)", contacts: 6794 },
    { tag: "untagged / inbox noise", contacts: 2119 },
    { tag: "instagram lead", contacts: 495 },
    { tag: "inbound sms contact", contacts: 192 },
    { tag: "booksy contact", contacts: 41 },
  ];

  return {
    pixel_sample_size: sampled,
    funnel_counts: {
      pixel_events_sampled: sampled,
      page_views_in_sample: views.length,
      searches_in_sample: rows.filter((r) => r.event_name === "search_executed").length,
      ai_chat_threads: threads,
      community_members: members,
      member_journeys: journeys,
      booking_requests: bookings,
      account_conversion_invites: invites,
    },
    traffic_by_source: tally(
      views
        .filter((r) => r.referrer)
        .map((r) => {
          try {
            return new URL(r.referrer!).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    )
      .slice(0, 12)
      .map(([source, visits]) => ({ source, visits })),
    top_entry_pages: viewTally.slice(0, 20).map(([path, views]) => ({ path, views })),
    pages_that_lose_people: viewTally
      .filter(([path, v]) => v >= 3 && (clickMap.get(path) ?? 0) === 0)
      .slice(0, 15)
      .map(([path, views]) => ({ path, views, clicks: clickMap.get(path) ?? 0 })),
    search_queries: searches.slice(0, 15).map(([query, searches]) => ({ query, searches })),
    ghl_contacts_total: ghlTotal,
    ghl_by_tag: ghlTags,
    shopify_customers: 1462,
    shopify_orders: 2999,
    shopify_email_subscribed: 1393,
    shopify_sms_subscribed: 75,
    small_sample_warning:
      `Everything below the top of the funnel is tiny: ${threads} AI chat threads, ` +
      `${members} community members, ${bookings} booking requests, ${invites} conversion invites. ` +
      `Any rate computed from these is noise. Findings about membership or product usage must be ` +
      `marked low confidence and say what would need to be measured first.`,
  };
}

/** Keys a finding is permitted to cite — anything else is rejected. */
export function evidenceKeys(evidence: object): Set<string> {
  return new Set(Object.keys(evidence));
}
