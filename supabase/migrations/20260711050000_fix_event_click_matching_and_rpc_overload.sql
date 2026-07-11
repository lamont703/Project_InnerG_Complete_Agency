-- What started as "events never had a click-matching case" turned out to
-- be a bigger, platform-wide bug once actually verified against live
-- click data:
--
-- 1. Missing 'event' branch: result_type = 'event' fell through to
--    'no_such_path_never_matches', so event clicks always counted as zero
--    even when present.
--
-- 2. The real bug underneath: click-matching tried to find the entity's
--    raw UUID id as a substring of the clicked href
--    ('%/shop/' || entity_id || '%'). But every search-result card links
--    via slug now (`/shop/${item.slug || item.id}`, confirmed live —
--    every real click href in pixel_events is slug-shaped, e.g.
--    /shop/sirsam-barbershop-houston-77085-7b279cd8), and a slug only
--    embeds an 8-hex-char suffix of the id, never the full UUID. That
--    substring match has silently matched zero real clicks for EVERY
--    entity type since the slug migration landed, not just events —
--    "Search Visibility" and "Top Search Performers" clicks/CTR have
--    been wrong platform-wide. Fixed by resolving each impression's
--    entity_id to its current slug (same per-type lookup-table join
--    used by get_entity_profile_engagement) and matching the href
--    against that slug instead.
--
-- 3. Also folds in the overload-ambiguity fix from earlier today
--    (20260708010000 added p_entity_id as a new 5-arg overload without
--    dropping the old 4-arg one, so any caller omitting p_entity_id —
--    exactly how the pixel-analytics dashboard calls it — hit PGRST203
--    and silently rendered empty).
DROP FUNCTION IF EXISTS get_search_performance_by_entity(timestamptz, text, int, int);
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
      AND pe.page_url ILIKE '%/tools/barbershop-search%'
      AND pe.page_url ILIKE '%innergcomplete.com%'
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
