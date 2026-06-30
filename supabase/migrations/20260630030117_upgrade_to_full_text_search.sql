DROP FUNCTION IF EXISTS public.search_barbershops_ranked(text, boolean, text, int, int);

CREATE OR REPLACE FUNCTION public.search_barbershops_ranked(
  query_text text,
  is_hiring_filter boolean,
  rent_type_filter text,
  limit_val int,
  offset_val int
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
  trust_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      a.*,
      -- Build a tsvector out of all searchable columns
      to_tsvector('english', 
        COALESCE(a.shop_name, '') || ' ' || 
        COALESCE(a.city, '') || ' ' || 
        COALESCE(a.ai_culture_summary, '') || ' ' || 
        COALESCE(a.opportunity_status, '') || ' ' || 
        COALESCE(a.rent_type, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query
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
    (
      -- Base Relevance Score (Using TS Rank)
      (CASE WHEN query_text = '' THEN 100
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100, 0)
       END) +
      -- Exclusive Data Multipliers (MASSIVELY prioritized over external data)
      (CASE WHEN s.hiring_need = true THEN 500 ELSE 0 END) +
      (CASE WHEN s.conversation_turns IS NOT NULL OR s.last_conversation_history IS NOT NULL THEN 400 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 100 ELSE 0 END) +
      (CASE WHEN s.ai_culture_summary IS NOT NULL AND s.ai_culture_summary != '' THEN 200 ELSE 0 END) +
      -- External Data
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS trust_score,
    count(*) OVER() AS total_matched
  FROM search_results s
  WHERE 
    (is_hiring_filter = false OR (s.hiring_need = true AND s.booth_count_available > 0))
    AND (rent_type_filter = '' OR rent_type_filter IS NULL OR s.rent_type = rent_type_filter)
    AND (
      query_text = '' 
      OR s.search_vector @@ s.search_query
      OR s.shop_name ILIKE '%' || query_text || '%' -- Fallback for partial typing (e.g. "houst")
      OR s.city ILIKE '%' || query_text || '%'
    )
  ORDER BY trust_score DESC
  LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
