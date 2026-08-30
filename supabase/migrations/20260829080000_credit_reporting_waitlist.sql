-- Owners asking to report BEYOND ShearQuery.
--
-- A SEPARATE TABLE FROM THE ENROLMENT ON PURPOSE. Reporting inside ShearQuery
-- is live and free; furnishing to Experian, Equifax, TransUnion or Dun &
-- Bradstreet is neither, and cannot be until the furnisher licensing and
-- dispute obligations are met. Two tables keep the promise honest: an enrolled
-- shop is reporting TODAY, a waitlist row is somebody who asked about something
-- that does not exist yet. Collapsing them would make it impossible to answer
-- "who did we actually tell what", which is the question that matters if this
-- ever gets challenged.
create table if not exists public.credit_reporting_waitlist (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid,
  shop_type       text check (shop_type in ('shop','salon')),
  shop_name       text not null,
  contact_name    text,
  email           text,
  phone           text,
  city            text,
  chair_count     integer,
  -- Which bureaus they asked about. Stored rather than assumed: an owner who
  -- wants only Dun & Bradstreet is a different conversation from one who wants
  -- the consumer bureaus, and the obligations are different too.
  bureaus         text[] not null default '{}',
  notes           text,
  source          text not null default 'landing_page',
  created_at      timestamptz not null default now()
);

create index if not exists credit_reporting_waitlist_created_idx
  on public.credit_reporting_waitlist (created_at desc);

alter table public.credit_reporting_waitlist enable row level security;
