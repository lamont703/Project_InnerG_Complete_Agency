-- Two real issues found via live testing with real data:
--
-- 1. find_student_exam_record("Manuel Urrea") incorrectly included "Joy
--    Manuel" as a second candidate — the old threshold (token_matches > 0)
--    let a match on just ONE of the query's two tokens through, and since
--    "top 2" always fills two slots when more than one row clears the bar,
--    a weak partial match rode along next to the genuinely correct one.
--    Now requires matching at least min(2, query token count) tokens for
--    multi-word queries, so a 2-word name search needs both words to
--    plausibly match, not just one — precision matters more here than on
--    venue/professional lookups given how sensitive pass/fail records are.
-- 2. get_school_rankings_by_region had no minimum-sample-size floor,
--    unlike every other ranking tool this session (get_top_venues_by_
--    worker_count, get_school_district_barbershop_rankings,
--    get_top_schools_by_pass_rate) — a school with 1 test-taker at 100%
--    was outranking schools with real sample sizes. Added the same
--    p_min_test_takers floor the statewide best/worst tool already uses.

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
    WHERE ps.token_matches >= LEAST(2, qtc.n) OR ps.trgm_sim > 0.4
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

DROP FUNCTION IF EXISTS get_school_rankings_by_region(text, int);

CREATE OR REPLACE FUNCTION get_school_rankings_by_region(p_city text, p_limit int DEFAULT 10, p_min_test_takers int DEFAULT 3)
RETURNS TABLE (
  school_id uuid,
  school_type text,
  school_name text,
  city text,
  written_pass_rate numeric,
  written_test_takers int,
  leaderboard_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined AS (
    SELECT id AS school_id, 'barber_school'::text AS school_type, school_name, city,
      written_pass_rate_2026 AS written_pass_rate, written_test_takers_2026 AS written_test_takers,
      school_leaderboard_score_2026 AS leaderboard_score
    FROM agent_barber_school_leads
    WHERE city ILIKE '%' || p_city || '%' AND written_test_takers_2026 >= p_min_test_takers
    UNION ALL
    SELECT id, 'cosmetology_school'::text, school_name, city,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
    WHERE city ILIKE '%' || p_city || '%' AND cosmetology_written_test_takers_2026 >= p_min_test_takers
  )
  SELECT * FROM combined
  ORDER BY written_pass_rate DESC NULLS LAST
  LIMIT p_limit;
$$;
