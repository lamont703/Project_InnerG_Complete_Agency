-- Per-listing "Leads we sent you" report — the owner-facing (and cold-outreach)
-- companion to get_entity_profile_engagement. That RPC ranks ALL listings for
-- an internal leaderboard; this one returns the monthly lead time-series for a
-- SINGLE listing, identified by its route prefix + slug.
--
-- Attribution, like get_entity_profile_engagement, is by page_url (pixel_events
-- carry no entity_id — the slug-keyed URL path is the only signal). A "lead" is:
--   * a page_view on the profile URL                -> a profile visit
--   * a click with metadata.ig_click = 'outbound_lead' -> a lead action,
--     split into call / email / website by the click's href
--       (tel: -> call, mailto: -> email, anything else -> website/directions).
--
-- p_route is the URL segment (shop | salons | schools | barbers | stores |
-- cosmetologists | events). p_slug is the listing slug. Both are resolved
-- server-side from the DB, never from client input, and slugs are constrained
-- to [a-z0-9-], so interpolating p_slug into the boundary regex is safe.
--
-- SECURITY DEFINER so it can read pixel_events (service-role-only RLS) when
-- called by an authenticated owner for their own listing; the caller resolves
-- ownership before invoking it.
CREATE OR REPLACE FUNCTION get_listing_lead_report(
  p_route text,
  p_slug text,
  p_cutoff timestamptz DEFAULT NULL
)
RETURNS TABLE (
  month date,
  visits bigint,
  unique_visitors bigint,
  call_clicks bigint,
  website_clicks bigint,
  email_clicks bigint,
  total_leads bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT event_name, visitor_id, created_at, metadata
    FROM pixel_events
    WHERE page_url ILIKE '%innergcomplete.com%'
      AND page_url ~* ('/' || p_route || '/' || p_slug || '([/?#]|$)')
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
  )
  SELECT
    date_trunc('month', created_at)::date AS month,
    COUNT(*) FILTER (WHERE event_name = 'page_view') AS visits,
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view') AS unique_visitors,
    COUNT(*) FILTER (
      WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
        AND metadata->>'href' ILIKE 'tel:%'
    ) AS call_clicks,
    COUNT(*) FILTER (
      WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
        AND COALESCE(metadata->>'href', '') NOT ILIKE 'tel:%'
        AND COALESCE(metadata->>'href', '') NOT ILIKE 'mailto:%'
    ) AS website_clicks,
    COUNT(*) FILTER (
      WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
        AND metadata->>'href' ILIKE 'mailto:%'
    ) AS email_clicks,
    COUNT(*) FILTER (
      WHERE event_name = 'click' AND metadata->>'ig_click' = 'outbound_lead'
    ) AS total_leads
  FROM base
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_listing_lead_report(text, text, timestamptz) TO service_role, authenticated;
