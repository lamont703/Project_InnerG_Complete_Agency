-- Calling a shop the text could not reach.
--
-- WHY VOICE IS THE RIGHT SECOND CHANNEL HERE, and not just another channel.
-- The failure this answers is specific: GHL reports "DND is active for SMS",
-- which in practice means a LANDLINE. A landline is not unreachable — it is
-- unreachable BY TEXT. It answers calls perfectly. So voice is not redundancy,
-- it is the one channel that works on exactly the numbers SMS cannot touch.
--
-- ONE ROW PER ATTEMPT, not per booking. Whether we called, when, what Twilio
-- said, and whether a machine picked up are all facts about an attempt. A
-- single "called_at" column on booking_requests could not answer "did the
-- second attempt reach a person" — and that is the question worth asking
-- before a human spends time on it.

create table if not exists public.booking_voice_calls (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.booking_requests(id) on delete cascade,

  -- Where it actually dialled. Stored rather than joined back through the
  -- booking, because a test run redirects the call to a safe number and the
  -- log has to say where it really went.
  to_number     text not null,
  from_number   text not null,

  attempt       integer not null default 1,

  -- Twilio's call SID, so a call can be looked up in their console. Null when
  -- the create request itself failed.
  call_sid      text,

  status        text not null default 'queued'
                check (status in ('queued','initiated','ringing','answered','completed','failed','no_answer','busy','canceled')),

  -- Twilio's answering-machine detection: 'human', 'machine_end_beep',
  -- 'machine_end_silence', 'fax', 'unknown'. Free text — Twilio has added
  -- values before and an enum would reject a call we successfully made.
  answered_by   text,

  duration_seconds integer,
  error         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists booking_voice_calls_booking_idx
  on public.booking_voice_calls (booking_id, created_at desc);
create index if not exists booking_voice_calls_sid_idx
  on public.booking_voice_calls (call_sid) where call_sid is not null;

alter table public.booking_voice_calls enable row level security;
