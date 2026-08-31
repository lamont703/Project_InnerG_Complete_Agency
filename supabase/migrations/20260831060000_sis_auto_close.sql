-- Closing a session nobody closed.
--
-- THE BUG THIS FIXES. Nothing ever ended an abandoned punch, and an open punch
-- refuses every subsequent clock-in (lib/school/hours.ts, canClockIn). So a
-- student who shut their laptop at 8:47pm without clicking "finish" arrived the
-- next morning to a kiosk saying "you're already clocked in", with no way past
-- it but a member of staff voiding the punch and losing the hours.
--
-- WHY A COLUMN RATHER THAN JUST SETTING punched_out_at. An hour a student ended
-- and an hour the system ended are not the same fact, and a record that renders
-- them identically is a record that quietly overstates what is known. The
-- clock-out time is real either way — it is the end of the scheduled class —
-- but who decided it is exactly the sort of thing an auditor is entitled to
-- see, and exactly the sort of thing that becomes unrecoverable if it is not
-- captured at the time.
alter table public.sis_punches
  add column if not exists auto_closed_at timestamptz;

-- Finding what needs closing: open, not voided, and attached to a block that
-- can say when it should have ended.
create index if not exists sis_punches_open_with_block_idx
  on public.sis_punches (schedule_block_id)
  where punched_out_at is null and voided_at is null;

comment on column public.sis_punches.auto_closed_at is
  'Set when the system closed this punch at the end of its scheduled block rather than a person clocking out. Null means a person ended it.';
