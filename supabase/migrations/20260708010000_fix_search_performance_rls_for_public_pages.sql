-- Profile pages (app/shop/[id]/page.tsx) call this RPC with the anon key
-- since they're public, unauthenticated pages — but pixel_events has RLS
-- that only allows service_role to read it, and a plain (non-DEFINER)
-- function runs with the CALLER's permissions. That silently filtered out
-- every row for anon callers (no error — RLS just returns 0 rows), which
-- only surfaced now because every earlier test used the service role key,
-- masking it. SECURITY DEFINER runs the function as its owner instead,
-- bypassing RLS for this one aggregate query while still only exposing
-- the aggregated impressions/position/clicks/ctr fields it returns — not
-- raw pixel_events rows.
CREATE OR REPLACE FUNCTION get_search_performance_by_entity(
  p_cutoff timestamptz DEFAULT NULL,
  p_result_type text DEFAULT NULL,
  p_min_impressions int DEFAULT 3,
  p_limit int DEFAULT 10,
  p_entity_id text DEFAULT NULL
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
SECURITY DEFINER
SET search_path = public
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
      AND (p_entity_id IS NULL OR i.entity_id = p_entity_id)
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
  WHERE (p_entity_id IS NOT NULL OR ia.impressions >= p_min_impressions)
  ORDER BY ctr DESC, ia.impressions DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_search_performance_by_entity(timestamptz, text, int, int, text) TO anon, authenticated;
