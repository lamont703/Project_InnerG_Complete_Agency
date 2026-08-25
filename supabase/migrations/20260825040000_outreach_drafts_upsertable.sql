-- Make the drafts table upsertable. This is the SECOND time this exact mistake
-- has been made in this schema, so it is written down properly.
--
-- The live-draft index was created PARTIAL — WHERE status = 'pending' — so that
-- sent and dismissed rows could stay as history without blocking a new draft.
-- That reasoning is sound and the consequence was not: ON CONFLICT can only use
-- a partial index when the statement repeats the index predicate, and PostgREST
-- has no way to express one. Every upsert failed with 42P10.
--
-- The failure was invisible. The generated draft was still returned to the
-- page, so the text rendered — it simply never persisted, so the table stayed
-- empty, every load regenerated, and "not now" had no row to mark dismissed.
--
-- member_agent_messages_external_idx had the identical problem earlier the same
-- day. The lesson worth keeping: A PARTIAL UNIQUE INDEX AND PostgREST UPSERT
-- ARE INCOMPATIBLE. If a table needs upsert, its conflict target must be a
-- plain unique index.
--
-- History moves to its own column instead. status stays for reading; a draft
-- that is sent or dismissed is stamped and STAYS the row for that (member,
-- signal), and the next suggestion overwrites it. That loses the ability to
-- keep every past draft, which nothing needed — member_agent_messages already
-- records what was actually sent, and that is the history that matters.
DROP INDEX IF EXISTS member_outreach_drafts_live_idx;

DELETE FROM public.member_outreach_drafts a
  USING public.member_outreach_drafts b
  WHERE a.community_member_id = b.community_member_id
    AND a.signal = b.signal
    AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS member_outreach_drafts_live_idx
    ON public.member_outreach_drafts (community_member_id, signal);

COMMENT ON INDEX public.member_outreach_drafts_live_idx IS
    'Upsert target. NOT partial — a partial index cannot back an ON CONFLICT through PostgREST, which failed silently once already.';
