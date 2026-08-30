-- Schools asking about a hybrid (part-distance) programme.
--
-- A CALLBACK QUEUE, NOT A SIGNUP. Nothing is provisioned by a row here. The
-- page promises one thing — a ShearQuery rep phones back within 24 hours with
-- a live demo — so the only job of this table is to make sure that call
-- actually gets made, and to make it obvious when one has not been.
--
-- WHY EVERY FIELD IS NOT NULL. The form asks for five things and marks all of
-- them required, so a row missing any of them means the API let something
-- through that the UI did not. The constraint is there to catch our own bug,
-- not the school's typing.

create table if not exists public.hybrid_program_leads (
  id            uuid primary key default gen_random_uuid(),

  school_name   text not null,
  -- Two-letter state. Unconstrained deliberately: the 50% rule this page is
  -- built on is TEXAS law, but a school in another state asking the question
  -- is a lead worth having and a conversation worth recording, not a
  -- validation error.
  state         text not null,

  contact_name  text not null,
  email         text not null,
  phone         text not null,

  -- Where the enquiry came from, so a second landing page later can be told
  -- apart from this one without guessing from timestamps.
  source        text not null default 'texas-hybrid-program',

  status        text not null default 'new'
                check (status in ('new','contacted','demoed','won','lost')),

  -- When the alert to the ShearQuery rep was accepted by the SMS provider.
  -- NULL with a row present means the lead is real and nobody was told — the
  -- single most important thing this table can surface.
  alerted_at    timestamptz,
  alert_error   text,

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists hybrid_program_leads_new_idx
  on public.hybrid_program_leads (created_at desc) where status = 'new';
-- The alarm query: a lead nobody was told about.
create index if not exists hybrid_program_leads_unalerted_idx
  on public.hybrid_program_leads (created_at desc) where alerted_at is null;

-- RLS on with no policies, matching every other table holding contact details
-- in this project: reachable by the service role from a server route only.
alter table public.hybrid_program_leads enable row level security;
