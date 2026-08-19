-- The cover image for a queued post.
--
-- WHY A COLUMN RATHER THAN A CONVENTION. Deriving the cover path from the video
-- path would save a column and then break the first time a video is re-rendered
-- under a new name, silently serving the old cover or none at all. The URL is a
-- fact about the row.
--
-- NULL IS A VALID STATE and means "no cover was made". Instagram falls back to
-- the first frame of the Reel, which is a reasonable cover for the stat cards
-- the Shorts pipeline renders - they open on the number. It is the hairstyle
-- grids that need a deliberate one, because their first frame is mid-fade-in.

alter table public.publisher_queue
  add column if not exists thumbnail_url text;

comment on column public.publisher_queue.thumbnail_url is
  'Public JPEG URL used as the Instagram Reel cover_url and attempted as the '
  'YouTube thumbnail. Must be JPEG, under 8MB, sRGB, 9:16 - Instagram rejects '
  'other formats and crops anything that is not 9:16 to its middle rectangle.';
