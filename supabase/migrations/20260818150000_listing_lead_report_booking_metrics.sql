-- Listing Insights, measuring what a listing is actually FOR.
--
-- The three replaced metrics were the ones a directory shows when it has
-- nothing better: click-to-call, website clicks, email inquiries. Two of them
-- measured a visitor leaving, and the third measured almost nothing — 1 mailto
-- click across the entire history of the table.
--
-- The three replacing them are the booking funnel, end to end:
--   book_appointment_clicks  someone opened the booking modal
--   booking_requests         someone completed it — a named person, a phone
--                            number and a time they intend to show up
--   directions_clicks        someone worked out how to get there
--
-- TWO BUGS FIXED ON THE WAY, both of which made the old numbers wrong rather
-- than merely uninteresting:
--
-- 1. `page_url ILIKE '%innergcomplete.com%'` EXCLUDED shearquery.com. The site
--    has been migrating to that domain for weeks and it now carries roughly a
--    third of real traffic, none of which appeared in any owner's insights.
--
-- 2. "Website Clicks" counted every outbound_lead that was not tel: or mailto:.
--    Measured against live data that bucket is 204 real website clicks, 50
--    directions clicks, and 498 events with NO href at all — buttons that
--    happen to carry the same marker. Two thirds of the number was not website
--    clicks.
--
-- DIRECTIONS ARE MATCHED ON THE HREF, not on a new marker. Every entity page
-- builds it as https://www.google.com/maps?q=<lat>,<lng> in our own code, so
-- the pattern is reliable and — unlike a new data-ig-click — it counts the 50
-- clicks that already happened instead of starting from zero today.
--
-- BOOKING REQUESTS COME FROM THE TABLE, NOT THE PIXEL. A pixel event says a
-- form was submitted; booking_requests says one WAS. They can disagree — an ad
-- blocker drops the beacon, a retry double-counts it — and on the one metric an
-- owner would act on, the row that generated a text message is the truth.
-- DROPPED FIRST because the return type changes, and Postgres refuses that on
-- CREATE OR REPLACE ("cannot change return type of existing function"). The
-- signature is unchanged, so the drop targets it precisely rather than by name.
DROP FUNCTION IF EXISTS get_listing_lead_report(text, text, timestamptz);

CREATE FUNCTION get_listing_lead_report(
  p_route text,
  p_slug text,
  p_cutoff timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month date,
  visits bigint,
  unique_visitors bigint,
  book_appointment_clicks bigint,
  booking_requests bigint,
  directions_clicks bigint,
  total_leads bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT event_name, visitor_id, created_at, metadata
    FROM pixel_events
    -- Both domains. The migration is in progress and an owner's numbers must
    -- not depend on which one a visitor happened to land on.
    WHERE (page_url ILIKE '%innergcomplete.com%' OR page_url ILIKE '%shearquery.com%')
      -- Dev traffic is not a lead. localhost and staging rows are in this table
      -- in volume and would otherwise land in a business owner's report.
      AND page_url NOT ILIKE '%localhost%'
      AND page_url NOT ILIKE '%staging.%'
      AND page_url ~* ('/' || p_route || '/' || p_slug || '([/?#]|$)')
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
  ),
  pix AS (
    SELECT
      date_trunc('month', created_at)::date AS month,
      COUNT(*) FILTER (WHERE event_name = 'page_view') AS visits,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view') AS unique_visitors,
      -- Both entry points: the button on the page and the one in the scroll
      -- banner. To an owner they are the same intent.
      COUNT(*) FILTER (
        WHERE event_name = 'click'
          AND metadata->>'ig_click' IN ('book_appointment', 'book_appointment_banner')
      ) AS book_appointment_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'click'
          AND metadata->>'ig_click' = 'outbound_lead'
          AND metadata->>'href' ~* 'google\.[a-z.]+/maps|maps\.google|/maps/dir'
      ) AS directions_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
      ) AS total_leads
    FROM ev
    GROUP BY 1
  ),
  bookings AS (
    SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS booking_requests
    FROM booking_requests
    WHERE entity_slug = p_slug
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
    GROUP BY 1
  )
  -- FULL JOIN so a month with a booking request but no pixel activity still
  -- appears. An ad blocker can suppress every beacon on a visit that still
  -- ended in a real request, and dropping that month would hide the single
  -- most valuable thing this report has to say.
  SELECT
    COALESCE(p.month, b.month) AS month,
    COALESCE(p.visits, 0),
    COALESCE(p.unique_visitors, 0),
    COALESCE(p.book_appointment_clicks, 0),
    COALESCE(b.booking_requests, 0),
    COALESCE(p.directions_clicks, 0),
    COALESCE(p.total_leads, 0)
  FROM pix p
  FULL JOIN bookings b ON b.month = p.month
  ORDER BY 1;
$$;
