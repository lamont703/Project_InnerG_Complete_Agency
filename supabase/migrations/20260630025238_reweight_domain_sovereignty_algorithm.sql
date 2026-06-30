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
  trust_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.shop_name,
    a.city,
    a.formatted_address,
    a.phone,
    a.hiring_need,
    a.booth_count_available,
    a.rent_type,
    a.rent_rate,
    a.ai_culture_summary,
    a.rating,
    a.total_reviews,
    a.opportunity_status,
    a.google_images,
    (
      -- Base Relevance Score
      (CASE WHEN query_text = '' THEN 100
            WHEN a.shop_name ILIKE '%' || query_text || '%' THEN 50
            WHEN a.city ILIKE '%' || query_text || '%' THEN 30
            WHEN a.ai_culture_summary ILIKE '%' || query_text || '%' THEN 20
            WHEN a.rent_type ILIKE '%' || query_text || '%' THEN 10
            ELSE 0 END) +
      -- Exclusive Data Multipliers (MASSIVELY prioritized over external data)
      -- Hiring Bonus (Active platform users)
      (CASE WHEN a.hiring_need = true THEN 500 ELSE 0 END) +
      -- Engagement Bonus (SMS Agent interaction is a massive signal of ecosystem adoption)
      (CASE WHEN a.conversation_turns IS NOT NULL OR a.last_conversation_history IS NOT NULL THEN 400 ELSE 0 END) +
      -- Contact Density (Email)
      (CASE WHEN a.email IS NOT NULL AND a.email != '' THEN 100 ELSE 0 END) +
      -- Culture Bonus (Shop processed by our AI pipeline)
      (CASE WHEN a.ai_culture_summary IS NOT NULL AND a.ai_culture_summary != '' THEN 200 ELSE 0 END) +
      
      -- External Data (Capped so it never overpowers our proprietary data)
      -- Reputation Score (Max 50 points)
      (COALESCE(a.rating, 0) * 10) +
      -- Review Density (Capped at 50 points max so it doesn't inflate scores)
      LEAST((COALESCE(a.total_reviews, 0) / 5), 50)
    )::numeric AS trust_score
  FROM agent_barbershop_leads a
  WHERE 
    (is_hiring_filter = false OR (a.hiring_need = true AND a.booth_count_available > 0))
    AND (rent_type_filter = '' OR rent_type_filter IS NULL OR a.rent_type = rent_type_filter)
    AND (
      query_text = '' 
      OR a.shop_name ILIKE '%' || query_text || '%'
      OR a.city ILIKE '%' || query_text || '%'
      OR a.ai_culture_summary ILIKE '%' || query_text || '%'
      OR a.rent_type ILIKE '%' || query_text || '%'
      OR a.opportunity_status ILIKE '%' || query_text || '%'
    )
  ORDER BY trust_score DESC
  LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
