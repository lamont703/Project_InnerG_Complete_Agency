-- Two small things for showing ShearQuery to a prospective agency partner.
--
-- 1. feature_access: people allowed into a private-testing feature, added by
--    a row rather than a code change and deploy. Checked IN ADDITION to the
--    allowlists in code (lib/calendar/access.ts), which stay as the floor.
--    It is a stopgap until plans and tiers exist; then plans decide access.
--
-- 2. calendar_providers.is_demo: a calendar filled with made-up data for a
--    demo. Demo calendars are never listed to clients searching for someone
--    to book (lib/calendar/client-booking.ts), and the seeding script refuses
--    to touch a calendar that is not a demo — it wipes and refills, and must
--    never do that to a real book.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.feature_access (
  email      text not null,
  feature    text not null check (feature in ('calendar', 'instagram')),
  note       text,
  granted_at timestamptz not null default now(),
  primary key (email, feature),
  constraint feature_access_email_lower check (email = lower(email))
);

alter table public.feature_access enable row level security;

alter table public.calendar_providers
  add column if not exists is_demo boolean not null default false;
