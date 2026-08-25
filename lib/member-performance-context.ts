import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_LISTING_BY_CLAIM_KEY,
  fetchListingLeadReport,
  summarizeLeads,
} from "@/lib/account/listing-leads";
import { aggregateCampaigns, ctrLabel, PLACEMENT_LABELS, type AdCampaign } from "@/lib/ad-campaigns";

/**
 * A member's own numbers: their listing traffic, their booking requests, and
 * their ad placements.
 *
 * WHY THE AGENT COULD NOT ANSWER BEFORE. Three pages hold this — Listing
 * Insights at /account/leads, /account/booking-requests and
 * /account/ad-performance — and none of it reached the model. An owner asking
 * "how is my listing doing" got a general answer about the directory, which is
 * the least useful moment to be generic: it is the one question only we can
 * answer for them.
 *
 * SCOPED BY memberId, NOT BY THE SESSION. The equivalent page helpers resolve
 * the member from cookies, which is right for a page and wrong here — the chat
 * route has already worked out who it is talking to, including when an admin is
 * viewing as somebody else, and re-deriving it from the session would quietly
 * hand back the admin's own figures.
 *
 * SUMMARISED, NOT DUMPED. Twelve months of rows and two hundred booking
 * requests would crowd out everything else in the prompt for numbers the model
 * cannot use directly. It gets totals, a recent window, a direction of travel,
 * and the few most recent requests — enough to answer and to notice a trend.
 */

export interface MemberPerformanceContext {
  listing: { name: string; profile_url: string } | null;
  /**
   * The CURRENT Google Business Profile audit score, read from the newest
   * stored snapshot — the same number the audit page renders.
   *
   * This exists because the agent was answering "how is my Google profile
   * doing" with 75 while the UI showed 88. It had no live figure, so it took
   * one out of a monitoring EMAIL sitting in memory from 1 August, whose first
   * seventy characters read "...INNER G COMPLETE AGENCY Score 75 (+". A number
   * that appears in a stale notification is not a fact about today, and
   * without a real one to hand the model will find something that looks like
   * one.
   */
  gbp_audit: {
    score: number;
    grade: string;
    measured_at: string;
    previous_score: number | null;
    page_url: string;
  } | null;
  listing_insights: {
    months_covered: number;
    visits_total: number;
    visits_last_month: number;
    visits_previous_month: number;
    direction: "up" | "down" | "flat" | "not_enough_history";
    book_appointment_clicks_total: number;
    directions_clicks_total: number;
    page_url: string;
  } | null;
  booking_requests: {
    total: number;
    by_status: Record<string, number>;
    last_30_days: number;
    /** Only what an owner needs to recognise a request — no phone or email. */
    most_recent: { date: string | null; service: string | null; status: string }[];
    page_url: string;
  } | null;
  ads: {
    campaigns: { name: string; placement: string; status: string; impressions: number; clicks: number; ctr: string }[];
    impressions_total: number;
    clicks_total: number;
    ctr: string;
    page_url: string;
  } | null;
}

