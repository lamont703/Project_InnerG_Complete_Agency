-- Migration: Drop all queue_embedding_job triggers across the database
-- This completely halts the auto-queueing of new data into the AI RAG embedding pipeline

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tgname, relname
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE pg_proc.proname = 'queue_embedding_job'
    LOOP
        RAISE NOTICE 'Dropping trigger % on table %', r.tgname, r.relname;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON ' || quote_ident(r.relname) || ' CASCADE;';
    END LOOP;
END
$$;
