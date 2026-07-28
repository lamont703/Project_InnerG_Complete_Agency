-- Ad rotation: lets a single ad position hold MANY eligible campaigns and serve
-- a different one on each render, instead of only ever showing the newest
-- campaign (every serving function in lib/profile-ad.ts used to take the first
-- match of a created_at-DESC list, so campaign #2 onward never appeared).
--
-- One ad still shows per position. Which one is decided by a plain round-robin
-- over the eligible pool, driven by a persistent per-pool cursor:
--
--     rotation_index = (served_count - 1) % pool_size
--
-- `cycle_size` (default 10) is the impression block the rotation is specified
-- in: across any window of `cycle_size` consecutive serves, every campaign in
-- the pool gets at least floor(cycle_size / pool_size) of them, and the
-- leftover serves carry into the next block rather than always going to the
-- same campaign. 10 impressions over 4 campaigns → 3/3/2/2 in the first block,
-- 2/2/3/3 in the next, so nobody is permanently first. It's stored per cursor
-- so later work (weighted share, priority tiers) has a block size to divide up.
--
-- The "rotation key" identifies the POOL, not the page: it's the placement plus
-- a hash of the eligible campaign ids (see lib/ad-rotation.ts). Two pages with
-- the same eligible set share one cursor, and changing that set — selling a new
-- campaign, pausing one — starts a fresh cursor at zero.
--
-- `served_count` counts ad SERVES (a rendered ad), not viewable impressions —
-- those still come from the pixel's ad_impression events, which is what the
-- advertiser-facing reports use.

CREATE TABLE IF NOT EXISTS public.ad_rotation_cursors (
  rotation_key text PRIMARY KEY,
  placement    text NOT NULL,
  pool_ids     uuid[] NOT NULL DEFAULT '{}',   -- the eligible campaigns, for debugging
  pool_size    integer NOT NULL,
  cycle_size   integer NOT NULL DEFAULT 10,
  served_count bigint NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_rotation_cursors_placement_idx
  ON public.ad_rotation_cursors (placement);

ALTER TABLE public.ad_rotation_cursors ENABLE ROW LEVEL SECURITY;

-- Server-side only: ads are served by the service-role admin client, and the
-- cursor is an internal serving detail (no browser ever reads or writes it).
CREATE POLICY "Service role full access to ad_rotation_cursors"
  ON public.ad_rotation_cursors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Claim the next rotation slot for a pool and return which campaign index to
-- serve. The increment and the read are a single statement, so concurrent
-- renders can't hand two visitors the same slot.
CREATE OR REPLACE FUNCTION public.claim_ad_rotation_slot(
  p_rotation_key text,
  p_placement    text,
  p_pool_ids     uuid[],
  p_cycle_size   integer DEFAULT 10
)
RETURNS TABLE (served bigint, rotation_index integer, cycle_position integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- array_length is NULL for an empty array and GREATEST ignores NULLs, so an
  -- empty pool degrades to size 1 (index 0) instead of dividing by zero.
  v_pool_size  integer := GREATEST(array_length(p_pool_ids, 1), 1);
  v_cycle_size integer := GREATEST(COALESCE(p_cycle_size, 10), 1);
  v_served     bigint;
BEGIN
  INSERT INTO ad_rotation_cursors AS c
    (rotation_key, placement, pool_ids, pool_size, cycle_size, served_count)
  VALUES
    (p_rotation_key, p_placement, p_pool_ids, v_pool_size, v_cycle_size, 1)
  ON CONFLICT (rotation_key) DO UPDATE
    SET served_count = c.served_count + 1,
        -- Same key means the same id set, so these only ever rewrite equal
        -- values — kept so a cursor row stays self-describing if the key
        -- derivation ever changes.
        pool_ids   = EXCLUDED.pool_ids,
        pool_size  = EXCLUDED.pool_size,
        cycle_size = EXCLUDED.cycle_size,
        updated_at = now()
  RETURNING c.served_count INTO v_served;

  RETURN QUERY SELECT
    v_served,
    ((v_served - 1) % v_pool_size)::integer,
    ((v_served - 1) % v_cycle_size)::integer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ad_rotation_slot(text, text, uuid[], integer) TO service_role;
