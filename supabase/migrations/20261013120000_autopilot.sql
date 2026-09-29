-- Autopilot (lib/autopilot/): things that run for an owner without being
-- asked, on the Autopilot plan. Decided 2026-09-29 with the product owner:
--  - Replies to 4-5 star reviews publish at once, in the owner's voice.
--    1-3 star reviews are never auto-replied.
--  - One Google post a week, written only from facts already on the profile,
--    scheduled a day ahead with a heads-up so the owner can cancel it.
--  - A weekly report, and a daily digest of what Autopilot did.
-- Every change goes through gbp_change_requests (origin 'autopilot'), so it
-- has the same snapshot, history and undo as one made from Claude.

create table if not exists public.autopilot_settings (
  community_member_id uuid primary key references public.community_members(id) on delete cascade,
  review_replies boolean not null default true,
  weekly_posts   boolean not null default true,
  weekly_report  boolean not null default true,
  -- 0 = Sunday … 6 = Saturday, in UTC.
  post_weekday   int not null default 2 check (post_weekday between 0 and 6),
  updated_at     timestamptz not null default now()
);

-- What Autopilot did, and what it chose not to do.
create table if not exists public.autopilot_actions (
  id                  uuid primary key default gen_random_uuid(),
  community_member_id uuid not null references public.community_members(id) on delete cascade,
  kind                text not null check (kind in ('review_reply', 'post', 'weekly_report', 'digest')),
  status              text not null check (status in ('published', 'scheduled', 'sent', 'skipped', 'failed')),
  change_request_id   uuid,
  -- The review a reply was for, so one review is never answered twice.
  review_name         text,
  summary             text,
  detail              text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_autopilot_actions_member on public.autopilot_actions (community_member_id, created_at desc);
create unique index if not exists uq_autopilot_review on public.autopilot_actions (community_member_id, review_name) where review_name is not null;

alter table public.autopilot_settings enable row level security;
alter table public.autopilot_actions  enable row level security;
