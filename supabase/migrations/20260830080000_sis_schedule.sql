-- The timetable, and why the clock reads from it.
--
-- THE SCHEDULE DECIDES WHAT KIND OF HOUR A PUNCH IS. A student at a kiosk does
-- not choose "core theory, campus" from a dropdown — they tap their code and
-- the system already knows, because at 9am Tuesday the program is running core
-- theory in room 2. That is not only kinder at the door; it removes the one
-- input a student has an incentive to get wrong, and it makes the hour ledger
-- a consequence of the timetable rather than a parallel account of it.
--
-- WEEKLY RECURRING, WITH DATES. Schools run a repeating week and change it at
-- term boundaries. effective_from/effective_to let a block be superseded
-- without deleting the one that governed hours already earned — the old block
-- is what explains an old punch, and deleting it would orphan the explanation.
--
-- MINUTES FROM MIDNIGHT, IN THE SCHOOL'S TIMEZONE. Not a timestamp: a block is
-- "09:00 to 12:00 on Tuesdays", which is a wall-clock fact that survives
-- daylight saving. Storing it as UTC times would shift every class by an hour
-- twice a year.

create table if not exists public.sis_schedule_blocks (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.sis_schools(id) on delete cascade,
  program_id    uuid not null references public.sis_programs(id) on delete cascade,

  label         text not null,

  -- 0 = Sunday, matching JavaScript's getDay and Postgres's dow.
  weekday       integer not null check (weekday between 0 and 6),
  starts_minute integer not null check (starts_minute between 0 and 1439),
  ends_minute   integer not null check (ends_minute between 1 and 1440),

  -- What a punch inside this block becomes.
  kind          text not null check (kind in ('theory','practical')),
  modality      text not null check (modality in ('campus','distance')),
  segment       text not null check (segment in ('core','specialty')),

  instructor_id text,

  effective_from date not null,
  effective_to   date,

  created_at    timestamptz not null default now(),

  constraint sis_schedule_ordered check (ends_minute > starts_minute),
  -- The same rule the punches table holds, applied a step earlier: a block that
  -- schedules remote practical could never produce a legal punch, so it should
  -- be impossible to write rather than merely impossible to honour.
  constraint sis_schedule_no_remote_practical
    check (not (kind = 'practical' and modality = 'distance'))
);

create index if not exists sis_schedule_lookup_idx
  on public.sis_schedule_blocks (program_id, weekday, starts_minute);

alter table public.sis_schedule_blocks enable row level security;

-- Which block a punch was taken under. Nullable for punches created before a
-- schedule existed, and for anything an administrator enters by hand.
alter table public.sis_punches
  add column if not exists schedule_block_id uuid
    references public.sis_schedule_blocks(id) on delete set null;
