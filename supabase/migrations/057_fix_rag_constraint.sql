
-- Migration 057: Fix Missing RAG Constraint
-- Ensures the document_embeddings table has the required unique constraint for upserts.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'document_embeddings_source_table_source_id_key'
    ) THEN
        ALTER TABLE public.document_embeddings 
        ADD CONSTRAINT document_embeddings_source_table_source_id_key UNIQUE (source_table, source_id);
    END IF;
END $$;

COMMENT ON CONSTRAINT document_embeddings_source_table_source_id_key ON public.document_embeddings IS 'Ensures each source record has at most one vector embedding.';
