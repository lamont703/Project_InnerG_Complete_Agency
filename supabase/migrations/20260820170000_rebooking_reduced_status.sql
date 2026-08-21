-- A CLIENT CAN STEP BACK WITHOUT LEAVING.
--
-- The status column had three states — active, snoozed, inactive — and Amber C.
-- Flynn fits none of them. Fifty-five visits over almost three years, then a
-- message: she has moved further away, Tuesdays no longer work, she needs
-- someone closer to home. And, in the same message: "Hopefully, you'll still
-- let me come if I need too - my eyebrows are about to be out of control."
--
-- Every existing option gets her wrong:
--   'active'   - she keeps her 26-day haircut rhythm, so the queue texts her
--                "you're about due" days after she said she was stepping back.
--   'inactive' - she is written off, drops out of the list entirely, and the
--                standing invitation she asked for is quietly declined.
--   'snoozed'  - implies a date she will return on. There isn't one.
--
-- So: 'reduced'. Still a client, no longer on their old rhythm, and worth
-- nothing like their old annual value.
--
-- WHY THIS IS NOT JUST A NOTE. The three effects are mechanical and a free-text
-- note cannot produce any of them: she is dropped from revenue-at-risk (that
-- money is already gone by her own account, and counting it overstates the
-- number), she is only chased if a realistic longer cadence has been set, and
-- her drafted message changes to one with no urgency in it.
--
-- reduced_services records what they still come in for. It is here to inform
-- the barber, NOT to be written into a message: lib/rebooking/messages.ts
-- composes from the cadence result alone and no column in this table is ever
-- interpolated into outgoing text. The 'reduced' STATUS selects a different
-- template; the content of that template is code, not client data.

alter table public.rebooking_client_notes
  drop constraint if exists rebooking_client_notes_status_check;

alter table public.rebooking_client_notes
  add constraint rebooking_client_notes_status_check
  check (status in ('active', 'snoozed', 'inactive', 'reduced'));

-- Short, and free text on purpose. "eyebrows", "just before holidays",
-- "beard trims only" - the shape of a reduced relationship varies too much to
-- enumerate, and guessing at an enum now would mean a migration per surprise.
alter table public.rebooking_client_notes
  add column if not exists reduced_services text;

comment on column public.rebooking_client_notes.status is
  'active | snoozed | inactive | reduced. ''reduced'' means still a client but off their old rhythm - excluded from revenue-at-risk, only chased when a longer cadence_override_days is set, and drafted a message with no urgency in it.';

comment on column public.rebooking_client_notes.reduced_services is
  'What a reduced client still comes in for, e.g. "eyebrows". For the barber to read. Never interpolated into an outgoing message.';
