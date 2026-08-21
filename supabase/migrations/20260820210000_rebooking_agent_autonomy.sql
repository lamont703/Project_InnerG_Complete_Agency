-- TURNING THE AGENT ON, AND BEING ABLE TO CHECK WHAT IT DID.
--
-- Two tables, and the second is the more important one.
--
-- rebooking_agent_settings is the switch. A single row, so there is exactly one
-- answer to "is it on" and no chance of two rows disagreeing.
--
-- rebooking_agent_decisions is the audit trail, and it records EVERY client the
-- agent considered - including the ones it did not message and why. A log of
-- sends alone answers "what did it do" and cannot answer "why didn't it text
-- Cymone", which is the question actually asked when something looks wrong. A
-- skip is a decision the agent made and it belongs in the record.
--
-- WHY DECISIONS ARE SEPARATE FROM rebooking_outreach. That table feeds
-- attribution and holds one row per message that really went out, manual or
-- automatic. This table holds the agent's reasoning, including the runs where
-- it sent nothing at all. Keeping them apart means attribution never has to
-- filter out skips, and the audit trail never has to pretend a skip was a send.

create table if not exists public.rebooking_agent_settings (
  -- Singleton. The primary key is a constant, so a second row cannot exist.
  id boolean primary key default true check (id),

  -- THE KILL SWITCH. False means the run loop exits before it looks at a single
  -- client, and it is checked at the top of every run rather than cached.
  enabled boolean not null default false,

  -- Composes and logs everything, sends nothing. The setting to leave on for a
  -- week before trusting it with a real client.
  dry_run boolean not null default true,

  -- A bug that texts 89 people at 3am is unrecoverable in a way that a bug
  -- which texts 4 is not. The cap is the blast radius.
  daily_cap integer not null default 5 check (daily_cap >= 0 and daily_cap <= 50),

  -- 'sms' or 'sms_and_email'. Defaults to SMS only: rebooking is a phone
  -- behaviour, and of the clients currently due only a fraction have SMS
  -- consent, so automating email adds machinery to the weaker channel.
  channels text not null default 'sms' check (channels in ('sms', 'sms_and_email')),

  -- The window, stored rather than hardcoded so it can be changed without a
  -- deploy. Hours are LOCAL TO send_timezone; lib/rebooking/schedule.ts does
  -- the conversion and handles daylight saving.
  send_timezone text not null default 'America/New_York',
  send_start_hour integer not null default 9 check (send_start_hour between 0 and 23),
  send_end_hour integer not null default 18 check (send_end_hour between 1 and 24),

  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.rebooking_agent_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.rebooking_agent_decisions (
  id uuid primary key default gen_random_uuid(),

  -- Groups every decision from one pass, so a run reads as a unit.
  run_id uuid not null,
  decided_at timestamptz not null default now(),

  shopify_customer_id text,
  client_name text,

  -- 'sent'        - a message really went out
  -- 'would_send'  - dry run; this is what it would have done
  -- 'skipped'     - considered and passed over, see reason
  -- 'failed'      - tried to send and the send errored
  -- 'run_halted'  - the whole run stopped (disabled, outside window, cap hit)
  decision text not null
    check (decision in ('sent', 'would_send', 'skipped', 'failed', 'run_halted')),

  -- Machine-readable so skips can be counted, not just read.
  reason text,

  channel text check (channel in ('sms', 'email', 'manual')),
  days_overdue numeric,
  annual_value numeric,

  -- The exact text, stored for the ones that went out. This is what makes the
  -- trail auditable rather than merely countable: "it sent something" is not
  -- reviewable, "it sent this" is.
  message_body text,

  error text,

  created_at timestamptz not null default now()
);

create index if not exists rebooking_agent_decisions_run_idx
  on public.rebooking_agent_decisions (run_id, decided_at);

create index if not exists rebooking_agent_decisions_recent_idx
  on public.rebooking_agent_decisions (decided_at desc);

create index if not exists rebooking_agent_decisions_customer_idx
  on public.rebooking_agent_decisions (shopify_customer_id, decided_at desc);

alter table public.rebooking_agent_settings enable row level security;
alter table public.rebooking_agent_decisions enable row level security;

comment on table public.rebooking_agent_settings is
  'Singleton switch for the autonomous rebooking agent. enabled=false is the kill switch and is re-read at the top of every run. dry_run composes and logs without sending.';
comment on table public.rebooking_agent_decisions is
  'Every client the agent considered on every run, including skips and why. A send-only log cannot answer "why was this person not contacted", which is the question asked when something looks wrong.';
