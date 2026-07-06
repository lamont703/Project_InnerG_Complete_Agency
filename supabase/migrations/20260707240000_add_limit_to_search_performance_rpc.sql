-- Add p_limit so the pixel-analytics dashboard can pull a clean "top N"
-- directly from the RPC, matching how every other table there (topPages,
-- topReferrers, etc.) already caps at LIMIT 10 inside the SQL rather than
-- fetching everything and slicing client-side.
--
-- CREATE OR REPLACE with a different parameter list doesn't replace the
-- old function — Postgres treats a different signature as a distinct
-- overload, so both versions would coexist and any call using named
-- arguments that could match either becomes ambiguous (confirmed: this
-- broke the very first call after deploying without the DROP below).
DROP FUNCTION IF EXISTS get_search_performance_by_entity(timestamptz, text, int);

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
LANGUAGE sql
STABLE
AS $$
  WITH impressions AS (
    SELECT
      r->>'entityId' AS entity_id,
      r->>'resultType' AS result_type,
      (r->>'position')::numeric AS position
    FROM pixel_events, jsonb_array_elements(metadata->'results') AS r
    WHERE event_name = 'search_impression'
      AND page_url ILIKE '%innergcomplete.com%'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
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
      metadata->>'href' AS href,
      COUNT(*) AS clicks
    FROM pixel_events
    WHERE event_name = 'click'
      AND page_url ILIKE '%/tools/barbershop-search%'
      AND page_url ILIKE '%innergcomplete.com%'
      AND (p_cutoff IS NULL OR created_at >= p_cutoff)
      AND metadata->>'href' IS NOT NULL
    GROUP BY 1
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
  LEFT JOIN clicks c ON c.href ILIKE '%' || ia.entity_id || '%'
  WHERE ia.impressions >= p_min_impressions
  ORDER BY ctr DESC, ia.impressions DESC
  LIMIT p_limit;
$$;
