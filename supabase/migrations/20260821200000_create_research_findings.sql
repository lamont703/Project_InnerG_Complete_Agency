-- WHAT THE RESEARCH AGENTS FOUND, AND WHAT THEY LOOKED AT WHEN THEY FOUND IT.
--
-- Two agents share this table because they produce the same shape of thing — a
-- suggestion, a reason, and the numbers behind it — and the operator reads them
-- the same way. Splitting them would duplicate the UI, the store and the
-- review workflow to gain a column that `agent` already provides.
--
-- EVIDENCE IS STORED, NOT JUST THE SUGGESTION. This is the column that makes
-- the difference between a research agent and a horoscope. A finding that says
-- "post about Houston barbershops" is unfalsifiable; one that says so and
-- carries {"query":"Houston","searches":53,"existing_posts":0} can be checked,
-- argued with, and proved wrong later. Anything the model asserts without
-- numbers to point at is rejected before it reaches this table.
--
-- SAMPLE SIZE TRAVELS WITH THE CLAIM. This site's funnel is extremely
-- lopsided: 48,786 pixel events, and below them 8 community members, 5 booking
-- requests, 2 agent threads. Any conclusion about membership conversion drawn
-- from eight people is noise wearing a number, and the agent is required to say
-- so rather than sound confident. `confidence` and the evidence counts are how
-- that reaches the screen.

create table if not exists public.research_findings (
  id uuid primary key default gen_random_uuid(),

  -- 'content' - what to make social posts about
  -- 'crm'     - how to move a lead to the next step of the pipeline
  agent text not null check (agent in ('content', 'crm')),

  -- Groups one pass, so a run reads as a unit and a bad run can be dismissed
  -- wholesale rather than finding by finding.
  run_id uuid not null,

  -- Short enough to scan in a list.
  title text not null,
  -- The suggestion itself: what to actually do.
  suggestion text not null,
  -- Why the evidence supports it. One or two sentences.
  rationale text,

  -- A loose grouping the agent picks, e.g. 'underserved_query', 'funnel_leak'.
  -- Text rather than an enum: the useful categories are not known yet, and a
  -- migration per new idea would discourage the agent from having any.
  category text,

  -- The numbers this was reasoned from. See the note above.
  evidence jsonb not null default '{}'::jsonb,

  confidence text not null default 'low'
    check (confidence in ('high', 'medium', 'low')),

  -- 'new' | 'actioned' | 'dismissed'. The operator's verdict, and the only
  -- signal that separates a useful agent from a busy one over time.
  status text not null default 'new'
    check (status in ('new', 'actioned', 'dismissed')),
  operator_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_findings_agent_idx
  on public.research_findings (agent, created_at desc);

create index if not exists research_findings_run_idx
  on public.research_findings (run_id);

create index if not exists research_findings_open_idx
  on public.research_findings (agent, created_at desc)
  where status = 'new';

create or replace function public.research_findings_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists research_findings_set_updated_at on public.research_findings;
create trigger research_findings_set_updated_at
  before update on public.research_findings
  for each row execute function public.research_findings_touch();

-- RLS on, no policies: findings quote traffic patterns, client counts and
-- revenue. Service-role only, behind isAdmin().
alter table public.research_findings enable row level security;

comment on table public.research_findings is
  'Suggestions from the Content and CRM research agents, each stored with the evidence it was reasoned from. A finding with no numbers behind it is rejected before it gets here.';
