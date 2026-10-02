-- The content publisher's own posting schedule, set on /admin/content-publisher.
--
-- Replaces the fixed 9am / 2pm / 7pm Eastern slots (decided 2026-10-02: the owner wants
-- to post once or twice a week, and to place any video on a date of its own).
--
-- publisher_settings is ONE ROW (id = 1):
--   paused        the real pause. The cron reads it before anything else and claims
--                 nothing while it is true. Before this existed, "pausing" meant moving
--                 every queued row to 'skipped' (scripts/publisher_pause.mjs) — anything
--                 queued afterwards was live, which is how seven new Shorts nearly went
--                 out on a paused publisher.
--   weekly_slots  [{"day": 0-6 (0 = Sunday), "hour": 0-23}], wall-clock America/New_York.
--                 The cron runs hourly at :00, so a slot is an hour, not a minute.
--
-- STARTS PAUSED WITH NO SLOTS on purpose: the owner asked for the publisher to stay
-- paused until a schedule is chosen. Nothing publishes until both are set on the page.

create table if not exists public.publisher_settings (
  id            smallint primary key default 1 check (id = 1),
  paused        boolean not null default true,
  weekly_slots  jsonb   not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  updated_by    text
);

insert into public.publisher_settings (id, paused, weekly_slots)
values (1, true, '[]'::jsonb)
on conflict (id) do nothing;

alter table public.publisher_settings enable row level security;

create policy "Allow service role full access" on public.publisher_settings
  for all to service_role using (true) with check (true);

-- A video pinned to an exact time. It goes out at the first hourly run at or after this
-- instant (while not paused), ahead of the weekly order. Null = it waits its turn in the
-- weekly slots, in position order.
alter table public.publisher_queue
  add column if not exists scheduled_for timestamptz;

create index if not exists publisher_queue_scheduled_for_idx
  on public.publisher_queue (scheduled_for)
  where status = 'queued' and scheduled_for is not null;
