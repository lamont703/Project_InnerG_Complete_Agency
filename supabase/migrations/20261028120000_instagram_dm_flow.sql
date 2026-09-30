-- The Instagram comment → DM flow (lib/instagram-flow.ts), modeled on the
-- one-tap ManyChat flow in our DMs with @sabrina_ramonov (2026-09-24):
-- comment → public "check your DM" → private reply with a SEND IT button →
-- email → kit + menu of three topics → a link for each. Decided with the
-- product owner 2026-09-30: every comment triggers it, the gift is the
-- Claude + ShearQuery kit, the email also opts into the weekly LIVE training
-- invite, and typed messages get a tap-a-button nudge rather than AI answers.

-- Off until switched on at /admin/comment-engagement, like auto-reply.
alter table public.instagram_agent_settings
  add column if not exists dm_flow_enabled boolean not null default false,
  add column if not exists dm_flow_changed_at timestamptz,
  add column if not exists dm_flow_changed_by text;

-- One row per person (their Instagram-scoped id — the same id in comments and DMs).
create table if not exists public.instagram_flow_state (
  sender_id           text primary key,
  username            text,
  -- opened: the SEND IT button was sent · awaiting_email: they tapped it ·
  -- done: email captured and kit sent.
  stage               text not null default 'opened' check (stage in ('opened', 'awaiting_email', 'done')),
  email               text check (email is null or email = lower(email)),
  -- Asked for "the kit + the weekly LIVE training invite", in those words.
  live_training_opt_in boolean not null default false,
  opt_in_text         text,
  opted_in_at         timestamptz,
  kit_sent_at         timestamptz,
  kit_error           text,
  topics              text[] not null default '{}',
  first_media_id      text,
  first_comment_id    text,
  last_nudge_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_instagram_flow_email on public.instagram_flow_state (email) where email is not null;

-- Which comments got the flow, so a redelivered webhook never replies twice.
create table if not exists public.instagram_flow_comments (
  comment_id     text primary key,
  sender_id      text not null,
  media_id       text,
  public_reply   text,
  public_ok      boolean,
  dm_kind        text,   -- 'button' | 'text' (fallback) | 'menu' | 'none'
  dm_ok          boolean,
  error          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_instagram_flow_comments_sender on public.instagram_flow_comments (sender_id, media_id);

alter table public.instagram_flow_state    enable row level security;
alter table public.instagram_flow_comments enable row level security;
