-- Plans: Free, Manage, Autopilot (lib/plans.ts). Every member starts on Free.
--
-- plan_source says who set it: 'default' (never changed), 'admin' (set by
-- hand at /admin/plans while checkout isn't built), 'billing' (a payment,
-- once step 2 exists). Billing will only ever overwrite 'default' and
-- 'billing' rows, so a plan an admin granted by hand isn't silently undone.

alter table public.community_members
  add column if not exists plan text not null default 'free',
  add column if not exists plan_source text not null default 'default',
  add column if not exists plan_updated_at timestamptz;

alter table public.community_members drop constraint if exists community_members_plan_check;
alter table public.community_members
  add constraint community_members_plan_check check (plan in ('free', 'manage', 'autopilot'));

alter table public.community_members drop constraint if exists community_members_plan_source_check;
alter table public.community_members
  add constraint community_members_plan_source_check check (plan_source in ('default', 'admin', 'billing'));

-- Demo businesses show everything, so they're on the top plan.
update public.community_members set plan = 'autopilot', plan_source = 'admin', plan_updated_at = now() where is_demo;

create index if not exists idx_community_members_paid_plan on public.community_members (plan) where plan <> 'free';
