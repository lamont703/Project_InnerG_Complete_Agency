-- The 5 school-related AI chat tools (get_school_exam_stats,
-- get_school_test_takers, find_student_exam_record,
-- get_school_rankings_by_region, get_top_schools_by_pass_rate) all built
-- their schoolHref in lib/shop-ecosystem.ts as `/schools/${school_id}` —
-- the raw UUID, never a slug. Every other AI-chat link (via withProfileUrl
-- in app/api/chat/route.ts) already uses the real slug; these five were
-- just missed when the platform moved to slug-based URLs. The old links
-- still resolve (the school page redirects id -> slug), but shouldn't be
-- generated fresh anymore. Purely additive: adds a slug column to each
-- RPC, no existing logic/ordering/filtering changed.

-- 1. get_school_exam_stats
DROP FUNCTION IF EXISTS get_school_exam_stats(text, int);

CREATE OR REPLACE FUNCTION get_school_exam_stats(p_school_query text, p_limit int DEFAULT 5)
RETURNS TABLE (
  school_id uuid,
  school_slug text,
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
      id AS school_id, slug AS school_slug, 'barber_school'::text AS school_type, school_name, city,
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
      id, slug, 'cosmetology_school'::text, school_name, city,
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
  SELECT school_id, school_slug, school_type, school_name, city,
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


-- 2. get_school_test_takers
DROP FUNCTION IF EXISTS get_school_test_takers(text, int);

CREATE OR REPLACE FUNCTION get_school_test_takers(p_school_query text, p_limit int DEFAULT 30)
RETURNS TABLE (
  school_id uuid,
  school_slug text,
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
    SELECT id AS school_id, slug AS school_slug, school_name FROM agent_barber_school_leads
    UNION ALL
    SELECT id, slug, school_name FROM agent_cosmetology_school_leads
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
    sc.school_slug,
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


-- 3. find_student_exam_record
DROP FUNCTION IF EXISTS find_student_exam_record(text, int);

CREATE OR REPLACE FUNCTION find_student_exam_record(p_name_query text, p_limit int DEFAULT 20)
RETURNS TABLE (
  program_type text,
  first_name text,
  last_name text,
  school_name text,
  matched_school_id uuid,
  matched_school_slug text,
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
  SELECT c.program_type, c.first_name, c.last_name, c.school_name, c.matched_school_id,
    COALESCE(bsl.slug, csl.slug) AS matched_school_slug,
    c.matched_school_type,
    c.test_type, c.test_date, c.result, c.score, c.attempt_number, c.is_latest_attempt, c.school_match_confidence
  FROM combined c
  JOIN best_people bp ON c.first_name = bp.first_name AND c.last_name = bp.last_name
  LEFT JOIN agent_barber_school_leads bsl ON c.matched_school_type = 'barber' AND bsl.id = c.matched_school_id
  LEFT JOIN agent_cosmetology_school_leads csl ON c.matched_school_type = 'cosmetology' AND csl.id = c.matched_school_id
  ORDER BY c.test_type, c.attempt_number
  LIMIT p_limit;
$$;


-- 4. get_school_rankings_by_region
DROP FUNCTION IF EXISTS get_school_rankings_by_region(text, int);
DROP FUNCTION IF EXISTS get_school_rankings_by_region(text, int, int);

CREATE OR REPLACE FUNCTION get_school_rankings_by_region(p_city text, p_limit int DEFAULT 10, p_min_test_takers int DEFAULT 3)
RETURNS TABLE (
  school_id uuid,
  school_slug text,
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
    SELECT id AS school_id, slug AS school_slug, 'barber_school'::text AS school_type, school_name, city,
      written_pass_rate_2026 AS written_pass_rate, written_test_takers_2026 AS written_test_takers,
      school_leaderboard_score_2026 AS leaderboard_score
    FROM agent_barber_school_leads
    WHERE city ILIKE '%' || p_city || '%' AND written_test_takers_2026 >= p_min_test_takers
    UNION ALL
    SELECT id, slug, 'cosmetology_school'::text, school_name, city,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
    WHERE city ILIKE '%' || p_city || '%' AND cosmetology_written_test_takers_2026 >= p_min_test_takers
  )
  SELECT * FROM combined
  ORDER BY written_pass_rate DESC NULLS LAST
  LIMIT p_limit;
$$;


-- 5. get_top_schools_by_pass_rate
DROP FUNCTION IF EXISTS get_top_schools_by_pass_rate(int, text, int);

CREATE OR REPLACE FUNCTION get_top_schools_by_pass_rate(
  p_limit int DEFAULT 10,
  p_direction text DEFAULT 'best',
  p_min_test_takers int DEFAULT 5
)
RETURNS TABLE (
  school_id uuid,
  school_slug text,
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
    SELECT id AS school_id, slug AS school_slug, 'barber_school'::text AS school_type, school_name, city,
      written_pass_rate_2026 AS written_pass_rate, written_test_takers_2026 AS written_test_takers,
      school_leaderboard_score_2026 AS leaderboard_score
    FROM agent_barber_school_leads
    WHERE written_test_takers_2026 >= p_min_test_takers
    UNION ALL
    SELECT id, slug, 'cosmetology_school'::text, school_name, city,
      cosmetology_written_pass_rate_2026, cosmetology_written_test_takers_2026,
      cosmetology_school_leaderboard_score_2026
    FROM agent_cosmetology_school_leads
    WHERE cosmetology_written_test_takers_2026 >= p_min_test_takers
  )
  SELECT * FROM combined
  ORDER BY (CASE WHEN p_direction = 'worst' THEN written_pass_rate ELSE -written_pass_rate END) ASC NULLS LAST
  LIMIT p_limit;
$$;
