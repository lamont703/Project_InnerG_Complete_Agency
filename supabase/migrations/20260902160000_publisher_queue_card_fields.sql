-- THE REST OF A DATA REEL CARD, so the board's Render button can build a whole one.
--
-- THE BUG THIS CLOSES. scripts/shorts/queue_entity_cards.js passes eight fields
-- to the card renderer — chip, date, stat, label, punch, source, question, tone.
-- render_queued.js, which is what the Render button actually runs, had columns
-- for only three of them and passed only those. The other five fell back to the
-- example card baked into scripts/podcast-visuals/shorts-news.html, so a card
-- about eyelash licensing rendered "They pass the hands-on exam at 92.34%" over
-- a source line citing a PSI roster of 2,411 records it was never built from.
--
-- Both wrong, both plausible, and nothing failed. A card rendered this way is a
-- false claim in the channel's own voice.
--
-- The renderer and template were fixed so an omitted field now renders BLANK
-- rather than inheriting. These columns are the other half: blank is safe but it
-- is not good, and a Data Reel without a source line is one nobody can check.
alter table public.publisher_queue add column if not exists chip text;
alter table public.publisher_queue add column if not exists punch text;
alter table public.publisher_queue add column if not exists source text;

comment on column public.publisher_queue.chip is
  'Small category label above the figure, e.g. "TEXAS · LICENSING". Null renders blank.';
comment on column public.publisher_queue.punch is
  'One line under the label that gives the figure its edge. Null renders blank — it must never inherit another card''s line.';
comment on column public.publisher_queue.source is
  'Where the figure came from, including the read date. A card that cannot be traced should not be published; see the note in scripts/podcast-visuals/shorts-news.html.';
