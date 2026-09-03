-- THE FORMATS ARE NAMED FOR WHAT THE VIDEO IS, NOT FOR WHAT RENDERS IT.
--
-- The old ids were `grid`, `data`, `avatar` and `news`, and two of them could
-- not be told apart in conversation: BOTH the `avatar` and the `news` format
-- are talking-head avatar videos, and both are about something topical. Asking
-- "how did the avatar video do?" did not identify a video. Naming the machinery
-- was the mistake; a name that says what the viewer gets does not have the
-- problem.
--
--   grid   -> lookbook   six looks panned across a grid, 9s, free
--   data   -> figure     one number, animated, 9s, free            (label: Data Reel)
--   avatar -> hottake    30s opinion on an evergreen topic, ~$1.16 (label: Hot Take)
--   news   -> newsdesk   90s reaction to a real headline, ~$1.31   (label: News Desk)
--
-- DONE NOW BECAUSE IT IS FREE NOW. The column is one day old: 59 of 60
-- publisher_queue rows are NULL and all 20 research_findings rows are NULL, so
-- exactly one row in the database carries a value. This is the cheapest this
-- rename will ever be, and it gets more expensive every day the queue fills.
--
-- lib/video-type.js ALSO maps the old ids forward, which is not redundant with
-- this. That map catches rows written by anything still in flight against the
-- old vocabulary; this statement fixes what is already stored. Neither one
-- alone is sufficient, and the map is safe to delete once nothing writes the
-- old spellings.
update public.publisher_queue set video_type = case video_type
  when 'grid' then 'lookbook'
  when 'data' then 'figure'
  when 'avatar' then 'hottake'
  when 'news' then 'newsdesk'
  else video_type end
where video_type in ('grid', 'data', 'avatar', 'news');

update public.research_findings set video_type = case video_type
  when 'grid' then 'lookbook'
  when 'data' then 'figure'
  when 'avatar' then 'hottake'
  when 'news' then 'newsdesk'
  else video_type end
where video_type in ('grid', 'data', 'avatar', 'news');

-- NO CHECK CONSTRAINT, deliberately, and this is the same call the original
-- migration made. An unrecognised value is IGNORED by lib/video-type.js and the
-- card falls through to the derivation, so a bad string is already harmless. A
-- constraint would instead make adding the fifth format a schema change
-- co-ordinated with a deploy, and would reject a row rather than degrade it.
comment on column public.publisher_queue.video_type is
  'lookbook | figure | hottake | newsdesk. The rendering pipeline this card is for, stated by whoever queued it. NULL means derive it (see lib/video-type.js). An unrecognised value is ignored rather than trusted, so a typo cannot route a render at a pipeline that does not exist. The old ids (grid/data/avatar/news) still resolve via LEGACY_VIDEO_TYPE_IDS.';

comment on column public.research_findings.video_type is
  'lookbook | figure | hottake. Which rendering pipeline this idea is for, chosen by the agent. Carried to publisher_queue.video_type when queued. `newsdesk` is deliberately NOT offered here: it renders from a hand-written script JSON, not from a card, so an agent must not be able to queue one.';
