-- COMMENTS ARE NO LONGER ONLY INSTAGRAM.
--
-- TikTok comments are readable through GoHighLevel, so the same agent, the same
-- voice rules and the same review queue should serve both. One table and one
-- page rather than two of each — the expensive part is the policy, and having
-- it applied by two code paths is how they start answering the same comment
-- differently.
--
-- THE TABLE NAME IS NOW A MISNOMER and is left alone deliberately. Renaming it
-- would touch three files for cosmetic gain and break any query written against
-- it in the meantime; the platform column says what a row actually is.
--
-- WHY TIKTOK ROWS CAN NEVER REACH 'replied' BY THEMSELVES. GoHighLevel exposes
-- reading TikTok comments and liking them, and nothing else — every reply path
-- returns 404, confirmed by probing five of them. Replying is only available
-- inside GHL's own workflow builder. So a TikTok draft is written here and
-- POSTED THERE, and the row records that it left rather than pretending we sent
-- it.

alter table public.instagram_comment_replies
  add column if not exists platform text not null default 'instagram'
    check (platform in ('instagram', 'tiktok'));

/*
 * GHL's own id for the comment, which is what its API and its workflow builder
 * both key on. Distinct from comment_id, which for TikTok holds the
 * platformCommentId - the id TikTok itself issues. Both are needed: one to
 * match what GHL sends us, one to identify the comment on the platform.
 */
alter table public.instagram_comment_replies
  add column if not exists external_comment_id text;

/*
 * 'copied' — the draft was approved and handed over for posting in GoHighLevel,
 * because no API can post it. It is deliberately NOT 'replied': we did not send
 * anything, and a status claiming otherwise would make the queue look finished
 * while a comment sat unanswered. Whoever pastes it is the one who replied.
 */
alter table public.instagram_comment_replies
  drop constraint if exists instagram_comment_replies_status_check;

alter table public.instagram_comment_replies
  add constraint instagram_comment_replies_status_check
  check (status in ('pending', 'draft', 'replied', 'copied', 'partial', 'failed', 'skipped'));

create index if not exists instagram_comment_replies_platform_idx
  on public.instagram_comment_replies (platform, created_at desc);

create unique index if not exists instagram_comment_replies_external_idx
  on public.instagram_comment_replies (platform, external_comment_id)
  where external_comment_id is not null;

-- Auto-reply is per platform. TikTok cannot post automatically at all, so the
-- switch there governs whether a draft is written, never whether it is sent.
alter table public.instagram_agent_settings
  add column if not exists tiktok_comment_auto_reply boolean not null default false;

comment on column public.instagram_comment_replies.platform is
  'instagram or tiktok. Instagram replies are posted by us through the Graph API; TikTok replies can only be posted inside GoHighLevel, because every GHL reply endpoint 404s and the capability exists solely in their workflow builder.';
comment on column public.instagram_comment_replies.status is
  '"copied" means a TikTok draft was approved and handed to GoHighLevel to post. It is not "replied" - nothing was sent from here, and conflating the two would hide unanswered comments.';
