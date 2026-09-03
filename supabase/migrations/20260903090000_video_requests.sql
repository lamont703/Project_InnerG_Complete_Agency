-- VIDEO REQUESTS BY EMAIL: one Gmail thread, one job, one consent.
--
-- WHAT THIS IS. The agent reads claudedawg113@gmail.com, proposes a video spec
-- back by email, and renders only after the proposal is explicitly approved.
-- This table is the job board and the audit trail for that loop.
--
-- THE THREAD IS THE JOB KEY, AND THAT IS THE WHOLE REASON THIS IS EMAIL.
-- Gmail already assigns every conversation a stable threadId, so running four
-- video requests at once needs no invention: four threads, four rows. The
-- alternative channels considered — GHL inbound email, WhatsApp — were rejected
-- on this point. GHL's Inbound Email trigger exposes exactly seven custom
-- values (messageId, subject, bodyPlain, bodyFullPlain, fromEmail, fromName, cc)
-- and NO documented way to reach an attachment; WhatsApp is one linear
-- conversation, which is the wrong shape for concurrent jobs.
--
-- RAW IS STORED FIRST AND KEPT, exactly as public.booking_emails does it, and
-- for the same reason its migration gives: the interpretation will be wrong at
-- the start, and keeping the original means the whole history can be reprocessed
-- in seconds instead of waiting for a fresh batch of real requests. Receiving
-- must not fail because interpreting did.
--
-- CONSENT IS A NONCE, NOT A "YES". This is the part that must not be softened.
-- A From: header is trivially spoofable, and every approval here spends real
-- money — a News Desk render is ~$1.31 of HeyGen plus Higgsfield credits for
-- b-roll. "Reply YES to approve" would mean anyone who learns the address can
-- commission renders on our card. So approval requires echoing back a random
-- single-use code that only ever existed in the proposal email delivered to
-- that mailbox. The same reasoning is already written down one table over:
-- booking_emails notes that a guessable address is "a poisoned instruction once
-- we act on" what the mail contains.
create table if not exists public.video_requests (
  id uuid primary key default gen_random_uuid(),

  -- Gmail's own thread id. UNIQUE because a thread is a job: replies, revisions
  -- and the approval all belong to the row the first message created, and a
  -- second row for the same conversation would split its history and let one
  -- job be approved twice.
  gmail_thread_id text not null unique,

  -- The message that opened the thread. Kept so the proposal can be sent as a
  -- reply (In-Reply-To) rather than a new thread, which is what keeps the
  -- inbox readable.
  gmail_message_id text,

  from_address text,
  subject text,

  -- Everything Gmail handed us for the opening message, verbatim. When a parse
  -- looks wrong the first question is always "what did we actually receive",
  -- and a tidied copy cannot answer it.
  raw jsonb not null,
  body_text text,

  -- Attachment METADATA only — filename, mime type, size, and the Storage path
  -- the bytes were written to. The bytes themselves never live here: Gmail
  -- returns them base64, and base64 in a row is both expensive and unreadable.
  -- Files go to the entity-photos bucket, NOT social-assets, which caps at 5MB.
  attachments jsonb not null default '[]',

  -- THE STATE MACHINE. Constrained on purpose, which is a deliberate departure
  -- from broll_assets.source deliberately being left unconstrained. An unknown
  -- b-roll source degrades to "don't reuse it"; an unknown status here means a
  -- job is stuck in a state no code handles, and money may already have moved.
  -- That should fail at write time, loudly.
  status text not null default 'received' check (status in (
    'received',        -- stored by the poller, not yet read by the model
    'proposed',        -- spec written, proposal email sent, nonce live
    'approved',        -- correct nonce came back; cleared to spend
    'rendering',       -- handed to the local renderer
    'done',
    'rejected',        -- replied to with a decline
    'expired',         -- nonce timed out without an answer
    'failed'
  )),

  -- What the model proposed: format id, segments, b-roll tags, the article
  -- screenshot. Shaped to become a spec JSON under reference/AI News Video
  -- Shorts/, which is what render_news_short.js consumes.
  proposed_spec jsonb,
  proposal_sent_at timestamptz,

  -- The estimate the proposal quoted, in dollars. Two jobs: it is what the
  -- approval email shows, and summing it across a day is how the daily spend
  -- ceiling is enforced without a second table.
  --
  -- It does NOT replace the budget gate in lib/newsdesk-config.js. That gate
  -- runs before anything is bought and exits 1 over the $1.50 cap. The agent
  -- must never be able to pass --over-budget; that override exists for a human
  -- who typed it.
  estimated_cost_usd numeric,

  -- CONSENT. The nonce is generated when the proposal is sent, stored here, and
  -- compared against the reply. Single use: consumed_at is set the moment it
  -- matches, so a forwarded proposal email cannot approve the same job twice.
  consent_nonce text,
  consent_nonce_expires_at timestamptz,
  consent_nonce_consumed_at timestamptz,
  -- Which reply granted it, so an approval can always be traced to a message.
  consent_message_id text,

  render_started_at timestamptz,
  render_completed_at timestamptz,
  -- Slug and output paths once the local renderer finishes.
  render_result jsonb,
  error_text text,

  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The poller's hot path: "what is waiting to be looked at / answered".
create index if not exists video_requests_status_idx
  on public.video_requests (status, received_at desc);

-- Matching an inbound reply back to its job.
create index if not exists video_requests_thread_idx
  on public.video_requests (gmail_thread_id);

-- The daily spend ceiling reads this: sum estimated_cost_usd for everything
-- that started rendering today. Partial, because rows that never rendered cost
-- nothing and should not count against the cap.
create index if not exists video_requests_render_started_idx
  on public.video_requests (render_started_at)
  where render_started_at is not null;

alter table public.video_requests enable row level security;

-- Service role only. The poller runs as a Vercel cron with the service key and
-- the renderer runs locally with it; nothing public reads this, and nothing
-- public ever should — the nonce column is in here.
create policy "Allow service role full access" on public.video_requests
  for all to service_role using (true) with check (true);

comment on table public.video_requests is
  'Email-driven video requests. One Gmail thread = one job. Nothing renders without a matching single-use consent nonce, because a From: header proves nothing and every approval spends real money.';
comment on column public.video_requests.gmail_thread_id is
  'Gmail threadId. The job key — this is what makes concurrent requests work without any threading logic of our own.';
comment on column public.video_requests.consent_nonce is
  'Single-use random code sent in the proposal email and required to approve. Never log it, never expose it outside the service role.';
comment on column public.video_requests.attachments is
  'Metadata + Storage paths only. Never the bytes: Gmail returns attachments base64 and they belong in the entity-photos bucket.';
