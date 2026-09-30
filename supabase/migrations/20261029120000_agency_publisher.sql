-- The AGENCY publisher (lib/agency-publisher.ts): approved agencies repost
-- ShearQuery's videos to their OWN Instagram as Reels, from Claude or
-- /account/agency/publisher. It works like /admin/content-publisher: a line
-- in order, and whatever is first goes out at the next of the agency's slots
-- (9 AM, 2 PM, 7 PM Eastern by default).
--
-- Decided with the product owner 2026-09-30: agencies only; only videos our
-- content publisher has already published (publisher_queue); Instagram Reels
-- only for now; auto-posting only (the agency connects its Instagram — as a
-- Meta Instagram Tester until App Review). Published agency posts are NOT
-- copied to storage: they point back at the video we already hold.

create table if not exists public.agency_publisher_queue (
  id                  uuid primary key default gen_random_uuid(),
  agency_member_id    uuid not null references public.community_members(id) on delete cascade,
  -- The ShearQuery video being reposted. Never a copy of the file.
  source_id           uuid not null references public.publisher_queue(id) on delete restrict,
  caption             text not null check (char_length(caption) <= 2200),
  position            int not null default 0,
  status              text not null default 'queued' check (status in ('queued', 'published', 'failed')),
  instagram_media_id  text,
  instagram_permalink text,
  error               text,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_agency_publisher_line on public.agency_publisher_queue (agency_member_id, status, position);

create table if not exists public.agency_publisher_settings (
  agency_member_id  uuid primary key references public.community_members(id) on delete cascade,
  -- Eastern-time hours the line posts at; a subset of 9, 14, 19.
  slot_hours        int[] not null default '{9,14,19}',
  paused            boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- One post per agency per slot, claimed before anything is sent.
create table if not exists public.agency_publisher_slot_claims (
  agency_member_id  uuid not null references public.community_members(id) on delete cascade,
  slot_date         date not null,
  slot_hour         int not null,
  item_id           uuid,
  claimed_at        timestamptz not null default now(),
  primary key (agency_member_id, slot_date, slot_hour)
);

alter table public.agency_publisher_queue       enable row level security;
alter table public.agency_publisher_settings    enable row level security;
alter table public.agency_publisher_slot_claims enable row level security;
