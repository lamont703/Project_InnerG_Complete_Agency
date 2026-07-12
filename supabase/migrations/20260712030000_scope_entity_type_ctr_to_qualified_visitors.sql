-- CTR By Entity Type's denominator now only counts page visits from
-- Qualified Visitors — same rule already used for that card and for
-- Category Views (at least one non-page_view event, or a session spanning
-- more than 1 second), not a separately-invented definition. A visitor's
-- qualification is judged on their whole site-wide session (any page,
-- any event), not just their activity on entity pages — same precedent
-- set by 20260710110000's Category Views scoping. The outbound-click
-- numerator is filtered too for symmetry, though it's a no-op in
-- practice: any click is itself a non-page_view event, so a visitor who
-- clicked a CTA is already qualified by definition.
CREATE OR REPLACE FUNCTION get_entity_type_ctr(p_cutoff timestamptz DEFAULT NULL)
RETURNS TABLE (
  entity_type text,
  visits bigint,
  outbound_clicks bigint,
  ctr numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_reset_at timestamptz;
  v_effective_cutoff timestamptz;
BEGIN
  SELECT reset_at INTO v_reset_at FROM pixel_analytics_settings WHERE id = true;
  v_effective_cutoff := GREATEST(p_cutoff, v_reset_at);

  RETURN QUERY
  WITH qualified_visitors AS (
    SELECT visitor_id
    FROM pixel_events
    WHERE page_url ILIKE '%innergcomplete.com%'
      AND visitor_id IS NOT NULL
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
    GROUP BY visitor_id
    HAVING
      COUNT(*) FILTER (WHERE event_name != 'page_view') > 0
      OR (MAX(created_at) - MIN(created_at)) > INTERVAL '1 second'
  ),
  profile_views AS (
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
      AND visitor_id IN (SELECT visitor_id FROM qualified_visitors)
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
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
      AND visitor_id IN (SELECT visitor_id FROM qualified_visitors)
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
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
END;
$$;