export async function memberPerformanceContext(
  memberId: string | null | undefined,
  userId?: string | null
): Promise<MemberPerformanceContext | null> {
  if (!memberId) return null;

  try {
    const db = createAdminClient();

    const { data: link } = await (db.from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .eq("community_member_id", memberId)
      .maybeSingle();

    /*
     * Read from the snapshot table rather than re-running the audit. Running it
     * costs Google API calls on a page the member is waiting on, and the stored
     * snapshot is by definition the number they were last shown — which is the
     * one they will quote back.
     */
    let gbpAudit: MemberPerformanceContext["gbp_audit"] = null;
    {
      const { data: snaps } = await (db.from("gbp_audit_snapshots") as any)
        .select("score, grade, created_at")
        .eq("community_member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(2);
      if (snaps?.length) {
        gbpAudit = {
          score: snaps[0].score,
          grade: snaps[0].grade,
          measured_at: snaps[0].created_at,
          previous_score: snaps.length > 1 ? snaps[1].score : null,
          page_url: "/account/gbp-audit",
        };
      }
    }

    let listing: MemberPerformanceContext["listing"] = null;
    let insights: MemberPerformanceContext["listing_insights"] = null;
    let bookings: MemberPerformanceContext["booking_requests"] = null;

    if (link) {
      const cfg = LEAD_LISTING_BY_CLAIM_KEY[link.entity_type];
      if (cfg) {
        const { data: row } = await (db.from(cfg.table) as any)
          .select(`${cfg.nameCol}, slug`)
          .eq("id", link.entity_id)
          .maybeSingle();

        if (row?.slug) {
          listing = { name: row[cfg.nameCol], profile_url: `/${cfg.route}/${row.slug}` };

          const series = await fetchListingLeadReport(cfg.route, row.slug, 12);
          if (series.length) {
            const s = summarizeLeads(series);
            const last = series[series.length - 1];
            const prev = series.length > 1 ? series[series.length - 2] : null;
            /*
             * Direction is computed here rather than left to the model. Asked to
             * compare two numbers it will usually get it right and occasionally
             * will not, and "your traffic is up" said wrongly about somebody's
             * own business is the kind of error that ends trust in every other
             * number on the page.
             */
            const direction = !prev
              ? "not_enough_history"
              : last.visits > prev.visits * 1.05
                ? "up"
                : last.visits < prev.visits * 0.95
                  ? "down"
                  : "flat";
            insights = {
              months_covered: series.length,
              visits_total: (s as any).visits ?? series.reduce((a, m) => a + m.visits, 0),
              visits_last_month: last.visits,
              visits_previous_month: prev?.visits ?? 0,
              direction,
              book_appointment_clicks_total: series.reduce((a, m) => a + m.bookAppointmentClicks, 0),
              directions_clicks_total: series.reduce((a, m) => a + m.directionsClicks, 0),
              page_url: "/account/leads",
            };
          }
        }

        const { data: reqs } = await (db.from("booking_requests") as any)
          .select("requested_date, service_name, status, created_at")
          .eq("entity_type", link.entity_type)
          .eq("entity_id", link.entity_id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (reqs?.length) {
          const byStatus: Record<string, number> = {};
          for (const r of reqs) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
          const cutoff = Date.now() - 30 * 86400_000;
          bookings = {
            total: reqs.length,
            by_status: byStatus,
            last_30_days: reqs.filter((r: any) => new Date(r.created_at).getTime() > cutoff).length,
            most_recent: reqs.slice(0, 3).map((r: any) => ({
              date: r.requested_date ?? null,
              service: r.service_name ?? null,
              status: r.status,
            })),
            page_url: "/account/booking-requests",
          };
        }
      }
    }

    /*
     * Ads hang off the auth user, not the member row — that is how
     * /account/ad-performance scopes them, and the two must agree or the chat
     * would quote a different number from the page it points at.
     */
    let ads: MemberPerformanceContext["ads"] = null;
    if (userId) {
      const { data: campaigns } = await (db.from("ad_campaigns") as any)
        .select("id, user_id, name, placement, creative, scope, target_states, target_cities, status, start_date, end_date")
        .eq("user_id", userId);

      if (campaigns?.length) {
        const { data: events } = await (db.from("pixel_events") as any)
          .select("event_name, metadata")
          .in("event_name", ["ad_impression", "ad_click"])
          .limit(20000);

        const perf = aggregateCampaigns(campaigns as AdCampaign[], (events ?? []) as any);
        const impressions = perf.reduce((a, p) => a + p.impressions, 0);
        const clicks = perf.reduce((a, p) => a + p.clicks, 0);
        ads = {
          campaigns: perf.map((p: any) => ({
            name: p.name,
            placement: (PLACEMENT_LABELS as any)[p.placement] ?? p.placement,
            status: p.status,
            impressions: p.impressions,
            clicks: p.clicks,
            ctr: ctrLabel(p.clicks, p.impressions),
          })),
          impressions_total: impressions,
          clicks_total: clicks,
          ctr: ctrLabel(clicks, impressions),
          page_url: "/account/ad-performance",
        };
      }
    }

    if (!listing && !insights && !bookings && !ads && !gbpAudit) return null;
    return { listing, gbp_audit: gbpAudit, listing_insights: insights, booking_requests: bookings, ads };
  } catch (err) {
    console.error("[member-performance] failed:", err);
    return null;
  }
}
