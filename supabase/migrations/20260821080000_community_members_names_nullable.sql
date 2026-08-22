-- first_name AND last_name BECOME NULLABLE, because two separate paths already
-- assume they are and neither can succeed while they are not.
--
-- 1. app/auth/callback inserts them as NULL ON PURPOSE. Its own comment says
--    so: "Name comes from the conversion later if we have one; an empty string
--    here would be worse than null for anything that renders it." That insert
--    has therefore been failing 23502 for every magic-link arrival, and the
--    route never checks the error — `const { data: created }` with no error
--    branch — so it fails silently and the person signs in as nobody. All seven
--    members that exist today came in through paths that supply names, which is
--    exactly why nothing surfaced it.
--
-- 2. The Instagram DM agent has an email and no name at the moment someone
--    accepts. It can often do better (see below), but "often" is not "always"
--    and the fallback has to be storable.
--
-- WHY NULL RATHER THAN AN EMPTY STRING. They mean different things and only one
-- of them is true. Empty string asserts we asked and got nothing; null says we
-- never had it. Anything rendering a name has to handle the absent case either
-- way, and null is the value that will not quietly print as a blank where a
-- name belongs.
--
-- WHAT THE DM AGENT DOES WITH THIS. Before falling back it asks Instagram for
-- the sender's display name, which is available for anyone who has messaged the
-- account — for the first real thread this returned "Inner G Complete Fitness".
-- So the common case stores a genuine name and the null is reserved for when
-- the lookup fails, rather than being the normal outcome.
--
-- email stays NOT NULL and UNIQUE. It is the join key for this table (see the
-- note in app/auth/callback about the member's verified email being what
-- /account/my-requests reads booking_requests by), and a member with no email
-- would be unreachable and unmatchable — which is a different thing entirely
-- from a member whose name we do not happen to know.

ALTER TABLE public.community_members ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.community_members ALTER COLUMN last_name DROP NOT NULL;

COMMENT ON COLUMN public.community_members.first_name IS
  'NULL means we never had it, not that it is blank. Magic-link arrivals store NULL by design; the Instagram DM agent fills it from the sender Instagram display name when that lookup succeeds.';
