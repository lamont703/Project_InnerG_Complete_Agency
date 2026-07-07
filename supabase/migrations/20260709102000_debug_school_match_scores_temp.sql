CREATE OR REPLACE FUNCTION _debug_school_match_scores(p_query text)
RETURNS TABLE (school_name text, token_matches int, trgm_sim numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_query)), ' ')) AS token
  ),
  combined AS (
    SELECT school_name FROM agent_barber_school_leads
    UNION ALL
    SELECT school_name FROM agent_cosmetology_school_leads
  )
  SELECT c.school_name,
    (SELECT count(*)::int FROM query_tokens qt WHERE length(qt.token) >= 3 AND lower(c.school_name) LIKE '%' || qt.token || '%') AS token_matches,
    ROUND(similarity(lower(c.school_name), lower(p_query))::numeric, 3) AS trgm_sim
  FROM combined c
  WHERE lower(c.school_name) LIKE '%barber college%' OR lower(c.school_name) LIKE '%milan institute%'
  ORDER BY 3 DESC;
$$;
