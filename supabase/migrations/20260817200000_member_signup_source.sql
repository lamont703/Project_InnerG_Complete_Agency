-- Where a member actually came from.
--
-- THE MEASUREMENT THAT DOES NOT EXIST. The strategy question on the table is
-- whether AI Mode is a membership funnel. It cannot be answered: the AI Mode
-- signup prompt links to /membership?for=student, which is byte-identical to
-- every other student link on the site, so an AI-Mode signup is
-- indistinguishable from a kit-list one the moment it lands.
--
-- Seven members exist and not one of them can be attributed. Any decision to
-- route traffic toward the agent would be a bet with no scoreboard.
--
-- FREE TEXT, NOT AN ENUM, on purpose. The entry points are still being added —
-- AI Mode, school pages, kit lists, the booking flow, the GBP audit — and a
-- CHECK constraint would turn "we shipped a new CTA" into "the signup 500s".
-- The cost of a typo here is a messy GROUP BY; the cost of a constraint is a
-- broken signup.
ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS signup_source TEXT;

COMMENT ON COLUMN public.community_members.signup_source IS
  'Which surface produced this signup (ai_mode, school_page, kit_list, booking...). Set from the src query param. Free text by design — see 20260817140000.';

-- The attribution query: members by source, newest first.
CREATE INDEX IF NOT EXISTS community_members_signup_source_idx
  ON public.community_members (signup_source, created_at DESC)
  WHERE signup_source IS NOT NULL;
