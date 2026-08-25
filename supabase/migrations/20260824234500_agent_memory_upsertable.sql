-- Make the import correctable in place.
--
-- The unique index on (channel, external_id) was created PARTIAL —
-- WHERE external_id IS NOT NULL — to let chat turns, which have no external id,
-- coexist. That predicate was never necessary: PostgreSQL already treats NULLs
-- as distinct in a unique index, so any number of rows with a null external_id
-- are permitted without it.
--
-- It was, however, actively harmful. ON CONFLICT can only use a partial index
-- if the statement repeats the index predicate, and PostgREST's on_conflict
-- parameter has no way to express one. So every upsert failed with 42P10, and
-- the backfill could only ever insert — never correct a row it had already
-- written.
--
-- That matters because the classification is the thing most likely to improve.
-- The first import tagged everything 'ghl_backfill'; reading the result showed
-- marketing drips and product notifications sitting in memory as though they
-- were conversation. Fixing that has to be a re-run, not a delete-and-redo on
-- live agent memory.
DROP INDEX IF EXISTS member_agent_messages_external_idx;

CREATE UNIQUE INDEX IF NOT EXISTS member_agent_messages_external_idx
    ON public.member_agent_messages (channel, external_id);

COMMENT ON INDEX public.member_agent_messages_external_idx IS
    'Idempotent import key. NOT partial, deliberately — a partial index cannot back an ON CONFLICT through PostgREST, and nulls are already distinct here.';
