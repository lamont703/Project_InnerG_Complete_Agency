-- Lets a community_members row (a free-tier signup — see
-- 20260718030000_add_community_membership.sql) be manually linked to a
-- real entity (shop or salon) they actually own/manage, via a new admin
-- dashboard at /admin/community-entity-links. The entity itself is what
-- gets shown anywhere search/recommendation logic needs a real profile —
-- community_members rows deliberately stay too thin (no location/photos/
-- ratings) to ever be recommended directly.
--
-- One entity per member, one member per entity (both sides UNIQUE) —
-- deliberately simple for now; a member who manages multiple locations
-- isn't supported yet.
CREATE TABLE IF NOT EXISTS public.community_member_entity_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_member_id  UUID NOT NULL UNIQUE REFERENCES public.community_members(id) ON DELETE CASCADE,
  entity_type          TEXT NOT NULL CHECK (entity_type IN ('shop', 'salon')),
  entity_id            UUID NOT NULL,
  linked_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

-- Admin-only table — no public read/write. The dashboard and any search
-- integration both go through the service-role key, same as every other
-- admin-facing data path in this codebase.
ALTER TABLE public.community_member_entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
ON public.community_member_entity_links
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Salons never got their own claimed_at column when shops did (see
-- 20260708000000_add_claimed_at_and_ranking_bonus.sql) — the salon profile
-- page's isClaimed check has been reading a column that didn't exist and
-- silently evaluating to false. Same column, same semantics, now that the
-- admin dashboard is the real mechanism that will set it (via linking).
--
-- Deliberately NOT touching search_salons_ranked's ranking formula in this
-- migration — its exact current live definition wasn't verified directly
-- (no DB introspection access in this session), and guessing at a
-- CREATE OR REPLACE for an already-live, unverified RPC risks silently
-- breaking real search. Giving claimed salons the same ranking bonus
-- shops get is a reasonable follow-up, just not blind-guessed here.
ALTER TABLE public.agent_salon_leads ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
