-- Persisted cursor for Sentinel's rotating sweep of the sitemap. Real GSC
-- URL Inspection calls run ~6.5s each, so one invocation can only safely
-- cover a small batch — this table remembers where the last run left off
-- so frequent small runs add up to a full sweep instead of each one
-- restarting from the top. Single row, no per-agent multiplicity needed.
create table if not exists sentinel_sweep_state (
  id int primary key default 1,
  next_offset int not null default 0,
  updated_at timestamptz not null default now(),
  constraint sentinel_sweep_state_singleton check (id = 1)
);

insert into sentinel_sweep_state (id, next_offset) values (1, 0)
  on conflict (id) do nothing;

alter table public.sentinel_sweep_state enable row level security;
-- No public policies — service role only, nothing in the UI reads this directly.
