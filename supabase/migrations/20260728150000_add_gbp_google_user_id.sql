-- Google's stable user id (the id_token `sub`) for a GBP connection.
--
-- Needed for Cross-Account Protection: the security events Google pushes to us
-- (token revoked, account disabled/purged, sessions revoked) identify the person
-- by `iss` + `sub`, not by email. We only stored google_account_email, which is
-- both mutable and not what the events carry, so an incoming revocation had
-- nothing to match against. `sub` never changes for a Google account, even if
-- the address does.
--
-- Nullable and backfilled naturally: existing connections pick it up the next
-- time their owner reconnects. Until then those rows fall back to email matching
-- in the RISC receiver, which is best-effort.
ALTER TABLE public.gbp_connections
  ADD COLUMN IF NOT EXISTS google_user_id text;

CREATE INDEX IF NOT EXISTS gbp_connections_google_user_idx
  ON public.gbp_connections (google_user_id);
