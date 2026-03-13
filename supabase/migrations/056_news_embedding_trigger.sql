
-- Migration 056: News Intelligence Embedding Trigger
-- Connects the news_intelligence table to the AI RAG system.

-- 1. Add Trigger
DROP TRIGGER IF EXISTS trigger_queue_news_intelligence_embedding ON public.news_intelligence;
CREATE TRIGGER trigger_queue_news_intelligence_embedding
    AFTER INSERT OR UPDATE ON public.news_intelligence
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- 2. Manually queue existing news for indexing
INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
SELECT project_id, 'news_intelligence', id
FROM public.news_intelligence
ON CONFLICT (source_table, source_id) DO UPDATE
SET status = 'pending', created_at = now();

COMMENT ON TRIGGER trigger_queue_news_intelligence_embedding ON public.news_intelligence IS 'Ensures that trending news articles are automatically indexed for AI retrieval.';
