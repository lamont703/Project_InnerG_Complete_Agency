-- The student portal, and self-paced distance learning.
--
-- WHAT PROBLEM THIS SOLVES. The timetable has a Monday evening online block
-- and, until now, no way for anybody to be in it: the only clock was a tablet
-- on a wall at the school. Distance hours could never accrue, so the sign-off
-- queue could never have anything in it.
--
-- THE DESIGN DECISION THAT SHAPES EVERYTHING ELSE. A distance punch can only be
-- opened by opening a lesson, and it closes when the lesson is left. There is
-- no free-standing "clock in from home" button, because that is a clock with
-- nothing behind it — and an hour whose only evidence is that a timer ran is
-- exactly the hour NACCAS VI.02 element 1 refuses to accept. Tying the punch to
-- the lesson means every distance minute has coursework attached by
-- construction rather than by discipline.

-- ---------------------------------------------------------------------------
-- Students get an account
-- ---------------------------------------------------------------------------

-- The claim token, NOT the clock code, is what gets a student their account.
-- The clock code is four digits, which is fine at a door where you have to be
-- standing in the building, and nowhere near enough over the open internet
-- where ten thousand guesses is a script. Same reasoning as the credit-report
-- worker invites, and the same shape: 20 random bytes.
alter table public.sis_students
  add column if not exists user_id      uuid,
  add column if not exists claim_token  text,
  add column if not exists claimed_at   timestamptz;

-- One account per student and one student per account. Without this a second
-- claim could quietly attach a stranger to somebody's hour record.
create unique index if not exists sis_students_user_idx
  on public.sis_students (user_id) where user_id is not null;
create unique index if not exists sis_students_claim_token_idx
  on public.sis_students (claim_token) where claim_token is not null;

-- ---------------------------------------------------------------------------
-- Lessons
-- ---------------------------------------------------------------------------

-- A lesson belongs to a SCHEDULE BLOCK, not just to a program. That is what
-- makes a lesson's hours land in the right segment and modality without anybody
-- choosing: the block already says "core theory, distance", the engine already
-- refuses a distance practical, and the monthly and distance ceilings already
-- read those fields. A lesson floating free of the timetable would need its own
-- parallel copy of all of that.
create table if not exists public.sis_lessons (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.sis_schools(id) on delete cascade,
  program_id         uuid not null references public.sis_programs(id) on delete cascade,
  schedule_block_id  uuid not null references public.sis_schedule_blocks(id) on delete cascade,

  title              text not null,
  summary            text,
  position           integer not null default 0,
  -- What the school expects this to take. Shown to the student as a guide and
  -- used as the denominator when a session looks implausibly short or long.
  estimated_minutes  integer not null default 60 check (estimated_minutes > 0),

  -- Unpublished lessons are invisible to students. A half-written lesson that
  -- a student can open is a half-written lesson that generates hours.
  published          boolean not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists sis_lessons_block_idx
  on public.sis_lessons (schedule_block_id, published, position);

create table if not exists public.sis_lesson_sections (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.sis_lessons(id) on delete cascade,
  position    integer not null default 0,

  title       text not null,
  body        text not null default '',

  -- An optional comprehension check. Four options, one correct.
  --
  -- THIS IS THE "MEASURABLE" IN "MEASURABLE PARTICIPATION". A section a student
  -- scrolled past produces a timestamp and nothing else; a section with a
  -- question produces an answer that was either right or wrong, which is
  -- something an instructor can actually look at before signing.
  question    text,
  options     jsonb,
  answer_index integer,

  created_at  timestamptz not null default now(),

  -- Half a question is worse than none: it renders an unanswerable prompt and
  -- records nothing.
  constraint sis_lesson_sections_question_complete check (
    question is null
    or (options is not null and answer_index is not null
        and jsonb_typeof(options) = 'array'
        and answer_index >= 0
        and answer_index < jsonb_array_length(options))
  )
);

create index if not exists sis_lesson_sections_lesson_idx
  on public.sis_lesson_sections (lesson_id, position);

-- ---------------------------------------------------------------------------
-- What the student actually did
-- ---------------------------------------------------------------------------

-- Progress is recorded AGAINST A PUNCH, not just against a student. That link
-- is the whole point: it is what lets the sign-off queue show an instructor
-- "this three-hour session produced these six completed sections and these four
-- correct answers" rather than "a timer ran for three hours".
create table if not exists public.sis_lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.sis_students(id) on delete cascade,
  section_id    uuid not null references public.sis_lesson_sections(id) on delete cascade,
  punch_id      uuid references public.sis_punches(id) on delete set null,

  completed_at  timestamptz not null default now(),
  answer_index  integer,
  correct       boolean,

  -- First completion stands. Re-reading a section later is fine and should not
  -- rewrite which session earned the hour, nor let a wrong answer be quietly
  -- turned into a right one.
  unique (student_id, section_id)
);

create index if not exists sis_lesson_progress_punch_idx
  on public.sis_lesson_progress (punch_id);

-- Engaged minutes.
--
-- WHY A ROW PER MINUTE RATHER THAN A RUNNING TOTAL. A counter can only be
-- incremented, and a client that increments it is a client that can lie in a
-- loop. A row per distinct minute, uniquely constrained, cannot be inflated by
-- sending the same heartbeat a thousand times — the minute is either present or
-- it is not, and 60 minutes of wall clock can hold at most 60 of them.
--
-- THIS IS THE ANSWER TO "THE STUDENT CLOCKED IN AND WALKED AWAY". The punch
-- says three hours; these rows say how many of those minutes had somebody at
-- the keyboard. The two numbers are both shown, and never merged.
create table if not exists public.sis_activity_minutes (
  punch_id    uuid not null references public.sis_punches(id) on delete cascade,
  minute_at   timestamptz not null,
  primary key (punch_id, minute_at)
);

-- ---------------------------------------------------------------------------
-- A punch opened by a lesson is not a punch made at the kiosk
-- ---------------------------------------------------------------------------

-- The source column existed with four values, all of which describe somebody at
-- the school. A self-paced session started from a student's own kitchen is a
-- fifth thing, and recording it as "kiosk" would put a false statement about
-- where the hour happened into the one field that answers that question.
alter table public.sis_punches drop constraint if exists sis_punches_source_check;
alter table public.sis_punches
  add constraint sis_punches_source_check
  check (source in ('kiosk','instructor','import','admin','lesson'));

alter table public.sis_lessons          enable row level security;
alter table public.sis_lesson_sections  enable row level security;
alter table public.sis_lesson_progress  enable row level security;
alter table public.sis_activity_minutes enable row level security;
