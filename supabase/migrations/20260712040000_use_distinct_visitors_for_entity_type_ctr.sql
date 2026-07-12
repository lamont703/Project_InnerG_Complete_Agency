-- CTR By Entity Type's "visits" was counting raw page_view events, which
-- matches the smaller "X views" number under each category in Visitors
-- by Page Category, not the bold top number (COUNT(DISTINCT visitor_id) —
-- confirmed against get_pixel_analytics_summary's category_views query).
-- Switching both sides to distinct visitors: visits = distinct qualified
-- visitors who viewed a page of that type, outbound_clicks = distinct
-- qualified visitors who clicked a tagged CTA on that type. This also
-- makes the ratio a real "% of people who clicked" rate bounded at
-- 100%, rather than a raw click-event count that could exceed the visit
-- count if the same visitor clicked more than once.
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
    SELECT pe.visitor_id
    FROM pixel_events pe
    WHERE pe.page_url ILIKE '%innergcomplete.com%'
      AND pe.visitor_id IS NOT NULL
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
    GROUP BY pe.visitor_id
    HAVING
      COUNT(*) FILTER (WHERE pe.event_name != 'page_view') > 0
      OR (MAX(pe.created_at) - MIN(pe.created_at)) > INTERVAL '1 second'
  ),
  profile_views AS (
    SELECT
      CASE
        WHEN pe.page_url ~ '/salons/' THEN 'salon'
        WHEN pe.page_url ~ '/schools/' THEN 'school'
        WHEN pe.page_url ~ '/barbers/' THEN 'barber'
        WHEN pe.page_url ~ '/shop/' THEN 'shop'
        WHEN pe.page_url ~ '/stores/' THEN 'store'
        WHEN pe.page_url ~ '/cosmetologists/' THEN 'cosmetologist'
        WHEN pe.page_url ~ '/events/' THEN 'event'
      END AS etype,
      pe.visitor_id
    FROM pixel_events pe
    WHERE pe.event_name = 'page_view'
      AND pe.page_url ILIKE '%innergcomplete.com%'
      AND pe.page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND pe.visitor_id IN (SELECT qv.visitor_id FROM qualified_visitors qv)
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
  ),
  visit_agg AS (
    SELECT pv.etype, COUNT(DISTINCT pv.visitor_id) AS visit_count
    FROM profile_views pv
    WHERE pv.etype IS NOT NULL
    GROUP BY pv.etype
  ),
  outbound_agg AS (
    SELECT
      CASE
        WHEN pe.page_url ~ '/salons/' THEN 'salon'
        WHEN pe.page_url ~ '/schools/' THEN 'school'
        WHEN pe.page_url ~ '/barbers/' THEN 'barber'
        WHEN pe.page_url ~ '/shop/' THEN 'shop'
        WHEN pe.page_url ~ '/stores/' THEN 'store'
        WHEN pe.page_url ~ '/cosmetologists/' THEN 'cosmetologist'
        WHEN pe.page_url ~ '/events/' THEN 'event'
      END AS etype,
      COUNT(DISTINCT pe.visitor_id) AS click_count
    FROM pixel_events pe
    WHERE pe.event_name = 'click'
      AND pe.metadata->>'ig_click' = 'outbound_lead'
      AND pe.page_url ILIKE '%innergcomplete.com%'
      AND pe.page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND pe.visitor_id IN (SELECT qv.visitor_id FROM qualified_visitors qv)
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
    GROUP BY 1
  )
  SELECT
    va.etype,
    va.visit_count,
    COALESCE(oa.click_count, 0),
    CASE WHEN va.visit_count > 0
      THEN ROUND(COALESCE(oa.click_count, 0)::numeric / va.visit_count * 100, 2)
      ELSE 0
    END
  FROM visit_agg va
  LEFT JOIN outbound_agg oa ON oa.etype = va.etype
  ORDER BY va.visit_count DESC;
END;
$$;
