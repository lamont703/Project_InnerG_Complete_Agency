-- Follow-up fix: the trigram-similarity fallback in find_student_exam_record
-- was still letting an unrelated "Joy Manuel" through for a 2-word query
-- ("Manuel Urrea") even after requiring 2 token matches, since trigram
-- similarity between the two full-name strings scored high purely from
-- the shared substring "manuel" — confirmed live. Restricting the
-- trigram fallback to single-word queries only; 2+-word queries now rely
-- solely on the token-match count.
DROP FUNCTION IF EXISTS find_student_exam_record(text, int);

CREATE OR REPLACE FUNCTION find_student_exam_record(p_name_query text, p_limit int DEFAULT 20)
RETURNS TABLE (
  program_type text,
  first_name text,
  last_name text,
  school_name text,
  matched_school_id uuid,
  matched_school_type text,
  test_type text,
  test_date date,
  result text,
  score numeric,
  attempt_number int,
  is_latest_attempt boolean,
  school_match_confidence text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_name_query)), ' ')) AS token
  ),
  query_token_count AS (
    SELECT count(*) AS n FROM query_tokens WHERE length(token) >= 2
  ),
  combined AS (
    SELECT 'barber'::text AS program_type, first_name, last_name, school_name, matched_school_id, matched_school_type, test_type, test_date, result, score, attempt_number, is_latest_attempt, school_match_confidence
    FROM agent_barber_student_leads
    UNION ALL
    SELECT 'cosmetology'::text, first_name, last_name, school_name, matched_school_id, matched_school_type, test_type, test_date, result, score, attempt_number, is_latest_attempt, school_match_confidence
    FROM agent_cosmetology_student_leads
  ),
  person_scores AS (
    SELECT DISTINCT
      c.first_name, c.last_name,
      (SELECT count(*) FROM query_tokens qt WHERE length(qt.token) >= 2 AND lower(c.first_name || ' ' || c.last_name) LIKE '%' || qt.token || '%') AS token_matches,
      similarity(lower(c.first_name || ' ' || c.last_name), lower(p_name_query)) AS trgm_sim
    FROM combined c
  ),
  best_people AS (
    SELECT ps.first_name, ps.last_name
    FROM person_scores ps, query_token_count qtc
    WHERE ps.token_matches >= LEAST(2, qtc.n)
       OR (qtc.n <= 1 AND ps.trgm_sim > 0.4)
    ORDER BY ps.token_matches DESC, ps.trgm_sim DESC
    LIMIT 2
  )
  SELECT c.program_type, c.first_name, c.last_name, c.school_name, c.matched_school_id, c.matched_school_type,
    c.test_type, c.test_date, c.result, c.score, c.attempt_number, c.is_latest_attempt, c.school_match_confidence
  FROM combined c
  JOIN best_people bp ON c.first_name = bp.first_name AND c.last_name = bp.last_name
  ORDER BY c.test_type, c.attempt_number
  LIMIT p_limit;
$$;
