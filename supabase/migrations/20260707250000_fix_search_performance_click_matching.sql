-- Two real bugs found via live testing with a real shop:
--
-- 1. Fan-out duplication: clicks was grouped by raw href, but the same
--    entity_id can appear in multiple distinct hrefs (different domains —
--    agency.innergcomplete.com vs innergcomplete.com — confirmed 3 distinct
--    hrefs for one shop). The ILIKE join then matched the same
--    impression_agg row against every one of them, producing duplicate
--    output rows with different partial click counts each.
-- 2. False-positive matching: a bare "contains this ID anywhere" match
--    also matched the ecosystemShopId query param on links back to the
--    search page itself (e.g. "?ecosystemShopId={id}") — not a real
--    click-through to the profile at all, since ecosystemShopId never
--    appears with the entity's actual /shop/{id} path.
--
-- Fixed by joining raw click events directly against each impression_agg
-- row (grouping by entity_id+result_type collapses any number of matching
-- href variants into one row) and requiring the ID appear specifically as
-- a /{type-path}/{id} segment, not just anywhere in the URL.
--
-- Also added the same reset_at floor every other pixel-analytics metric
-- on this dashboard already respects, so this table doesn't show
-- pre-reset historical data while everything else on the page does.
CREATE OR REPLACE FUNCTION get_search_performance_by_entity(
  p_cutoff timestamptz DEFAULT NULL,
  p_result_type text DEFAULT NULL,
  p_min_impressions int DEFAULT 3,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  entity_id text,
  result_type text,
  impressions bigint,
  avg_position numeric,
  clicks bigint,
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
  WITH impressions AS (
    SELECT
      r->>'entityId' AS entity_id,
      r->>'resultType' AS result_type,
      (r->>'position')::numeric AS position
    FROM pixel_events, jsonb_array_elements(metadata->'results') AS r
    WHERE event_name = 'search_impression'
      AND page_url ILIKE '%innergcomplete.com%'
      AND (v_effective_cutoff IS NULL OR created_at >= v_effective_cutoff)
      AND r->>'entityId' IS NOT NULL
  ),
  impression_agg AS (
    SELECT
      i.entity_id,
      i.result_type,
      COUNT(*) AS impressions,
      AVG(i.position) AS avg_position
    FROM impressions i
    WHERE (p_result_type IS NULL OR i.result_type = p_result_type)
    GROUP BY i.entity_id, i.result_type
  ),
  clicks AS (
    SELECT
      ia.entity_id,
      ia.result_type,
      COUNT(*) AS clicks
    FROM impression_agg ia
    JOIN pixel_events pe
      ON pe.event_name = 'click'
      AND pe.page_url ILIKE '%/tools/barbershop-search%'
      AND pe.page_url ILIKE '%innergcomplete.com%'
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
      AND pe.metadata->>'href' ILIKE '%/' || (
        CASE ia.result_type
          WHEN 'shop' THEN 'shop'
          WHEN 'salon' THEN 'salons'
          WHEN 'barber' THEN 'barbers'
          WHEN 'cosmetologist' THEN 'cosmetologists'
          WHEN 'school' THEN 'schools'
          WHEN 'store' THEN 'stores'
          ELSE 'no_such_path_never_matches'
        END
      ) || '/' || ia.entity_id || '%'
    GROUP BY ia.entity_id, ia.result_type
  )
  SELECT
    ia.entity_id,
    ia.result_type,
    ia.impressions,
    ROUND(ia.avg_position, 2) AS avg_position,
    COALESCE(c.clicks, 0) AS clicks,
    CASE WHEN ia.impressions > 0
      THEN ROUND(COALESCE(c.clicks, 0)::numeric / ia.impressions * 100, 1)
      ELSE 0
    END AS ctr
  FROM impression_agg ia
  LEFT JOIN clicks c ON c.entity_id = ia.entity_id AND c.result_type = ia.result_type
  WHERE ia.impressions >= p_min_impressions
  ORDER BY ctr DESC, ia.impressions DESC
  LIMIT p_limit;
END;
$$;
