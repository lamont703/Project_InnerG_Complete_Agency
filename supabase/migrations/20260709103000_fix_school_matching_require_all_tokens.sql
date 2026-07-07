-- The previous fix (require min(2, query token count) tokens) still let
-- false positives through — confirmed via a debug query: there are 50+
-- distinct real schools named "___ Barber College" in Texas, so "barber"
-- + "college" alone satisfies a 2-token bar for nearly any barber-school
-- query, regardless of the actual institution name. "Barber College" /
-- "Beauty School" are generic industry terms here, not distinguishing
-- identifiers the way a venue or person's name usually is.
--
-- Verified before writing this: requiring ALL query tokens (not just 2)
-- correctly keeps every genuine "Milan Institute" campus variant (all 7
-- real rows have token_matches=2, matching both of its 2 query tokens)
-- while excluding "360 Barber College" / "Alamo City Barber College"
-- (token_matches=2 but the 3-token query "Quality Barber College" needs
-- all 3 — they're missing "quality"). Single-word queries still use the
-- trigram fallback, since "require all tokens" is meaningless for those.

DROP FUNCTION IF EXISTS get_school_exam_stats(text, int);

CREATE OR REPLACE FUNCTION get_school_exam_stats(p_school_query text, p_limit int DEFAULT 5)
RETURNS TABLE (
  school_id uuid,
  school_type text,
  school_name text,
  city text,
  barber_written_pass_rate numeric,
  barber_written_test_takers int,
  barber_practical_pass_rate numeric,
  barber_practical_test_takers int,
  barber_first_attempt_pass_rate numeric,
  barber_avg_attempts_to_pass numeric,
  barber_leaderboard_score numeric,
  cosmetology_written_pass_rate numeric,
  cosmetology_written_test_takers int,
  cosmetology_practical_pass_rate numeric,
  cosmetology_practical_test_takers int,
  cosmetology_first_attempt_pass_rate numeric,
  cosmetology_avg_attempts_to_pass numeric,
  cosmetology_leaderboard_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_school_query)), ' ')) AS token
  ),
  query_token_count AS (
    SELECT count(*) AS n FROM query_tokens WHERE length(token) >= 3
  ),
  combined AS (
    SELECT
      id AS school_id, 'barber_school'::text AS school_type, school_name, city,
      written_pass_rate_2026 AS barber_written_pass_rate, written_test_takers_2026 AS barber_written_test_takers,
      practical_pass_rate_2026 AS barber_practical_pass_rate, practical_test_takers_2026 AS barber_practical_test_takers,
      written_first_attempt_pass_rate_2026 AS barber_first_attempt_pass_rate, written_avg_attempts_to_pass_2026 AS barber_avg_attempts_to_pass,
      school_leaderboard_score_2026 AS barber_leaderboard_score,
      cosmetology_written_pass_rate_2026 AS cosmetology_written_pass_rate, cosmetology_written_test_takers_2026 AS cosmetology_written_test_takers,
      cosmetology_practical_pass_rate_2026 AS cosmetology_practical_pass_rate, cosmetology_practical_test_takers_2026 AS cosmetology_practical_test_takers,
      cosmetology_written_first_attempt_pass_rate_2026 AS cosmetology_first_attempt_pass_rate, cosmetology_written_avg_attempts_to_pass_2026 AS cosmetology_avg_attempts_to_pass,
      cosmetology_school_leaderboard_score_2026 AS cosmetology_leaderboard_score
    FROM agent_barber_school_leads
    UNION ALL
    SELECT
      id, 'cosmetology_school'::text, school_name, city,
      written_pass_rate_2026, written_test_takers_2026,
      practical_pass_rate_2026, practical_test_takers_2026,
      written_first_attempt_pass_rate_2026, written_avg_attempts_to_pass_2026,
      school_leaderboard_score_2026,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_practical_pass_rate_2026, cosmetology_practical_test_takers_2026,
      cosmetology_written_first_attempt_pass_rate_2026, cosmetology_written_avg_attempts_to_pass_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
  ),
  scored AS (
    SELECT c.*,
      (SELECT count(*) FROM query_tokens qt WHERE length(qt.token) >= 3 AND lower(c.school_name) LIKE '%' || qt.token || '%') AS token_matches,
      similarity(lower(c.school_name), lower(p_school_query)) AS trgm_sim
    FROM combined c
  )
  SELECT school_id, school_type, school_name, city,
    barber_written_pass_rate, barber_written_test_takers, barber_practical_pass_rate, barber_practical_test_takers,
    barber_first_attempt_pass_rate, barber_avg_attempts_to_pass, barber_leaderboard_score,
    cosmetology_written_pass_rate, cosmetology_written_test_takers, cosmetology_practical_pass_rate, cosmetology_practical_test_takers,
    cosmetology_first_attempt_pass_rate, cosmetology_avg_attempts_to_pass, cosmetology_leaderboard_score
  FROM scored, query_token_count qtc
  WHERE (qtc.n >= 2 AND scored.token_matches >= qtc.n)
     OR (qtc.n <= 1 AND scored.trgm_sim > 0.4)
  ORDER BY scored.token_matches DESC, scored.trgm_sim DESC
  LIMIT p_limit;
$$;

DROP FUNCTION IF EXISTS get_school_test_takers(text, int);

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
  query_token_count AS (
    SELECT count(*) AS n FROM query_tokens WHERE length(token) >= 3
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
    SELECT ss.school_id
    FROM school_scores ss, query_token_count qtc
    WHERE (qtc.n >= 2 AND ss.token_matches >= qtc.n)
       OR (qtc.n <= 1 AND ss.trgm_sim > 0.4)
    ORDER BY ss.token_matches DESC, ss.trgm_sim DESC
    LIMIT 5
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

-- Diagnostic-only, no longer needed.
DROP FUNCTION IF EXISTS _debug_school_match_scores(text);
