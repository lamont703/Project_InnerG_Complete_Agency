-- Powers a drill-down popup on the "Visitors by Page Category" section:
-- clicking a category shows which buttons/links are actually being clicked
-- on that category's pages, and how many times. Reuses the exact same
-- category path-prefix mapping as categoryViews (get_pixel_analytics_summary)
-- so the two features never disagree about which pages belong to which
-- category, and respects the same reset_at point every other metric on
-- this page already honors. Groups by the raw (element_name, element_type)
-- pair here — final normalization of per-entity button labels (e.g.
-- "REQUEST A SHOP DAY AT MIRIAM J BEAUTY SALON" -> "REQUEST A SHOP DAY")
-- happens client-side, since that's easier to express and iterate on in
-- JS than in SQL.
CREATE OR REPLACE FUNCTION get_category_click_breakdown(p_category text, p_cutoff timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_at timestamptz;
  v_effective_cutoff timestamptz;
  v_result jsonb;
BEGIN
  SELECT reset_at INTO v_reset_at FROM pixel_analytics_settings WHERE id = true;
  v_effective_cutoff := GREATEST(p_cutoff, v_reset_at);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('element_name', element_name, 'element_type', element_type, 'count', cnt)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT element_name, element_type, COUNT(*) as cnt
    FROM (
      SELECT
        element_name,
        element_type,
        SPLIT_PART(
          CASE
            WHEN page_url ILIKE '%innergcomplete.com%' THEN SPLIT_PART(page_url, 'innergcomplete.com', 2)
            ELSE page_url
          END,
          '?', 1
        ) AS clean_url
      FROM pixel_events
      WHERE event_name = 'click'
        AND page_url ILIKE '%innergcomplete.com%'
        AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
    ) base
    WHERE
      CASE p_category
        WHEN 'Shops' THEN clean_url LIKE '/shop/%'
        WHEN 'Salons' THEN clean_url LIKE '/salons/%'
        WHEN 'Barbers' THEN clean_url LIKE '/barbers/%'
        WHEN 'Cosmetologists' THEN clean_url LIKE '/cosmetologists/%'
        WHEN 'Schools' THEN clean_url LIKE '/schools/%'
        WHEN 'Stores' THEN clean_url LIKE '/stores/%'
        WHEN 'Events' THEN clean_url LIKE '/events%'
        WHEN 'Insights' THEN clean_url LIKE '/insights%'
        WHEN 'Tools' THEN clean_url LIKE '/tools/%'
        ELSE false
      END
    GROUP BY element_name, element_type
    ORDER BY cnt DESC
    LIMIT 200
  ) agg;

  RETURN v_result;
END;
$$;
