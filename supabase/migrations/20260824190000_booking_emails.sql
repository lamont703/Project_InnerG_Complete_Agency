-- Raw booking-notification emails, before anyone knows what is in them.
--
-- THE POINT OF THIS TABLE IS TO FIND OUT. Booking platforms have no usable
-- third-party API, so the plan is to have providers point their notification
-- address at us and read the appointment out of the mail. Nobody has seen those
-- emails yet, so a normalised appointments schema right now would be a guess
-- dressed as a design.
--
-- RAW IS STORED FIRST AND KEPT FOREVER. The parse will be wrong at the start —
-- that is the nature of the exercise. If only the parse were kept, every
-- improvement to the prompt would need a fresh batch of emails and weeks of
-- waiting. Keeping the original means the whole history can be reprocessed in
-- seconds, as many times as it takes.
--
-- THE PARSE IS JSONB, NOT COLUMNS, for the same reason. Columns encode a claim
-- about which fields always exist, and that claim cannot be made from zero
-- samples. Once fifty of these have landed and something is reliably present in
-- all of them, THAT is when it earns a column and an index.
create table if not exists public.booking_emails (
  id uuid primary key default gen_random_uuid(),

  -- Which provider's address it arrived at. The token is per-shop and random,
  -- because a guessable address lets anyone inject fake appointments — noise in
  -- the analytics today, and a poisoned instruction once we act on the
  -- cancellation links these mails carry.
  token text,
  to_address text,
  from_address text,
  subject text,

  -- Everything the webhook was handed, verbatim and unedited. When a parse
  -- looks wrong the first question is always "what did we actually receive",
  -- and a tidied copy cannot answer it.
  raw jsonb not null,
  text_body text,
  html_body text,

  -- Provider's own id, when there is one. Inbound webhooks retry, and the same
  -- notification arriving twice must not become two appointments.
  provider_message_id text,

  -- Written by scripts/parse_booking_emails.js, never by the webhook. Receiving
  -- and interpreting are separate jobs: the parser can then be re-run over the
  -- same messages while the prompt is tuned, without touching intake.
  parsed jsonb,
  parse_version integer,
  parse_error text,
  parsed_at timestamptz,

  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Dedupe on the provider's id where one exists. Partial, because a payload
-- without an id must still be storable — dropping it would lose exactly the
-- unusual mail worth studying.
create unique index if not exists booking_emails_provider_msg_idx
  on public.booking_emails (provider_message_id)
  where provider_message_id is not null;

create index if not exists booking_emails_token_idx on public.booking_emails (token, received_at desc);
-- Finds everything still to be parsed, and everything parsed by an older prompt.
create index if not exists booking_emails_unparsed_idx on public.booking_emails (parse_version, received_at);

comment on table public.booking_emails is
  'Raw booking-platform notification emails. Discovery phase: raw is authoritative, parsed is a JSONB experiment written by a re-runnable script.';

-- Client names, phone numbers and cancellation links belong to the shop's
-- customers, not to us. No policy is defined, so with RLS on nothing but the
-- service role can read a row.
alter table public.booking_emails enable row level security;

-- Which shop an address belongs to. Separate from the mail itself so a token can
-- be rotated or revoked without touching the messages it already collected.
create table if not exists public.booking_email_tokens (
  token text primary key,
  entity_type text,
  entity_id uuid,
  community_member_id uuid,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booking_email_tokens enable row level security;
