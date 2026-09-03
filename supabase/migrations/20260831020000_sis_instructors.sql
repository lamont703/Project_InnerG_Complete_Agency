-- Instructors, and the signature on a distance hour.
--
-- WHY A TABLE RATHER THAN REUSING THE ADMIN IDENTITY. NACCAS VI.02 element 1
-- requires measurable, INSTRUCTOR-validated participation for distance hours.
-- The only identity the console has today is isAdmin(), which is one hardcoded
-- email belonging to the person who runs the company — not necessarily anybody
-- who taught the class. Recording that email as the validator would put a name
-- against a compliance signature that the named person did not give, which is
-- worse than having no signature at all: an unsigned hour is visibly unsigned,
-- a falsely signed one is not.
--
-- THE SIGNATURE IS ASSERTED, NOT AUTHENTICATED, and the UI says so. An
-- instructor is chosen from a list by whoever is at the keyboard behind the
-- Internal Tools password. That is weaker than each instructor having an
-- account and signing as themselves, and it is the honest interim: the record
-- shows who the school says validated the hours, and validated_at shows when
-- somebody asserted it. When instructors get accounts, this column already
-- holds the right shape.

create table if not exists public.sis_instructors (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.sis_schools(id) on delete cascade,

  name           text not null,
  -- TDLR instructor license. Nullable because a school may add somebody before
  -- the paperwork is to hand, and refusing the row would just mean the
  -- signature goes unrecorded in the meantime.
  license_number text,
  email          text,

  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists sis_instructors_school_idx
  on public.sis_instructors (school_id, active);

-- Who signed. Separate from instructor_id, which records who was SCHEDULED to
-- teach the block — the two are frequently different people, and conflating
-- "was down to teach it" with "confirmed it happened" is precisely the
-- distinction the rule is asking a school to be able to show.
alter table public.sis_punches
  add column if not exists validated_by uuid
    references public.sis_instructors(id) on delete set null;

-- A validated punch must name its validator. Enforced rather than trusted,
-- because a validated_at with no validated_by is the shape a bulk UPDATE would
-- leave behind, and it would read as signed.
alter table public.sis_punches
  drop constraint if exists sis_punches_validation_attributed;
alter table public.sis_punches
  add constraint sis_punches_validation_attributed
  check (validated_at is null or validated_by is not null);

alter table public.sis_instructors enable row level security;

-- A NOTE ON THE EXISTING instructor_id COLUMNS. Both sis_punches and
-- sis_schedule_blocks carry an `instructor_id text` predating this table, and
-- nothing writes either one — the seed sets no instructor on a block, so the
-- value copied onto every punch is null. They are left as they are rather than
-- converted, because a text column nobody populates is inert, whereas a foreign
-- key nobody populates invites the reader to trust an empty relationship.
-- If assigning an instructor to a timetable block becomes a real requirement,
-- that is the moment to add a proper reference and backfill it.
