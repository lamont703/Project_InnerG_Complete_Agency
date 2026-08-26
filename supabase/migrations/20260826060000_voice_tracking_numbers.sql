-- A per-school inbound number, so the school is known before anyone speaks.
--
-- WHY THIS EXISTS: a phone call carries two facts — who is calling, and what
-- number was dialled. With one shared number the second is constant, so the
-- school can only be discovered by ASKING. That is information theory, not a
-- platform limit, and no amount of agent cleverness gets around it.
--
-- Giving each school page its own number moves the school from something the
-- caller has to say into something the call already knows, which is what lets
-- the first question be about the department instead.
--
-- Nullable on purpose: a school with no number of its own still works, it just
-- falls back to being asked. The shared number keeps working exactly as before.
alter table public.school_call_routing
  add column if not exists tracking_number text;

create unique index if not exists school_call_routing_tracking_number_idx
  on public.school_call_routing (tracking_number)
  where tracking_number is not null;

-- Billing now reads the DIALLED leg, so record it.
alter table public.school_calls
  add column if not exists dial_status text,
  add column if not exists dial_duration_seconds integer,
  add column if not exists confirmed_department text;

comment on column public.school_calls.duration_seconds is
  'Whole inbound leg INCLUDING the agent prompt and ringing. Not the billing basis.';
comment on column public.school_calls.dial_duration_seconds is
  'The school leg. This is what billing reads: the inbound leg is answered at the greeting now that a prompt precedes the dial, so its duration carries 20-30s of agent time that nobody should pay for.';
