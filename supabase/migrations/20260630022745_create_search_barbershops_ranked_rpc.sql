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
      -- Exclusive Data Multipliers
      -- Hiring Bonus
      (CASE WHEN a.hiring_need = true THEN 50 ELSE 0 END) +
      -- Engagement Bonus (SMS Agent)
      (CASE WHEN COALESCE(a.conversation_turns, 0) > 0 OR a.last_conversation_history IS NOT NULL THEN 30 ELSE 0 END) +
      -- Contact Density (Email)
      (CASE WHEN a.email IS NOT NULL AND a.email != '' THEN 15 ELSE 0 END) +
      -- Reputation Score
      (COALESCE(a.rating, 0) * 10) +
      -- Review Density
      (COALESCE(a.total_reviews, 0) / 5) +
      -- Culture Bonus
      (CASE WHEN a.ai_culture_summary IS NOT NULL AND a.ai_culture_summary != '' THEN 20 ELSE 0 END)
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
