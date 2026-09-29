-- Demo mode: an agency shows ShearQuery to a prospect in its own Claude, as a
-- made-up barbershop, salon, school and so on, using the REAL tools.
--
-- HOW IT STAYS SAFE (lib/demo/):
--  - Each demo business is a community_members row with is_demo = true, no
--    login (user_id null) and an @demo.shearquery.invalid email. The real
--    tools run on it unchanged, which is the point: the demo shows exactly
--    what the product does.
--  - Its Google and Instagram "tokens" start with sqdemo_. lib/outbound.ts
--    routes any request carrying one to a fake Google / Instagram backed by
--    demo_gbp_state, so no path — Claude, a cron, a script — can reach the
--    real services with a demo business's credentials.
--  - Texts to 555-01xx numbers and email to the .invalid domain are dropped
--    before GoHighLevel sees them.
--
-- RLS ON WITH NO POLICIES on the new tables: service-role only.

alter table public.community_members
  add column if not exists is_demo boolean not null default false;
create index if not exists idx_community_members_demo on public.community_members (is_demo) where is_demo;

-- One made-up business per agency per type, made on first use and kept, so a
-- change drafted in one demo is still there in the next.
create table if not exists public.demo_businesses (
  owner_member_id uuid not null references public.community_members(id) on delete cascade,
  business_type   text not null check (business_type in ('barbershop', 'salon', 'barber', 'cosmetologist', 'school', 'supply_store')),
  demo_member_id  uuid not null unique references public.community_members(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (owner_member_id, business_type)
);

-- Which demo business, if any, a member's Claude is currently acting as.
create table if not exists public.demo_sessions (
  owner_member_id uuid primary key references public.community_members(id) on delete cascade,
  business_type   text not null,
  started_at      timestamptz not null default now()
);

-- The fake Google profile: everything Google would hold for the location.
create table if not exists public.demo_gbp_state (
  demo_member_id uuid primary key references public.community_members(id) on delete cascade,
  location       jsonb not null,
  attributes     jsonb not null default '[]'::jsonb,
  place_actions  jsonb not null default '[]'::jsonb,
  reviews        jsonb not null default '[]'::jsonb,
  posts          jsonb not null default '[]'::jsonb,
  media          jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.demo_businesses enable row level security;
alter table public.demo_sessions   enable row level security;
alter table public.demo_gbp_state  enable row level security;
