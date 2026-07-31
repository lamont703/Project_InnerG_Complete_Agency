-- Every TDLR/GovDelivery email delivered to updates@tdlr.innergcomplete.com,
-- whether or not it was worth staging a directive for.
--
-- Two jobs:
--   1. Dedupe. GovDelivery resends, and a GHL workflow can double-fire, so the
--      same bulletin must not stage two directives. GHL's webhook payload
--      carries no Message-ID (verified against a real delivery), so the body
--      hash is the only stable identity we get.
--   2. Audit. Most TDLR bulletins are routine — meeting notices, rule-review
--      periods, subscription confirmations. Those are deliberately NOT staged,
--      because a review queue full of noise stops being read, and that queue is
--      the only thing standing between an AI reading email and the public site.
--      Logging the skips means "why didn't this show up?" is answerable.
create table if not exists tdlr_bulletin_log (
  id uuid primary key default gen_random_uuid(),

  -- SHA-256 of the normalized email body. Dedupe key.
  body_hash text not null unique,

  sender_email text,
  subject text,
  -- Real tdlr.texas.gov destinations, decoded out of GovDelivery's tracking
  -- wrappers (the true URL is embedded url-encoded, so no redirect follow).
  source_urls text[] default '{}',

  -- 'staged'  → a directive was created for human review
  -- 'skipped' → routine/administrative, deliberately not staged
  -- 'error'   → delivered but processing failed; safe to retry
  outcome text not null check (outcome in ('staged', 'skipped', 'error')),
  -- Why, in the model's own words. The reason a skip was a skip.
  outcome_reason text,

  directive_id uuid references agent_directives(id) on delete set null,
  raw_body text,
  extracted jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists tdlr_bulletin_log_created_idx
  on tdlr_bulletin_log (created_at desc);
create index if not exists tdlr_bulletin_log_outcome_idx
  on tdlr_bulletin_log (outcome, created_at desc);

-- Holds raw inbound email. No public read — unlike agent_directives, nothing
-- in the app renders this, and the service role bypasses RLS for the webhook.
alter table public.tdlr_bulletin_log enable row level security;
