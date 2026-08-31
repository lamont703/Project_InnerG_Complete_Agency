-- Which section the student was working on, minute by minute.
--
-- THE GAP THIS CLOSES, found in live data on the first student. Progress rows
-- are unique per (student, section) so that a first completion stands and a
-- wrong answer cannot be retried into a right one. That is still correct for
-- the ANSWER — but it meant a student who read the lesson ahead of class
-- permanently consumed every section, so the session they later sat during
-- class produced no coursework at all. The instructor would have been shown
-- "3h 00m clocked, 0 sections" for a student who was genuinely there.
--
-- The mistake was conflating two different facts:
--
--   COMPLETING a section — happens once, carries the answer, must not be redone.
--   WORKING during a session — happens every time, and is the participation
--                              NACCAS VI.02 element 1 actually asks about.
--
-- The heartbeat already knew WHEN somebody was working. It did not know what
-- on, so it could not evidence the second fact. Now it does.
alter table public.sis_activity_minutes
  add column if not exists section_id uuid
    references public.sis_lesson_sections(id) on delete set null;

-- The key stays (punch_id, minute_at): a minute belongs to whichever section
-- the student was on when it was first recorded. Splitting a minute across two
-- sections would let a fast tab-switcher manufacture engaged minutes, which is
-- the property the single-row-per-minute key exists to prevent.
create index if not exists sis_activity_minutes_section_idx
  on public.sis_activity_minutes (punch_id, section_id);

comment on column public.sis_activity_minutes.section_id is
  'Which lesson section the student was on for this minute. Null for a heartbeat with no section in view, and for rows written before this column existed.';
