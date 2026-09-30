-- Agencies promote the Monday LIVE training with their own link
-- (shearquery.com/live/<CODE>), and get credit for who registers through it.
-- The registration remembers the agency; when that person later creates a
-- ShearQuery account, the agency is credited (source 'event') unless an
-- invite, a typed code or a link cookie credited someone first.

alter table public.live_training_registrations
  add column if not exists agency_member_id uuid references public.community_members(id) on delete set null,
  add column if not exists agency_code text;
create index if not exists idx_live_training_agency on public.live_training_registrations (agency_member_id, created_at desc) where agency_member_id is not null;

alter table public.agency_referrals drop constraint if exists agency_referrals_source_check;
alter table public.agency_referrals add constraint agency_referrals_source_check check (source in ('link', 'code', 'invite', 'event'));
