-- Shareable audit pages (lib/audit-share.ts): an agency sends a prospect a
-- link to that business's free Google audit, from the agency's own channels.
--
-- agency_audit_views: whether the business opened it (link-preview bots
-- excluded), so the agency knows who to follow up with.
-- agency_audit_requests: a business asking for a free profile review — its
-- explicit, recorded permission to be contacted. The consent wording shown is
-- stored with it.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_audit_views (
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  entity_type      text not null,
  entity_id        uuid not null,
  views            int not null default 1,
  first_viewed_at  timestamptz not null default now(),
  last_viewed_at   timestamptz not null default now(),
  primary key (agency_member_id, entity_type, entity_id)
);

create table if not exists public.agency_audit_requests (
  id               uuid primary key default gen_random_uuid(),
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  entity_type      text not null,
  entity_id        uuid not null,
  business_name    text not null,
  contact_name     text not null,
  phone            text,
  email            text,
  message          text,
  consent_text     text not null,
  consented_at     timestamptz not null default now(),
  ip               text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_agency_audit_requests_agency on public.agency_audit_requests (agency_member_id, created_at desc);

alter table public.agency_audit_views    enable row level security;
alter table public.agency_audit_requests enable row level security;
