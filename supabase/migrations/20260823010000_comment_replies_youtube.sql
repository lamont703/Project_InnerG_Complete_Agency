-- YOUTUBE JOINS THE SAME QUEUE.
--
-- Third platform, same table, same agent, same review page. YouTube is the
-- easiest of the three and was the last to be wired: the token the Shorts
-- publisher already uses carries youtube.force-ssl, which is exactly the scope
-- comments.insert needs. No middleman, no partner platform, no new OAuth —
-- reading is commentThreads.list and replying is comments.insert.
--
-- WHY EVERY COMMENT STILL GETS A DRAFT, including the hostile ones. The first
-- real comment on a publisher-posted Short was "They are all fcking ass",
-- twenty-six minutes after it went out. The temptation is to have the agent
-- decide what deserves an answer, and that was deliberately NOT built: a rule
-- that silently drops comments is a rule nobody can audit, and the failure mode
-- is invisible. Everything is drafted, a person decides, and Discard is a
-- recorded act rather than an absence.
--
-- SKIPPING IS PERMANENT BY CONSTRUCTION, which is the behaviour asked for. A
-- discarded row keeps status 'skipped' and its unique (platform,
-- external_comment_id) index means the sync can never insert it again — so the
-- agent will not re-draft a comment somebody already decided against. The
-- history is the row itself; nothing needs to remember separately.

alter table public.instagram_comment_replies
  drop constraint if exists instagram_comment_replies_platform_check;

alter table public.instagram_comment_replies
  add constraint instagram_comment_replies_platform_check
  check (platform in ('instagram', 'tiktok', 'youtube'));

alter table public.instagram_agent_settings
  add column if not exists youtube_comment_auto_reply boolean not null default false;

comment on column public.instagram_comment_replies.platform is
  'instagram, tiktok or youtube. Instagram replies post through the Graph API, TikTok through GoHighLevel, YouTube through comments.insert on the same token the Shorts publisher uses. A row with status skipped is a decision not to reply, and its unique index stops the sync ever offering it again.';
