-- "Who were those test takers" — lists individual test-takers at a
-- school, fuzzy-matched the same way get_school_exam_stats matches a
-- school name (can return 2 schools on a genuine campus collision).
--
-- Names are redacted (first_name/last_name returned as NULL,
-- is_k12_school flagged true) for any school whose name indicates a K-12
-- high school program ("High School" or the "Hs" abbreviation seen in
-- real data, e.g. "Huntsville Hs Cosmetology") — those test-takers are
-- plausibly minors in a vocational program, a meaningfully different
-- sensitivity tier than adult students at a dedicated trade school like
-- Milan Institute or Quality Barber College, where full names are shown.
-- \y is Postgres's POSIX word-boundary marker, so this matches "Hs" as
-- its own word, not as a substring of some unrelated word.
CREATE OR REPLACE FUNCTION get_school_test_takers(p_school_query text, p_limit int DEFAULT 30)
RETURNS TABLE (
  school_id uuid,
  school_name text,
  is_k12_school boolean,
  program_type text,
  first_name text,
  last_name text,
  test_type text,
  result text,
  score numeric,
  attempt_number int,
  is_latest_attempt boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_school_query)), ' ')) AS token
  ),
  schools_combined AS (
    SELECT id AS school_id, school_name FROM agent_barber_school_leads
    UNION ALL
    SELECT id, school_name FROM agent_cosmetology_school_leads
  ),
  school_scores AS (
    SELECT s.*,
      (SELECT count(*) FROM query_tokens qt WHERE length(qt.token) >= 3 AND lower(s.school_name) LIKE '%' || qt.token || '%') AS token_matches,
      similarity(lower(s.school_name), lower(p_school_query)) AS trgm_sim
    FROM schools_combined s
  ),
  best_schools AS (
    SELECT school_id FROM school_scores
    WHERE token_matches > 0 OR trgm_sim > 0.25
    ORDER BY token_matches DESC, trgm_sim DESC
    LIMIT 2
  ),
  students_combined AS (
    SELECT 'barber'::text AS program_type, matched_school_id, first_name, last_name, test_type, result, score, attempt_number, is_latest_attempt
    FROM agent_barber_student_leads
    WHERE matched_school_id IS NOT NULL
    UNION ALL
    SELECT 'cosmetology'::text, matched_school_id, first_name, last_name, test_type, result, score, attempt_number, is_latest_attempt
    FROM agent_cosmetology_student_leads
    WHERE matched_school_id IS NOT NULL
  )
  SELECT
    bs.school_id,
    sc.school_name,
    (sc.school_name ~* '\yhigh school\y|\yhs\y') AS is_k12_school,
    st.program_type,
    CASE WHEN sc.school_name ~* '\yhigh school\y|\yhs\y' THEN NULL ELSE st.first_name END AS first_name,
    CASE WHEN sc.school_name ~* '\yhigh school\y|\yhs\y' THEN NULL ELSE st.last_name END AS last_name,
    st.test_type, st.result, st.score, st.attempt_number, st.is_latest_attempt
  FROM best_schools bs
  JOIN schools_combined sc ON sc.school_id = bs.school_id
  JOIN students_combined st ON st.matched_school_id = bs.school_id
  ORDER BY st.test_type, st.last_name
  LIMIT p_limit;
$$;
