-- Shortlists — the save-and-compare artifact for customers researching a
-- salon or barbershop, and the demand signal collected alongside it.
--
-- WHY THIS EXISTS. Search Console, 28 days to 2026-08-08: 16,727 impressions
-- for "<business name> reviews" at 0.11% CTR, 82% of them salons and
-- barbershops. Those searchers are PRE-VISIT and comparing — nobody searching
-- "blake charles salon reviews" has decided yet. Google shows one business at a
-- time by design; the thing a directory can do that a single listing cannot is
-- put three of them side by side.
--
-- NO ACCOUNT REQUIRED, BY DESIGN. A shortlist starts in the browser's
-- localStorage and only reaches this table when the visitor asks to save or
-- share it. That is the moment the artifact becomes worth keeping, which is the
-- moment an email address is a fair exchange rather than an interruption. Rows
-- here therefore represent an intent that was acted on, not every visitor.

CREATE TABLE IF NOT EXISTS public.shortlists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The shareable half of the URL: /shortlist/{share_token}. Random and
  -- unguessable rather than sequential, because a shortlist can carry an email
  -- address and enumerable tokens would expose every saved list.
  share_token   TEXT NOT NULL UNIQUE,

  -- NULL until the visitor saves. A shortlist can be shared by link without
  -- ever giving us an address.
  email         TEXT,
  name          TEXT,

  -- The businesses, as [{entity_type, entity_id, slug, name, added_at}].
  -- Denormalised on purpose: a shortlist is a snapshot of a decision, and it
  -- should still render if a listing is later renamed or removed. The rating
  -- and distance are re-read live at render time, since those SHOULD be current.
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Idea 2, reduced to what the data supports. We hold no service-level data
  -- for salons or shops — booksy_services lives on the BARBERS table, and
  -- custom_amenities is populated on 4 rows out of 5,213 — so we cannot filter
  -- by service. We can ask what someone is booking and record it, which is what
  -- tells us which service data is worth acquiring and in what order.
  service_intent TEXT,

  -- Idea 3: the review ask, timed for after the visit rather than during
  -- research. Opt-in only, and the sent stamp makes the cron idempotent.
  followup_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  followup_after  TIMESTAMPTZ,
  followup_sent_at TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shortlists_share_token_idx ON public.shortlists (share_token);
-- The cron's exact predicate: opted in, due, not yet sent.
CREATE INDEX IF NOT EXISTS shortlists_followup_due_idx
  ON public.shortlists (followup_after)
  WHERE followup_opt_in = TRUE AND followup_sent_at IS NULL;

-- Service demand, recorded per answer rather than only on saved shortlists.
--
-- Separate from `shortlists` because most people who answer "what are you
-- booking?" will never save a list, and the demand signal is the whole point of
-- asking. Deliberately carries NO identifier for the person — this is a counter
-- of what people want in a city, not a profile of who wanted it.
CREATE TABLE IF NOT EXISTS public.service_demand (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL,
  entity_type  TEXT CHECK (entity_type IN ('shop', 'salon')),
  city         TEXT,
  -- The page the question was answered on, so we can tell whether demand
  -- concentrates around particular businesses.
  entity_slug  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_demand_service_idx ON public.service_demand (service, city);

-- Service-role only, matching shearquery_reviews and community_member_entity_links.
-- `email` must never be reachable through a direct anon-key REST call even
-- though the shortlist contents are public to anyone holding the link; all reads
-- and writes go through app/api/shortlist, which strips email before responding.
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON public.shortlists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON public.service_demand
  FOR ALL TO service_role USING (true) WITH CHECK (true);
