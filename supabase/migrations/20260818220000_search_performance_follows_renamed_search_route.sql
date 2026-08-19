-- The search engine moved from /tools/barbershop-search to /search.
--
-- This RPC reconstructs click-throughs by matching 'click' pixel events that
-- happened ON the search page, so it hardcodes that page's path. Left alone,
-- every click recorded after the rename would land on /search, fail the
-- ILIKE '%/tools/barbershop-search%' test, and be dropped — the impressions
-- side would keep counting (it keys off the search_impression event, not the
-- path) while clicks silently went to zero. The report would not error; it
-- would just show a CTR collapsing toward 0% and read as a real ranking
-- problem. That's the failure worth naming here, because nothing about it
-- looks like a bug.
--
-- Both paths are matched, not just the new one: historical rows carry the old
-- path forever, and this report's whole value is comparing against them.
--
-- The match is a regex rather than ILIKE '%/search%'. Anchoring on the end of
-- the path segment (?, # or end-of-string) matters here — a bare
-- ILIKE '%/search%' would also match /searchers, /search-tips, and any future
-- route with "search" anywhere in it, quietly inflating the click side.
--
-- SECOND CHANGE, same predicate, called out because it moves the numbers:
-- the domain filter said innergcomplete.com only. That filter exists to keep
-- localhost dev traffic out of the metrics (20260707190000), and when it was
-- written innergcomplete.com genuinely was "the sole scope" of production.
-- The site has since moved to shearquery.com, so as written this function
-- excludes essentially all current production traffic. Both hosts are now
-- accepted; localhost stays excluded, which was the actual intent.
--
-- NOTE: the same stale innergcomplete.com-only filter is present in the other
-- pixel analytics RPCs (get_pixel_analytics_summary and friends). Those are
-- NOT touched here — this migration only fixes the function it had to rewrite
-- for the route rename. Fixing the rest is its own change.

DROP FUNCTION IF EXISTS get_search_performance_by_entity(timestamptz, text, int, int, text);

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
      AND (page_url ILIKE '%innergcomplete.com%' OR page_url ILIKE '%shearquery.com%')
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
  -- entity_id -> current slug, per result_type. School/store span two
  -- sibling tables each, same as every other slug-resolution join in
  -- this codebase (see resolveEntityNames in pixel-analytics/actions.ts).
  resolved AS (
    SELECT
      ia.entity_id,
      ia.result_type,
      COALESCE(sh.slug, sal.slug, bar.slug, cos.slug, sch1.slug, sch2.slug, st1.slug, st2.slug, ev.slug) AS slug
    FROM impression_agg ia
    LEFT JOIN agent_barbershop_leads sh ON ia.result_type = 'shop' AND sh.id::text = ia.entity_id
    LEFT JOIN agent_salon_leads sal ON ia.result_type = 'salon' AND sal.id::text = ia.entity_id
    LEFT JOIN agent_barber_leads bar ON ia.result_type = 'barber' AND bar.id::text = ia.entity_id
    LEFT JOIN agent_cosmetologist_leads cos ON ia.result_type = 'cosmetologist' AND cos.id::text = ia.entity_id
    LEFT JOIN agent_barber_school_leads sch1 ON ia.result_type = 'school' AND sch1.id::text = ia.entity_id
    LEFT JOIN agent_cosmetology_school_leads sch2 ON ia.result_type = 'school' AND sch2.id::text = ia.entity_id
    LEFT JOIN agent_barber_supply_store_leads st1 ON ia.result_type = 'store' AND st1.id::text = ia.entity_id
    LEFT JOIN agent_beauty_supply_store_leads st2 ON ia.result_type = 'store' AND st2.id::text = ia.entity_id
    LEFT JOIN events ev ON ia.result_type = 'event' AND ev.id::text = ia.entity_id
  ),
  clicks AS (
    SELECT
      r.entity_id,
      r.result_type,
      COUNT(*) AS clicks
    FROM resolved r
    JOIN pixel_events pe
      ON pe.event_name = 'click'
      AND pe.page_url ~* '/(search|tools/barbershop-search)(\?|#|$)'
      AND (pe.page_url ILIKE '%innergcomplete.com%' OR pe.page_url ILIKE '%shearquery.com%')
      AND (v_effective_cutoff IS NULL OR pe.created_at >= v_effective_cutoff)
      AND r.slug IS NOT NULL
      AND pe.metadata->>'href' ILIKE '%/' || (
        CASE r.result_type
          WHEN 'shop' THEN 'shop'
          WHEN 'salon' THEN 'salons'
          WHEN 'barber' THEN 'barbers'
          WHEN 'cosmetologist' THEN 'cosmetologists'
          WHEN 'school' THEN 'schools'
          WHEN 'store' THEN 'stores'
          WHEN 'event' THEN 'events'
          ELSE 'no_such_path_never_matches'
        END
      ) || '/' || r.slug || '%'
    GROUP BY r.entity_id, r.result_type
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
