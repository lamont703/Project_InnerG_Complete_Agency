-- DRAFT FIRST, SEND ON APPROVAL, AUTOMATE WHEN TRUSTED.
--
-- The comment agent was built to reply the moment a comment arrived. That is
-- the right end state and the wrong starting point: its first words under a
-- post are public, permanent, and in the brand's voice, and nobody has yet seen
-- what it sounds like on a real comment.
--
-- So the agent now writes the reply and stops. It lands as a draft on
-- /admin/comment-engagement with a Send button, and a switch turns the pause
-- off once the drafts have earned it.
--
-- WHY A SETTING RATHER THAN AN ENV VAR. Flipping this is a judgement made after
-- reading a few drafts, not a deployment. An env var would need a redeploy to
-- change and would silently differ between preview and production — and the
-- difference between "drafts only" and "posting in public" is the last thing
-- that should vary by environment without anyone noticing.
--
-- SINGLE ROW, id = true, matching pixel_analytics_settings. The constraint is
-- what makes it a setting rather than a table that happens to have one row in
-- it today.
create table if not exists public.instagram_agent_settings (
  id boolean primary key default true check (id),

  /*
   * OFF BY DEFAULT, and deliberately not a nullable column with a coalesce
   * somewhere. A missing row must not read as "yes, post to the public
   * internet" — every path that cannot find this setting has to fall back to
   * drafting.
   */
  comment_auto_reply boolean not null default false,

  -- Who turned it on and when, because "why did it start posting on its own"
  -- should be answerable.
  comment_auto_reply_changed_at timestamptz,
  comment_auto_reply_changed_by text,

  updated_at timestamptz not null default now()
);

insert into public.instagram_agent_settings (id, comment_auto_reply)
values (true, false)
on conflict (id) do nothing;

alter table public.instagram_agent_settings enable row level security;

create policy "Allow service role full access" on public.instagram_agent_settings
  for all to service_role using (true) with check (true);


-- 'draft' joins the statuses: written, reviewed by nobody, sent to nobody.
--
-- Dropping and re-adding rather than altering, because a CHECK constraint
-- cannot be extended in place. The existing values are all still permitted, so
-- no row changes meaning.
alter table public.instagram_comment_replies
  drop constraint if exists instagram_comment_replies_status_check;

alter table public.instagram_comment_replies
  add constraint instagram_comment_replies_status_check
  check (status in ('pending', 'draft', 'replied', 'partial', 'failed', 'skipped'));

-- Who pressed Send, so an approved reply is distinguishable from an automatic
-- one after the fact. Null on anything the agent sent by itself.
alter table public.instagram_comment_replies
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

create index if not exists instagram_comment_replies_draft_idx
  on public.instagram_comment_replies (created_at desc) where status = 'draft';

comment on column public.instagram_agent_settings.comment_auto_reply is
  'False means the agent drafts and waits. Anything that cannot read this setting must behave as if it were false - a missing row must never read as permission to post publicly.';
