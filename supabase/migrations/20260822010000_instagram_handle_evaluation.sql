-- RECORDING WHICH SCRAPED HANDLES HAVE ACTUALLY BEEN LOOKED AT.
--
-- 1,141 Instagram handles are on file and ZERO have confirmed_at set. Every one
-- rests on a name regex, and the rule this project already holds is that a
-- handle may not be tagged until it is verified: "tagging the wrong account is
-- a mistake made in public, with a stranger's name on it."
--
-- A 9-handle sample of the HIGHEST-confidence band (name_match_score >= 0.8)
-- came back at roughly a third wrong:
--
--   6 correct        the shop's own account
--   2 personal       bensluxe is "Ben Herrera", in.his.image_barber is
--                    "Ernest Garcia Jr." - the barber, not the business
--   1 dead           dieselbarbershop: blank name, 17 followers, ZERO posts,
--                    a squat on a national franchise name that scored 0.9
--
-- So the score alone cannot gate tagging, and the failures are not exotic -
-- they are the two traps already written down plus dead accounts.
--
-- WHY NEW COLUMNS RATHER THAN REUSING confirmed_at. That column means a PERSON
-- checked, or the account replied to us (confirmed_via) - evidence from the
-- outside world. These record what OUR evaluation concluded, which is a weaker
-- claim and must not be able to masquerade as the stronger one. A handle that
-- passes the offline checks is "not obviously wrong", which is not the same as
-- "confirmed", and the day someone conflates the two is the day we tag a
-- stranger.
--
-- evaluated_at also exists so batches do not re-examine the same rows. Without
-- it "run it again" means "do the first 50 again, forever".

alter table public.entity_social_profiles
  add column if not exists evaluated_at timestamptz,
  -- 'offline'  = decided from data we already hold (name, vendor list, reuse
  --              across entities). No network call, no Instagram traffic.
  -- 'page_read' = someone opened the profile and read it.
  add column if not exists evaluation_method text
    check (evaluation_method is null or evaluation_method in ('offline', 'page_read')),
  -- 'pass'          = nothing offline disqualifies it. NOT a confirmation.
  -- 'reject'        = disqualified; rejected_reason says why.
  -- 'needs_review'  = only a human or a page read can settle it. This is the
  --                   expected outcome for most rows, and that is correct -
  --                   the offline checks are designed to be sure when they
  --                   speak and silent when they cannot be.
  add column if not exists evaluation_verdict text
    check (evaluation_verdict is null or evaluation_verdict in ('pass', 'reject', 'needs_review'));

-- The batch predicate: what has not been looked at yet.
create index if not exists entity_social_profiles_unevaluated_idx
  on public.entity_social_profiles (platform, evaluated_at)
  where evaluated_at is null;

create index if not exists entity_social_profiles_verdict_idx
  on public.entity_social_profiles (evaluation_verdict)
  where evaluation_verdict is not null;

comment on column public.entity_social_profiles.evaluation_verdict is
  'What OUR checks concluded. "pass" means not obviously wrong - it is NOT confirmed_at, which requires a person or a reply from the account itself. Nothing may be tagged on a pass alone.';
