-- Five AI Mode tools for barber/cosmetology school administrators asking
-- about 2026 TDLR exam data. Verified against real data before writing
-- these: 4,775 barber exam rows, 16,831 cosmetology rows, all
-- exam_year=2026 (no prior years exist — trend/year-over-year questions
-- aren't answerable yet). Pass rates on the school tables are stored as
-- 0-1 decimals, not 0-100 — left as-is here, TS layer converts to a
-- percentage for display.
--
-- Both agent_barber_school_leads and agent_cosmetology_school_leads
-- carry an identical column set (generic + cosmetology_-prefixed pass-
-- rate fields) since many schools teach both programs — generic fields
-- track the barber program, cosmetology_-prefixed fields track the
-- cosmetology program, on EITHER table.
--
-- school_match_confidence on the student tables is "fuzzy" or
-- "ambiguous" for ~12% of rows — not filtered out here, but surfaced so
-- the model can caveat individual student lookups appropriately.

-- 1. Single school lookup — fuzzy name match across both school tables,
-- both programs' numbers if the school teaches both.
CREATE OR REPLACE FUNCTION get_school_exam_stats(p_school_query text, p_limit int DEFAULT 3)
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
  FROM scored
  WHERE token_matches > 0 OR trgm_sim > 0.25
  ORDER BY token_matches DESC, trgm_sim DESC
  LIMIT p_limit;
$$;

-- 2. Statewide benchmark — a genuinely missing piece. Computed directly
-- from student-level pass/fail records (student-weighted), not an
-- average of the per-school rates, so large and small schools aren't
-- counted equally.
CREATE OR REPLACE FUNCTION get_statewide_exam_stats()
RETURNS TABLE (
  program_type text,
  test_type text,
  total_test_takers bigint,
  pass_count bigint,
  pass_rate numeric,
  first_attempt_pass_rate numeric,
  avg_attempts_to_pass numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'barber'::text AS program_type,
    s.test_type,
    COUNT(*) FILTER (WHERE s.is_latest_attempt) AS total_test_takers,
    COUNT(*) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS') AS pass_count,
    ROUND((COUNT(*) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS')::numeric / NULLIF(COUNT(*) FILTER (WHERE s.is_latest_attempt), 0) * 100), 1) AS pass_rate,
    ROUND((COUNT(*) FILTER (WHERE s.attempt_number = 1 AND s.result = 'PASS')::numeric / NULLIF(COUNT(*) FILTER (WHERE s.attempt_number = 1), 0) * 100), 1) AS first_attempt_pass_rate,
    ROUND(AVG(s.attempt_number) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS')::numeric, 2) AS avg_attempts_to_pass
  FROM agent_barber_student_leads s
  GROUP BY s.test_type
  UNION ALL
  SELECT
    'cosmetology'::text,
    s.test_type,
    COUNT(*) FILTER (WHERE s.is_latest_attempt),
    COUNT(*) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS'),
    ROUND((COUNT(*) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS')::numeric / NULLIF(COUNT(*) FILTER (WHERE s.is_latest_attempt), 0) * 100), 1),
    ROUND((COUNT(*) FILTER (WHERE s.attempt_number = 1 AND s.result = 'PASS')::numeric / NULLIF(COUNT(*) FILTER (WHERE s.attempt_number = 1), 0) * 100), 1),
    ROUND(AVG(s.attempt_number) FILTER (WHERE s.is_latest_attempt AND s.result = 'PASS')::numeric, 2)
  FROM agent_cosmetology_student_leads s
  GROUP BY s.test_type;
$$;

-- 3. Individual student lookup — fuzzy match on first+last name across
-- both student tables, grouped to the best-matching person(s) (top 2, in
-- case of a genuine name collision), returning ALL of that person's
-- attempts so retakes show correctly via is_latest_attempt/attempt_number.
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
    SELECT first_name, last_name FROM person_scores
    WHERE token_matches > 0 OR trgm_sim > 0.3
    ORDER BY token_matches DESC, trgm_sim DESC
    LIMIT 2
  )
  SELECT c.program_type, c.first_name, c.last_name, c.school_name, c.matched_school_id, c.matched_school_type,
    c.test_type, c.test_date, c.result, c.score, c.attempt_number, c.is_latest_attempt, c.school_match_confidence
  FROM combined c
  JOIN best_people bp ON c.first_name = bp.first_name AND c.last_name = bp.last_name
  ORDER BY c.test_type, c.attempt_number
  LIMIT p_limit;
$$;

-- 4. Regional/city ranking — "which schools in my area have the best
-- pass rates," distinct from the fixed leaderboard (which is volume-
-- sorted and statewide, not city-scoped).
CREATE OR REPLACE FUNCTION get_school_rankings_by_region(p_city text, p_limit int DEFAULT 10)
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
    WHERE city ILIKE '%' || p_city || '%' AND written_test_takers_2026 IS NOT NULL
    UNION ALL
    SELECT id, 'cosmetology_school'::text, school_name, city,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
    WHERE city ILIKE '%' || p_city || '%' AND cosmetology_written_test_takers_2026 IS NOT NULL
  )
  SELECT * FROM combined
  ORDER BY written_pass_rate DESC NULLS LAST
  LIMIT p_limit;
$$;

-- 5. Statewide best/worst performers, distinct from the fixed volume-
-- sorted leaderboard. Floors at a minimum test-taker count so a school
-- with 1-2 test takers at 100%/0% doesn't rank above real sample sizes.
CREATE OR REPLACE FUNCTION get_top_schools_by_pass_rate(
  p_limit int DEFAULT 10,
  p_direction text DEFAULT 'best',
  p_min_test_takers int DEFAULT 5
)
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
    WHERE written_test_takers_2026 >= p_min_test_takers
    UNION ALL
    SELECT id, 'cosmetology_school'::text, school_name, city,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
    WHERE cosmetology_written_test_takers_2026 >= p_min_test_takers
  )
  SELECT * FROM combined
  ORDER BY (CASE WHEN p_direction = 'worst' THEN written_pass_rate ELSE -written_pass_rate END) ASC NULLS LAST
  LIMIT p_limit;
$$;
