-- The hour and attendance engine: the system of record for a clock-hour school.
--
-- WHY THIS IS THE SPINE AND NOT A FEATURE. A barber or cosmetology school does
-- not run on grades, it runs on hours. Completion, transcripts, TDLR reporting,
-- the distance-education ceilings, the §83.72(w) monthly cap, eligibility to
-- sit the written exam at 900 hours — every one of them is a query over this
-- table. Anything built before it is guessing.
--
-- ============================================================================
-- PUNCHES ARE THE RECORD. HOURS ARE DERIVED.
-- ============================================================================
-- The single most important decision here. Storing "Ana earned 6 hours on
-- Tuesday" is storing a conclusion; storing "Ana clocked in at 08:57 and out at
-- 15:04" is storing evidence. An inspector asking how a number was reached can
-- be answered from the second and cannot be answered from the first.
--
-- It also means a correction never overwrites history. A wrong punch is voided
-- with a reason and a person attached, and the original stays readable. Schools
-- lose licenses over hour records that cannot be explained, not over hour
-- records that were once wrong.
--
-- MINUTES ARE STORED EXACT. No rounding at rest. Schools round differently and
-- TDLR reporting may round differently again, so rounding is a reporting
-- decision applied on the way out — never baked into the evidence.

-- ---------------------------------------------------------------------------
-- The school, and what it teaches
-- ---------------------------------------------------------------------------
create table if not exists public.sis_schools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- The TDLR establishment license, not an operator license.
  license_number  text,
  state           text not null default 'TX',
  -- Fortnightly? Weekly? Irrelevant here, but the timezone is not: every
  -- "day" and "calendar month" boundary below is computed in it, and a school
  -- in El Paso closes an hour after one in Houston.
  timezone        text not null default 'America/Chicago',
  created_at      timestamptz not null default now()
);

create table if not exists public.sis_programs (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.sis_schools(id) on delete cascade,
  name            text not null,
  -- Mirrors 16 TAC §83.202(a): a course is a core block plus a specialty block,
  -- and the distance ceilings apply to each separately. Storing the split makes
  -- the ceiling check a subtraction instead of a special case.
  total_hours     integer not null,
  core_hours      integer not null,
  specialty_hours integer not null,
  -- The distance ceilings for THIS program. Defaulted from the rule rather
  -- than hardcoded in code, because a school in another state has different
  -- ones and the engine should not need editing to serve them.
  core_distance_cap      integer,
  specialty_distance_cap integer,
  created_at      timestamptz not null default now(),
  constraint sis_programs_split check (core_hours + specialty_hours = total_hours)
);

create table if not exists public.sis_students (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.sis_schools(id) on delete cascade,
  program_id      uuid not null references public.sis_programs(id),

  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,

  -- The badge or PIN a student uses at the clock. Unique per school, not
  -- globally: two schools will both have a student 1001.
  clock_code      text not null,

  enrolled_on     date not null,
  status          text not null default 'active'
                  check (status in ('active','on_leave','withdrawn','graduated')),
  withdrawn_on    date,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists sis_students_clock_code_idx
  on public.sis_students (school_id, clock_code);
create index if not exists sis_students_active_idx
  on public.sis_students (school_id, status);

-- ---------------------------------------------------------------------------
-- The punches
-- ---------------------------------------------------------------------------
create table if not exists public.sis_punches (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.sis_students(id) on delete cascade,

  punched_in_at   timestamptz not null,
  -- NULL means still on the clock. Exactly one open punch per student is
  -- enforced by the partial unique index below, because two open punches make
  -- every hour total after them meaningless.
  punched_out_at  timestamptz,

  -- What kind of hour this is. Both matter and they are independent: theory
  -- can be delivered on campus or at a distance, practical can only ever be on
  -- campus, and the ceilings are about modality while completion is about kind.
  kind          text not null check (kind in ('theory','practical')),
  modality      text not null check (modality in ('campus','distance')),
  segment       text not null check (segment in ('core','specialty')),

  -- Who validated it. NACCAS VI.02 element 1 wants measurable,
  -- instructor-validated participation for distance hours specifically, so an
  -- unvalidated distance punch is a compliance question rather than a
  -- bookkeeping one. Enforced in the engine, not here, so a school can still
  -- record the punch and fix the validation after.
  instructor_id text,
  validated_at  timestamptz,

  source        text not null default 'kiosk'
                check (source in ('kiosk','instructor','import','admin')),

  -- Corrections VOID rather than edit. The original row keeps its timestamps
  -- and gains a reason and an author, so the trail reads as "this was wrong
  -- and here is who said so" instead of silently becoming a different fact.
  voided_at     timestamptz,
  voided_by     text,
  void_reason   text,

  created_at    timestamptz not null default now()
);

-- One open punch per student. Without this a double clock-in silently doubles
-- somebody's hours for the day, and nothing downstream can detect it.
create unique index if not exists sis_punches_one_open_idx
  on public.sis_punches (student_id)
  where punched_out_at is null and voided_at is null;

create index if not exists sis_punches_student_idx
  on public.sis_punches (student_id, punched_in_at desc);
-- The ledger query: live punches only.
create index if not exists sis_punches_live_idx
  on public.sis_punches (student_id, punched_in_at)
  where voided_at is null;

-- A punch cannot end before it starts.
alter table public.sis_punches
  drop constraint if exists sis_punches_ordered;
alter table public.sis_punches
  add constraint sis_punches_ordered
  check (punched_out_at is null or punched_out_at > punched_in_at);

-- Practical hours can never be delivered at a distance. This is 16 TAC
-- §83.202(e) and TDLR's distance-education page, and it is the one rule that
-- can be enforced by the database rather than trusted to a form.
alter table public.sis_punches
  drop constraint if exists sis_punches_no_remote_practical;
alter table public.sis_punches
  add constraint sis_punches_no_remote_practical
  check (not (kind = 'practical' and modality = 'distance'));

-- ---------------------------------------------------------------------------
-- RLS: on, no policies. Service role only, from a server route that has already
-- established who is asking — the same posture as every other table in this
-- project holding records about named people.
-- ---------------------------------------------------------------------------
alter table public.sis_schools  enable row level security;
alter table public.sis_programs enable row level security;
alter table public.sis_students enable row level security;
alter table public.sis_punches  enable row level security;
