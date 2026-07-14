-- Shared inbox every autonomous agent (Momentum Analyst first, more later)
-- writes into, so the human reviews one feed instead of one page per agent.
create table if not exists agent_directives (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  mission text not null,
  directive_text text not null,
  evidence jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists agent_directives_status_idx
  on agent_directives (status, created_at desc);

alter table public.agent_directives enable row level security;

create policy "Allow public read access to agent_directives"
  on public.agent_directives for select using (true);
