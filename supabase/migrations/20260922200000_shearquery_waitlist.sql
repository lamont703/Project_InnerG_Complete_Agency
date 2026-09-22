-- The waitlist the YouTube channel drives to, while the offer is still undecided.
--
-- WHY IT EXISTS BEFORE THE OFFER DOES. The channel is the conversion surface and
-- it is running now; the delivery mechanism — course, program, service or the
-- product itself — is not settled. A list collected now is announceable later,
-- and the alternative is sending attention to a page that sells nothing.
--
-- A SEPARATE TABLE FROM credit_reporting_waitlist AND cosmetology_prep_waitlist,
-- for the same reason those two are separate from each other: each of those is
-- interest in ONE named thing that does not exist yet (bureau furnishing, the
-- cosmetology prep deck). This one is interest in the offer itself, industry
-- wide, and it has to stay answerable later — who asked, what trade they are in,
-- and what they said they wanted. Folding it into either would make
-- "who did we tell what" unanswerable, which is the question that matters when
-- the offer is finally announced.
--
-- asi_intent IS THE COLUMN THAT EARNS THIS TABLE. It is the free-text answer to
-- "How are you aiming to use artificial super intelligence in your business?",
-- in their own words. It is the only evidence we will have about which delivery
-- mechanism to build, so it is stored raw rather than bucketed into categories
-- chosen before anybody answered.
--
-- PHONE IS OPTIONAL, EMAIL IS NOT. The offer will be announced by both, and a
-- mobile number is the higher-intent contact — but requiring it costs signups,
-- and a row with an email is still a row we can announce to.
--
-- RLS ON WITH NO POLICIES, matching every other table in this project that holds
-- contact details (hybrid_program_leads, credit_reporting_waitlist): writes come
-- from the server action through the service role, and nothing on the public
-- site ever reads it back.
create table if not exists public.shearquery_waitlist (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text not null,
  phone        text,
  -- Free text rather than an enum: the industry includes barbers, stylists,
  -- braiders, locticians, estheticians, nail techs, lash techs, shop and suite
  -- owners, instructors, students and suppliers, and a fixed list written today
  -- would quietly force half of them into "other".
  profession   text,
  asi_intent   text,
  -- Which surface sent them, so the channel can be measured rather than assumed.
  -- The /youtube/* redirects already stamp a source; this carries it through.
  source       text not null default 'waitlist_page',
  status       text not null default 'new'
               check (status in ('new','contacted','converted','declined')),
  created_at   timestamptz not null default now()
);

create index if not exists shearquery_waitlist_created_idx
  on public.shearquery_waitlist (created_at desc);

create index if not exists shearquery_waitlist_new_idx
  on public.shearquery_waitlist (created_at desc) where status = 'new';

-- One row per person. A second signup from the same address updates nothing and
-- errors nowhere: the action treats the conflict as success, because somebody
-- already on the list should not be told they failed.
create unique index if not exists shearquery_waitlist_email_key
  on public.shearquery_waitlist (lower(email));

alter table public.shearquery_waitlist enable row level security;
