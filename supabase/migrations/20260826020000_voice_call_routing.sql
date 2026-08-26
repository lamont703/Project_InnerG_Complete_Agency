-- Call routing for the school lead product.
--
-- One public number answers, an agent works out which school and what the call
-- is about, and the call is bridged to that school's ONE number with a whisper
-- carrying the department. The department is REPORTED, never routed to — that
-- decision is why there are no per-department numbers here, and it is what
-- keeps a wrong intent guess cosmetic instead of sending someone to the wrong
-- extension.

create table if not exists public.school_call_routing (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null,
  -- which table school_id points at; there is no FK because the two school
  -- tables are separate and a polymorphic FK cannot be expressed.
  school_type         text not null check (school_type in ('barber','cosmetology')),
  school_name         text not null,
  -- what the agent says out loud; often shorter than the legal name.
  greeting_name       text not null,
  destination_number  text not null,
  -- ALWAYS populated and always equal to destination_number today. Kept
  -- separate because fail-open must not depend on the routing lookup having
  -- worked; when departments ever get their own numbers this stays the trunk.
  main_number         text not null,
  -- what a caller might actually SAY. Recognition across 1,185 school names is
  -- hopeless; across the handful we are paid to route for it is easy, which is
  -- the only reason one shared number is viable.
  voice_match_phrases text[] not null default '{}',
  -- canonical intent -> this school's own word for it, used in the whisper.
  department_labels   jsonb not null default '{}'::jsonb,
  status              text not null default 'active' check (status in ('active','paused')),
  activated_at        timestamptz not null default now(),
  deactivated_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists school_call_routing_active_idx
  on public.school_call_routing (status) where status = 'active';

create table if not exists public.school_calls (
  id                  uuid primary key default gen_random_uuid(),
  routing_id          uuid references public.school_call_routing(id) on delete set null,
  -- Twilio's CallSid for the INBOUND leg. A PLAIN unique index, deliberately
  -- not a partial one: PostgREST cannot use a partial index for ON CONFLICT
  -- and fails with 42P10, which has already cost this repo two rounds.
  provider_call_id    text not null unique,
  from_number         text,
  to_number           text,
  routed_to           text,
  -- how confident we are this call belongs to this school. Billing may exclude
  -- guesses; with one shared number the school is an INFERENCE, not the fact
  -- it would be if each school had its own number.
  school_matched_by   text not null default 'fallback'
                      check (school_matched_by in ('confident','guess','fallback')),
  department_intent   text check (department_intent in ('admissions','financial_aid','education')),
  intent_captured     text,
  whisper_text        text,
  answered            boolean not null default false,
  status              text,
  -- measured on the INBOUND leg. With answerOnBridge the inbound leg is not
  -- answered until the two sides are actually bridged, so this is conversation
  -- time. The outbound leg includes ringing and the whisper, and billing on it
  -- would charge schools for their own phone ringing.
  duration_seconds    integer,
  -- a SNAPSHOT, never recomputed. Changing the threshold must not silently
  -- rewrite last month's invoice.
  billable            boolean not null default false,
  source_context      jsonb not null default '{}'::jsonb,
  started_at          timestamptz,
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists school_calls_routing_started_idx
  on public.school_calls (routing_id, started_at desc);
create index if not exists school_calls_billable_idx
  on public.school_calls (routing_id, billable) where billable;

-- Both tables hold caller phone numbers. Service role only.
alter table public.school_call_routing enable row level security;
alter table public.school_calls        enable row level security;

insert into public.school_call_routing
  (school_id, school_type, school_name, greeting_name, destination_number, main_number, voice_match_phrases, department_labels)
values
  ('6a028272-ca98-4a13-8d20-4e0bd311fa55','barber','Illumination Barber School LLC','Illumination Barber School',
   '+18322123361','+18322123361',
   array['illumination','illumination barber','illumination barber school'],
   '{"admissions":"admissions","financial_aid":"financial aid","education":"student services"}'::jsonb),
  ('846273a2-dcc3-4e71-83a0-4ad6c4414de6','barber','Houston Barber School','Houston Barber School',
   '+12818210681','+12818210681',
   array['houston barber','houston barber school','houston barber college'],
   '{"admissions":"admissions","financial_aid":"financial aid","education":"student services"}'::jsonb),
  ('021dda43-ff54-4ffb-b226-b2fc75a6c39c','cosmetology','Career Schools Of Texas','Career Schools of Texas',
   '+18327424451','+18327424451',
   array['career schools','career school','career schools of texas','career schools texas'],
   '{"admissions":"admissions","financial_aid":"financial aid","education":"student services"}'::jsonb)
on conflict do nothing;
