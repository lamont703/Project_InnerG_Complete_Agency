-- Who rents a chair from whom. The relationship that does not exist anywhere
-- else in this system, and which the placement product, the payment record and
-- the call product all sit on top of.

create table if not exists public.shop_roster (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid not null,
  shop_type           text not null check (shop_type in ('shop','salon')),
  -- As the owner typed it. Kept verbatim: it is what they will recognise in a
  -- confirmation message, and correcting somebody's spelling of their own
  -- barber's name back at them reads as a machine that did not listen.
  barber_name         text not null,
  -- Resolved BY US from name + county against the TDLR lake, never asked for.
  -- 99% of first+last combinations are unique inside a county, which is what
  -- lets the ask be "who rents chairs from you" instead of a licence number.
  license_number      text,
  license_type        text,
  license_expires_at  date,
  license_matched_name text,
  resolution          text not null default 'pending'
                      check (resolution in ('pending','unique','ambiguous','not_found')),
  status              text not null default 'active' check (status in ('active','ended')),
  source              text not null default 'owner_sms',
  started_at          date,
  ended_at            date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists shop_roster_shop_idx on public.shop_roster (shop_id, status);
-- The licence is the identity that makes a record follow a barber to their next
-- chair. Without it the record dies when they leave, and a record that dies
-- deters nobody.
create index if not exists shop_roster_license_idx on public.shop_roster (license_number)
  where license_number is not null;

create table if not exists public.rent_weeks (
  id            uuid primary key default gen_random_uuid(),
  roster_id     uuid not null references public.shop_roster(id) on delete cascade,
  week_start    date not null,
  status        text not null
                check (status in ('on_time','late','caught_up','excused','missed')),
  days_late     integer,
  note          text,
  -- ATTRIBUTION IS NOT OPTIONAL. Every row is a statement one person made about
  -- another that can cost them a chair. A shop whose rows are disputed
  -- repeatedly is telling us something, and we cannot hear it without this.
  reported_by_phone text,
  reported_at   timestamptz not null default now(),
  disputed_at   timestamptz,
  dispute_note  text,
  dispute_state text check (dispute_state in ('open','upheld','withdrawn')),
  created_at    timestamptz not null default now(),
  unique (roster_id, week_start)
);

create index if not exists rent_weeks_roster_idx on public.rent_weeks (roster_id, week_start desc);
create index if not exists rent_weeks_disputed_idx on public.rent_weeks (dispute_state)
  where dispute_state = 'open';

-- SILENCE RECORDS NOTHING. There is deliberately no row for a week nobody
-- answered about: at a 20% reply rate, defaulting to "paid" would invent four
-- fifths of every barber's record. An absent week is absent, not clean.

create table if not exists public.roster_conversations (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null,
  shop_type      text not null check (shop_type in ('shop','salon')),
  phone          text not null,
  step           text not null default 'invited'
                 check (step in ('invited','awaiting_names','confirming','active','declined')),
  last_message_at timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (shop_id, shop_type)
);

create index if not exists roster_conversations_phone_idx on public.roster_conversations (phone);

alter table public.shop_roster           enable row level security;
alter table public.rent_weeks            enable row level security;
alter table public.roster_conversations  enable row level security;
