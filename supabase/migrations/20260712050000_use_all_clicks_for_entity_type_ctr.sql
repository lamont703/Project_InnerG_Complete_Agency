-- Swaps the CTR numerator from a curated outbound_lead-tagged, distinct-
-- visitor count to the same raw click count the "View Clicks" drill-down
-- on Visitors by Page Category already shows (get_category_click_breakdown:
-- every 'click' event on that category's pages, no ig_click filter, no
-- qualified-visitor restriction) — starting broad on purpose; narrowing
-- to "which of these clicks actually matter" is a deliberate later step,
-- not done here. The visits denominator is untouched (still distinct
-- qualified visitors, matching the bold number in Visitors by Page
-- Category — a separate, already-settled decision).
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
  -- Deliberately unscoped, matching get_category_click_breakdown exactly:
  -- every click on the page, no ig_click filter, no qualified-visitor
  -- restriction.
  click_agg AS (
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
      COUNT(*) AS click_count
    FROM pixel_events pe
    WHERE pe.event_name = 'click'
      AND pe.page_url ILIKE '%innergcomplete.com%'
      AND pe.page_url ~ '/(salons|schools|barbers|shop|stores|cosmetologists|events)/[^/?#]+'
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
    GROUP BY 1
  )
  SELECT
    va.etype,
    va.visit_count,
    COALESCE(ca.click_count, 0),
    CASE WHEN va.visit_count > 0
      THEN ROUND(COALESCE(ca.click_count, 0)::numeric / va.visit_count * 100, 2)
      ELSE 0
    END
  FROM visit_agg va
  LEFT JOIN click_agg ca ON ca.etype = va.etype
  ORDER BY va.visit_count DESC;
END;
$$;
