-- WHICH PIPELINE A CARD IS FOR, STATED RATHER THAN GUESSED.
--
-- The renderer derived the format from the TITLE: a small leading count meant a
-- hairstyle grid, anything else meant an avatar. That made the research agent
-- choose a renderer and a price by accident — it wrote a headline, and the shape
-- of that headline silently decided between a free card and a $1.16 avatar.
--
-- It also decided WRONG for an entire category. Every data reel carries a figure
-- like "130,165" or "47,674", which is not a small leading count, so all six in
-- the queue derived to `avatar`. Clicking Render on one would have bought a
-- talking head instead of the animated card it was written to be.
--
-- NULLABLE ON PURPOSE. Existing rows keep deriving — lib/video-type.js falls
-- back to `stat` being present, then to the title rule — so nothing has to be
-- backfilled to stay correct. The column records INTENT where intent was
-- expressed, and silence still means "work it out".
alter table public.publisher_queue
  add column if not exists video_type text;

comment on column public.publisher_queue.video_type is
  'grid | data | avatar. The rendering pipeline this card is for, stated by whoever queued it. NULL means derive it (see lib/video-type.js). An unrecognised value is ignored rather than trusted, so a typo cannot route a render at a pipeline that does not exist.';

-- THE RESEARCH AGENT MUST BE ABLE TO SAY WHICH FORMAT IT MEANT.
--
-- Without this the agent picks a pipeline by accident: it writes a headline, and
-- the shape of that headline decides between a free card and a $1.16 avatar.
-- Choosing the format is a real editorial decision — "is this idea a talking
-- head, a list of things to look at, or a number?" — and it should be made on
-- purpose and reviewable before anything is rendered.
alter table public.research_findings
  add column if not exists video_type text;

-- A data reel is a FIGURE, animated. The renderer needs the number and the line
-- under it, and the research agent is the thing holding the evidence, so it
-- supplies them rather than leaving the card unrenderable. Null for the other
-- two formats, which carry their content in the title and suggestion.
alter table public.research_findings
  add column if not exists stat text;
alter table public.research_findings
  add column if not exists label text;

comment on column public.research_findings.video_type is
  'grid | data | avatar. Which rendering pipeline this idea is for, chosen by the agent. Carried to publisher_queue.video_type when queued.';
