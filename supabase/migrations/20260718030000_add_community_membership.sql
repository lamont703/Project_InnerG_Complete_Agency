-- Free "Community Member" tier: any barber/cosmetology professional can
-- self-register (name, phone, email, password) and immediately show up in
-- ShearQuery search results — the discovery benefit is the whole point of
-- the tier. Reuses the existing Supabase Auth + public.users role system
-- (same pattern as migration 141's student/instructor/owner roles) rather
-- than building a separate auth stack, since the signup form now collects
-- a real password (not a passwordless/lightweight session).

-- 1. New role value, same mechanism as 141_add_barber_roles.sql. The
-- handle_new_user() trigger (migration 002) auto-inserts this into
-- public.users from auth.users' raw_user_meta_data on signup.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'community_member';

-- 2. The member's own directory profile — deliberately minimal (matches
-- the "keep signup simple" requirement: no business/location/photo fields
-- exist yet for a fuller profile to be built later without a schema
-- change). Kept as its own table rather than inserted into
-- agent_barber_leads/agent_cosmetologist_leads — those tables represent
-- audited, scraped real businesses with their own dedup/trust pipeline
-- (see scripts/deduplication_agent.js); mixing in self-serve public
-- signups would corrupt that trust model.
CREATE TABLE IF NOT EXISTS public.community_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_community_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_members_updated_at ON public.community_members;
CREATE TRIGGER community_members_updated_at
  BEFORE UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_members_updated_at();

-- Same open-read RLS shape as every other searchable "agent_*" leads table
-- (see e.g. 20260524000000_create_agent_barber_leads.sql) — this table is
-- a public directory by design, not private account data. Writes only
-- ever happen server-side via the service-role admin client in
-- /api/community/register, same as barber_registrations.
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
ON public.community_members
USING (true)
WITH CHECK (true);

-- 3. search_community_members_ranked — same shape/conventions as the other
-- 8 ranked-search RPCs (base_relevance/quality_bonus for the All-tab
-- blend, the null-embedding token_matches fallback from
-- 20260718000000_fix_null_embedding_search_fallback.sql baked in from the
-- start rather than retrofitted later).
DROP FUNCTION IF EXISTS public.search_community_members_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_community_members_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  created_at timestamptz,
  match_score numeric,
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      m.created_at,
      to_tsvector('english', coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      0::numeric as semantic_similarity, -- no embedding column on this table yet — name-only matching for now
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 2 AND (
          lower(COALESCE(m.first_name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(m.last_name, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM public.community_members m
  )
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.created_at,
    (
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS match_score,
    (
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    0::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) > 10
     OR s.token_matches > 0
  ORDER BY s.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
