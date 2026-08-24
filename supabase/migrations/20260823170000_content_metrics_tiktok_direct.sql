-- TikTok gets read DIRECTLY, even though it is still POSTED through GoHighLevel.
--
-- The two are separate problems and it took a probe to see it. GoHighLevel is a
-- fine publisher and stays the publisher — but its post list reports only
-- {like, share, comment} and no view count, and publishing through it returns
-- {"id": "accepted"} rather than a TikTok post id, so there is nothing to join a
-- number to even if one existed.
--
-- TikTok's own Display API answers all of that. The token this project already
-- holds carries scope user.info.basic, user.info.profile, user.info.stats,
-- video.list — and video.list returns view_count, like_count, comment_count and
-- share_count per video. Confirmed live: 83 videos on @shearquery, 254
-- followers.
--
-- THE TOKEN WAS HIDING UNDER AN OLD NAME. client_db_connections holds it
-- labelled "TikTok - Lamont | Agency Owner/Educator" and tiktok_accounts still
-- says the username is `freelancekickstart`, last synced 2026-03-20. Both are
-- stale: user/info on that same open_id now returns username `shearquery`. The
-- account was renamed, not replaced, so the connection kept working while every
-- stored copy of its name went wrong. Do not conclude from a label that a token
-- belongs to the wrong account — ask the API.
--
-- IMPRESSIONS ARE NOT AVAILABLE HERE EITHER. Asking for the field returns
-- {"code":"invalid_params","message":"impressions are invalid field(s)"}. That
-- is now three of three — YouTube, Instagram and TikTok all report views and
-- none report impressions.
alter table public.content_metrics_daily
  drop constraint if exists content_metrics_daily_platform_check;

alter table public.content_metrics_daily
  add constraint content_metrics_daily_platform_check
  check (platform in ('youtube','instagram','gbp','linkedin','tiktok','tiktok_ghl','x','google'));

-- 'tiktok_ghl' stays a legal value so the rows already collected under it keep
-- their meaning. Nothing writes it any more; 'tiktok' is the live one.
comment on column public.content_metrics_daily.platform is
  'Destination. tiktok = read directly from TikTok video.list; tiktok_ghl is retained only for rows collected before the direct read existed, when GoHighLevel was the only source and reported no views.';
