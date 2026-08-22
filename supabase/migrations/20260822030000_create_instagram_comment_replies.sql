-- ONE ROW PER COMMENT WE ANSWERED, AND WHAT WE SAID BACK.
--
-- WHY THIS EXISTS. instagram_events has recorded comments since the webhook was
-- built and nothing has ever replied to one. It even carries a `replied_at`
-- column, added in anticipation and never written to by anything — a real
-- comment sat unanswered for over an hour before anyone noticed, asking "where
-- are you located?", which is about as warm as an inbound gets.
--
-- SEPARATE FROM instagram_events ON PURPOSE. That table is an append-only log
-- of what Meta delivered — raw payloads, no interpretation. This holds what WE
-- decided and did: the reply text, whether it posted, whether the DM followed,
-- and what we knew about the commenter at the time. Keeping the record of our
-- own actions out of the log of their events is the same split this codebase
-- keeps everywhere between staged and working data.
--
-- TWO SENDS PER COMMENT, RECORDED SEPARATELY, because they can and do differ.
-- The public reply carries the conversation. The DM carries anything clickable,
-- since a link in a comment drags people out of the thread and Instagram treats
-- comment links as close to worthless anyway. Either can fail alone: the reply
-- can post while the private reply is refused, and calling that pair "sent" or
-- "failed" would be a lie in both directions.
--
-- THE PRIVATE REPLY IS A ONE-SHOT AND THIS TABLE IS THE PROOF OF SPEND. Meta
-- allows exactly ONE message to somebody who commented, within 7 days. There is
-- no way to check whether it was used other than remembering, so dm_sent_at is
-- the memory. A second attempt is refused rather than sent.

create table if not exists public.instagram_comment_replies (
  id uuid primary key default gen_random_uuid(),

  -- Meta's comment id. Unique because a webhook redelivery must not become a
  -- second reply under the same comment — which is public, and reads as a
  -- malfunction to everyone who sees the post.
  comment_id text not null unique,
  media_id text,

  commenter_id text not null,
  commenter_username text,
  comment_text text not null,

  /*
   * HOW MANY TIMES THIS PERSON HAD COMMENTED BEFORE THIS ONE.
   *
   * Stored rather than counted at read time because it is the input to how the
   * reply was written, and it has to stay true to the moment. The instruction
   * is to treat everyone as new until they show they are a fan; a reply that
   * greeted somebody as a regular has to remain explicable later even after
   * they have gone quiet, and a live count would rewrite that history.
   */
  commenter_prior_comments integer not null default 0,

  -- What we said in public.
  reply_text text,
  reply_comment_id text,
  replied_at timestamptz,
  reply_error text,

  -- What we sent privately, if anything. Null dm_text means none was warranted
  -- — most comments need no link, and spending the single private reply on a
  -- comment that did not ask for anything wastes it permanently.
  dm_text text,
  dm_sent_at timestamptz,
  dm_error text,

  -- 'partial' is a real outcome: the public reply posted and the DM did not,
  -- or the reverse. It names which half needs attention instead of averaging
  -- the two into something actionable by nobody.
  status text not null default 'pending'
    check (status in ('pending', 'replied', 'partial', 'failed', 'skipped')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_comment_replies_recent_idx
  on public.instagram_comment_replies (created_at desc);

create index if not exists instagram_comment_replies_commenter_idx
  on public.instagram_comment_replies (commenter_id);

create index if not exists instagram_comment_replies_status_idx
  on public.instagram_comment_replies (status) where status <> 'replied';

alter table public.instagram_comment_replies enable row level security;

-- Service role only. The monitoring page is admin-gated and reads through a
-- server component, so no public read needs to exist.
create policy "Allow service role full access" on public.instagram_comment_replies
  for all to service_role using (true) with check (true);

comment on column public.instagram_comment_replies.dm_sent_at is
  'Proof the one permitted private reply has been spent. Meta allows ONE message to a commenter within 7 days and offers no way to ask whether it was used - this column is the only record, so a second attempt is refused on the strength of it.';
comment on column public.instagram_comment_replies.commenter_prior_comments is
  'What we knew when the reply was written, not a live count. The tone rule is to treat everyone as new until they show otherwise, and that decision has to stay explicable after the fact.';
