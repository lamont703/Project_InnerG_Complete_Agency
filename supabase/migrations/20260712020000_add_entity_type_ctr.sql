-- Aggregate CTR per entity type (not per individual entity — see
-- get_entity_profile_engagement for that) — collectively across all
-- salons pages, all schools pages, etc. CTR here means "clicked one of
-- the tagged CTA buttons" (Call/Email/Website/Get Tickets — the
-- data-ig-click="outbound_lead" tagging already on every entity type's
-- profile page) divided by total page visits, distinct from mere
-- scrolling/reading. First pass, aggregate-only, matching the outbound-
-- lead click set already instrumented; per-button-type breakdown is a
-- deliberate follow-up, not in scope yet.
CREATE OR REPLACE FUNCTION get_entity_type_ctr(p_cutoff timestamptz DEFAULT NULL)
RETURNS TABLE (
  entity_type text,
  visits bigint,
  outbound_clicks bigint,
  ctr numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH profile_views AS (
    SELECT
      CASE
        WHEN page_url ~ '/salons/' THEN 'salon'
        WHEN page_url ~ '/schools/' THEN 'school'
        WHEN page_url ~ '/barbers/' THEN 'barber'
        WHEN page_url ~ '/shop/' THEN 'shop'
        WHEN page_url ~ '/stores/' THEN 'store'
        WHEN page_url ~ '/cosmetologists/' THEN 'cosmetologist'
        WHEN page_url ~ '/events/' THEN 'event'
      END AS entity_type
    FROM pixel_events
    WHERE event_name = 'page_view'
      AND page_url ILIKE '%innergcomplete.com%'
      AND page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
  ),
  visit_agg AS (
    SELECT entity_type, COUNT(*) AS visits
    FROM profile_views
    WHERE entity_type IS NOT NULL
    GROUP BY entity_type
  ),
  outbound_agg AS (
    SELECT
      CASE
        WHEN page_url ~ '/salons/' THEN 'salon'
        WHEN page_url ~ '/schools/' THEN 'school'
        WHEN page_url ~ '/barbers/' THEN 'barber'
        WHEN page_url ~ '/shop/' THEN 'shop'
        WHEN page_url ~ '/stores/' THEN 'store'
        WHEN page_url ~ '/cosmetologists/' THEN 'cosmetologist'
        WHEN page_url ~ '/events/' THEN 'event'
      END AS entity_type,
      COUNT(*) AS outbound_clicks
    FROM pixel_events
    WHERE event_name = 'click'
      AND metadata->>'ig_click' = 'outbound_lead'
      AND page_url ILIKE '%innergcomplete.com%'
      AND page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
    GROUP BY 1
  )
  SELECT
    v.entity_type,
    v.visits,
    COALESCE(o.outbound_clicks, 0) AS outbound_clicks,
    CASE WHEN v.visits > 0
      THEN ROUND(COALESCE(o.outbound_clicks, 0)::numeric / v.visits * 100, 2)
      ELSE 0
    END AS ctr
  FROM visit_agg v
  LEFT JOIN outbound_agg o ON o.entity_type = v.entity_type
  ORDER BY v.visits DESC;
$$;
