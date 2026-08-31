-- Instructors become real: accounts, timetable assignments, and an honest
-- record of how a signature was given.
--
-- WHAT THIS CHANGES ABOUT THE SIGNATURE. Until now anyone behind the Internal
-- Tools password could sign as anyone on the instructor list. The page said so,
-- which was the right thing to do about a weakness but not a fix. An instructor
-- with their own account signs as themselves, and the record now says which of
-- the two happened rather than rendering both identically.
--
-- BOTH ARE STILL ALLOWED. An admin signing on an instructor's behalf is a real
-- need — somebody is on holiday, somebody has left — and refusing it would just
-- mean the hours go unsigned. What must not happen is the two being
-- indistinguishable afterwards.

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

alter table public.sis_instructors
  add column if not exists user_id     uuid,
  add column if not exists claim_token text,
  add column if not exists claimed_at  timestamptz;

create unique index if not exists sis_instructors_user_idx
  on public.sis_instructors (user_id) where user_id is not null;
create unique index if not exists sis_instructors_claim_token_idx
  on public.sis_instructors (claim_token) where claim_token is not null;

-- One person is a student or an instructor at this school, not both. The
-- partial unique indexes above cannot express that across two tables, so it is
-- enforced in the claim path — recorded here because it is the kind of rule
-- that gets rediscovered the hard way.

-- ---------------------------------------------------------------------------
-- The timetable can finally name who teaches
-- ---------------------------------------------------------------------------

-- These columns were `text` from before sis_instructors existed, and nothing
-- ever wrote to either: verified against the live database before this
-- migration was written — 20 schedule blocks and 0 punches, instructor_id set
-- on none of them. That is what makes the retype safe; a single non-uuid string
-- would abort it halfway.
alter table public.sis_schedule_blocks
  alter column instructor_id type uuid using instructor_id::uuid;
alter table public.sis_punches
  alter column instructor_id type uuid using instructor_id::uuid;

alter table public.sis_schedule_blocks
  drop constraint if exists sis_schedule_blocks_instructor_fk;
alter table public.sis_schedule_blocks
  add constraint sis_schedule_blocks_instructor_fk
  foreign key (instructor_id) references public.sis_instructors(id) on delete set null;

alter table public.sis_punches
  drop constraint if exists sis_punches_instructor_fk;
alter table public.sis_punches
  add constraint sis_punches_instructor_fk
  foreign key (instructor_id) references public.sis_instructors(id) on delete set null;

-- ---------------------------------------------------------------------------
-- How the signature was given
-- ---------------------------------------------------------------------------

-- 'instructor'        — the named instructor was signed in and signed for it.
-- 'asserted_by_admin' — somebody with console access signed on their behalf.
--
-- NULLABLE, because rows signed before this column existed cannot be assigned
-- either value honestly. A default of 'asserted_by_admin' would have been
-- convenient and would have invented a fact about signatures already given.
alter table public.sis_punches
  add column if not exists validated_method text;

alter table public.sis_punches
  drop constraint if exists sis_punches_validated_method_check;
alter table public.sis_punches
  add constraint sis_punches_validated_method_check
  check (validated_method is null or validated_method in ('instructor', 'asserted_by_admin'));

comment on column public.sis_punches.validated_method is
  'How the signature was given: instructor = the named instructor was signed in; asserted_by_admin = console operator signed on their behalf. Null for signatures predating this column.';
