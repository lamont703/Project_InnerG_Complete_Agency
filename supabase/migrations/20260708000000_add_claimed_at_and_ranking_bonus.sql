-- "Claim your shop" today is pure lead-gen (submitNewBarbershopLead syncs
-- to GHL, no ownership verification) — claimed_at intentionally matches
-- that same trust level. It's not a secure credential, just a state flag
-- set whenever someone submits the claim form for an EXISTING listing, so
-- the UI can show a genuine "claimed" badge/teaser-vs-detail split and the
-- ranking formula can reward it, without requiring real auth to exist first.
ALTER TABLE agent_barbershop_leads ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Small, additive bonus — same order of magnitude as the existing email
-- bonus (100), a bit higher since claiming requires real follow-through,
-- but far below hiring_need (500) so it can't override actual match
-- quality or the platform's core hiring-intent signal.
CREATE OR REPLACE FUNCTION public.search_barbershops_ranked(
  query_text text,
  is_hiring_filter boolean,
  rent_type_filter text,
  limit_val int,
  offset_val int,
  query_embedding vector(768) DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shop_name text,
  city text,
  formatted_address text,
  phone text,
  hiring_need boolean,
  booth_count_available integer,
  rent_type text,
  rent_rate text,
  ai_culture_summary text,
  rating numeric,
  total_reviews integer,
  opportunity_status text,
  google_images jsonb,
  school_district_name text,
  trust_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      a.*,
      to_tsvector('english',
        COALESCE(a.shop_name, '') || ' ' ||
        COALESCE(a.city, '') || ' ' ||
        COALESCE(a.ai_culture_summary, '') || ' ' ||
        COALESCE(a.opportunity_status, '') || ' ' ||
        COALESCE(a.rent_type, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND a.embedding IS NOT NULL
        THEN (1 - (a.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM agent_barbershop_leads a
  )
  SELECT
    s.id,
    s.shop_name,
    s.city,
    s.formatted_address,
    s.phone,
    s.hiring_need,
    s.booth_count_available,
    s.rent_type,
    s.rent_rate,
    s.ai_culture_summary,
    s.rating,
    s.total_reviews,
    s.opportunity_status,
    s.google_images,
    s.school_district_name,
    (
      -- 80% Weight to AI Semantic Score (Scaled to max 200 originally, so 200 * 0.8 = 160 max base)
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (100 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- Fixed Multipliers
      (CASE WHEN s.hiring_need = true THEN 500 ELSE 0 END) +
      (CASE WHEN s.conversation_turns IS NOT NULL OR s.last_conversation_history IS NOT NULL THEN 400 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 100 ELSE 0 END) +
      (CASE WHEN s.claimed_at IS NOT NULL THEN 150 ELSE 0 END) +
      (CASE WHEN s.ai_culture_summary IS NOT NULL AND s.ai_culture_summary != '' THEN 200 ELSE 0 END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS trust_score,
    count(*) OVER() AS total_matched
  FROM search_results s
  WHERE
    (is_hiring_filter = false OR (s.hiring_need = true AND s.booth_count_available > 0))
    AND (rent_type_filter = '' OR rent_type_filter IS NULL OR s.rent_type = rent_type_filter)
    -- Soft Filter: Must score higher than 10 base points
    AND (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN 20 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
    ) > 10
  ORDER BY trust_score DESC
  LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Optional single-entity lookup so a profile page can pull just its own
-- row (teaser stat when unclaimed, full breakdown when claimed) without
-- needing a second, separate RPC.
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
