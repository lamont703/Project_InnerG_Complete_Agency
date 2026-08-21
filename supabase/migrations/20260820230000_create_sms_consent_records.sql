-- THE EVIDENCE THAT SOMEONE AGREED TO BE TEXTED.
--
-- This table is not a preference store. Shopify holds the preference; this
-- holds the PROOF, and the two answer different questions. "Is she subscribed"
-- is answered by Shopify. "What exactly did she agree to, when, and from what
-- device" is answered here, and it is the only question that matters if consent
-- is ever challenged.
--
-- WHY THE EXACT WORDING IS STORED, NOT A VERSION NUMBER. Copy gets edited. A
-- record saying "agreed to consent text v2" is worthless once v2 has been
-- rewritten twice, because nothing can reconstruct what was on screen the day
-- they clicked. The full text is copied into every row - storage is free and a
-- reconstructed disclosure is not evidence.
--
-- DOUBLE OPT-IN, IN TWO COLUMNS. submitted_at is them filling in the form;
-- confirmed_at is them replying YES to a text sent to the number they gave.
-- Only the second proves the number is theirs and reachable, and only the
-- second is allowed to flip Shopify to SUBSCRIBED. A typo'd digit on the form
-- would otherwise subscribe a stranger.
--
-- THE SYNC IS SEPARATE AND RETRYABLE. Writing consent into Shopify can fail -
-- the API can be down, and at the time of writing the app has not yet been
-- granted write_customers at all. A confirmation must never be lost because the
-- write failed, so confirmation and sync are different columns and pending rows
-- can be replayed.

create table if not exists public.sms_consent_records (
  id uuid primary key default gen_random_uuid(),

  -- The unguessable link handed out in the email. One per customer per campaign
  -- so the page knows who is answering without asking them to identify
  -- themselves - and so a forwarded email cannot subscribe the wrong person's
  -- number to the right person's record.
  token text not null unique,

  shopify_customer_id text not null,
  client_name text,
  email text,

  -- What they typed. Normalised to E.164 before it is stored.
  phone text,

  -- The full disclosure as rendered, plus a label for grouping.
  consent_text text,
  consent_text_label text,

  -- Step 1: the form.
  submitted_at timestamptz,
  submitted_ip text,
  submitted_user_agent text,

  -- Step 2: the confirming reply.
  confirmation_sent_at timestamptz,
  confirmation_error text,
  confirmed_at timestamptz,

  -- Step 3: Shopify agrees.
  synced_at timestamptz,
  sync_error text,

  -- 'invited'   - link generated, nothing back yet
  -- 'submitted' - form filled, confirmation text sent, awaiting YES
  -- 'confirmed' - replied YES; consent is real
  -- 'synced'    - written into Shopify
  -- 'declined'  - replied STOP, or told us no
  status text not null default 'invited'
    check (status in ('invited', 'submitted', 'confirmed', 'synced', 'declined')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The page looks a record up by token on every visit.
create unique index if not exists sms_consent_records_token_idx
  on public.sms_consent_records (token);

-- The inbound YES arrives with a phone number and nothing else, so the reply
-- has to be matched back by number.
create index if not exists sms_consent_records_phone_idx
  on public.sms_consent_records (phone)
  where phone is not null;

-- Finding confirmations that still owe Shopify a write.
create index if not exists sms_consent_records_unsynced_idx
  on public.sms_consent_records (confirmed_at)
  where status = 'confirmed';

create index if not exists sms_consent_records_customer_idx
  on public.sms_consent_records (shopify_customer_id);

create or replace function public.sms_consent_records_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sms_consent_records_set_updated_at on public.sms_consent_records;
create trigger sms_consent_records_set_updated_at
  before update on public.sms_consent_records
  for each row execute function public.sms_consent_records_touch();

-- RLS on, no policies. The consent page is public but reads through a server
-- route using the service-role client and only ever by token - the table itself
-- is never exposed to the anon key, because it holds phone numbers, emails, IP
-- addresses and user agents for a list of real people.
alter table public.sms_consent_records enable row level security;

comment on table public.sms_consent_records is
  'Proof of SMS consent: the exact disclosure shown, when it was agreed, from what IP, and the confirming reply. Shopify holds the preference; this holds the evidence. Only confirmed_at (a YES reply) may flip Shopify to SUBSCRIBED.';
