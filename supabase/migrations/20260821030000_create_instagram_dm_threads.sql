-- THE INSTAGRAM DM AGENT'S MEMORY AND ITS LIMITS.
--
-- One row per Instagram user who has ever messaged us, keyed on the sender id
-- Meta gives us. That id is scoped to our app: it is not a username, carries no
-- email, and cannot be matched to a community_members row by itself. Linking is
-- an explicit act, which is why member_id is nullable and why almost every row
-- will have it null.
--
-- WHY A DEDICATED TABLE WHEN instagram_events ALREADY STORES INBOUND DMs.
-- That table is an append-only log of everything Meta delivers, including
-- comments and mentions, and it stores nothing we SEND. A conversation needs
-- both halves in order, plus per-sender state (rate limit, disclosure, whether
-- the membership offer has been made) that a log cannot hold. Keeping the log
-- as the raw record and this as the conversation is the same split the rest of
-- this codebase uses for staged versus working data.
--
-- THE RATE LIMIT LIVES HERE BECAUSE COOKIES DO NOT EXIST IN A DM. The website
-- chat counts usage in `ai_chat_count`, a cookie, which anyone clears with a
-- private window. There is no cookie jar on a webhook, so the counter has to be
-- server-side and keyed on the sender - which makes the DM harder to evade than
-- the web surface it borrows its brain from.

create table if not exists public.instagram_dm_threads (
  -- Meta's app-scoped sender id (IGSID). Stable for our app, useless outside it.
  sender_id text primary key,

  -- Set only when the person has explicitly linked. Null for everyone else, and
  -- everything downstream must treat null as the ordinary case rather than as
  -- an error - the same posture /api/chat takes toward anonymous visitors.
  member_id uuid references public.community_members(id) on delete set null,

  /*
   * WHEN WE TOLD THEM IT IS A BOT.
   *
   * Meta requires the disclosure "at the beginning of any conversation or
   * message thread, after a significant lapse of time, or when a chat moves
   * from human interaction to automated experience", and it is a legal
   * requirement for California and German users rather than a courtesy. We are
   * actively expanding into California, so this is not optional here.
   *
   * Stored rather than inferred from message count because the rule is about
   * elapsed time as well as position: a thread that goes quiet for months needs
   * telling again, and only a timestamp can answer that.
   */
  disclosed_at timestamptz,

  -- Rate limit, reset by day rather than by rolling window. A rolling window is
  -- fairer and needs a per-message index to compute; a day boundary is legible
  -- to the person hitting it ("you're out until tomorrow") and costs one int.
  usage_day date,
  messages_today integer not null default 0,

  -- Lifetime count of USER messages. Drives when the membership offer is made,
  -- and is not the same as messages_today, which resets.
  exchanges integer not null default 0,

  /*
   * The membership offer is made ONCE, ever.
   *
   * A second ask reads as a sales funnel rather than as an offer, and this
   * account has one thread per person with no way for them to mute just the
   * pitch. If they ignore it, that is an answer.
   */
  offered_membership_at timestamptz,

  -- What they typed when they accepted. Kept so a failed member creation can be
  -- retried without asking them again - being asked twice for the same email is
  -- the clearest possible signal that nobody is home on our side.
  captured_email text,

  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists instagram_dm_threads_member_idx
  on public.instagram_dm_threads (member_id) where member_id is not null;

alter table public.instagram_dm_threads enable row level security;

create policy "Allow service role full access" on public.instagram_dm_threads
  for all to service_role using (true) with check (true);


-- BOTH HALVES OF THE CONVERSATION, IN ORDER.
--
-- /api/chat takes the whole message array and passes it to Gemini as history,
-- so memory is a matter of replaying this table rather than of building
-- anything. The agent reads the last N and appends two rows per turn.
create table if not exists public.instagram_dm_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.instagram_dm_threads(sender_id) on delete cascade,

  -- 'user' and 'model' rather than 'agent', matching the role names Gemini
  -- expects, so replaying this into a request needs no translation step that
  -- could get the mapping backwards.
  role text not null check (role in ('user', 'model')),
  text_body text not null,

  /*
   * Meta redelivers webhook events. Without this a retry becomes a second
   * user turn, and the model answers a question it has already answered while
   * the transcript quietly disagrees with what was actually said.
   */
  message_mid text,

  created_at timestamptz not null default now()
);

create unique index if not exists instagram_dm_messages_mid_idx
  on public.instagram_dm_messages (message_mid) where message_mid is not null;

create index if not exists instagram_dm_messages_thread_idx
  on public.instagram_dm_messages (sender_id, created_at);

alter table public.instagram_dm_messages enable row level security;

create policy "Allow service role full access" on public.instagram_dm_messages
  for all to service_role using (true) with check (true);


-- Instagram becomes a first-class signup source. All seven members that exist
-- today have signup_source NULL, so this channel is also the first one whose
-- members can be attributed at all.
comment on column public.instagram_dm_threads.captured_email is
  'Email given inside the DM thread. The member is created from this rather than from a form - see lib/instagram-dm-agent.ts for why a link out of Instagram is the wrong ask here.';
