-- Migration 110: Enhance Social RAG Coverage
-- Inner G Complete Agency — Client Intelligence Portal
-- 
-- 1. Ensure all social media tables have embedding triggers.
-- 2. Add missing trigger for ghl_social_accounts.
-- 3. Re-queue existing social posts to leverage improved formatters (Full Text vs 100 chars).

-- 1. Add missing trigger for GHL Social Accounts
DROP TRIGGER IF EXISTS trigger_queue_ghl_social_accounts_embedding ON public.ghl_social_accounts;
CREATE TRIGGER trigger_queue_ghl_social_accounts_embedding
    AFTER INSERT OR UPDATE ON public.ghl_social_accounts
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- 2. Add description to table
COMMENT ON TRIGGER trigger_queue_ghl_social_accounts_embedding ON public.ghl_social_accounts IS 
  'Queues GHL social accounts for AI embedding to allow the agent to know which platforms are connected.';

-- 3. Re-queue existing social content for enhanced formatting
-- We delete existing embeddings to force a fresh "clean" chunk with the new formatters.
DELETE FROM public.document_embeddings 
WHERE source_table IN (
    'twitter_tweets', 
    'linkedin_posts', 
    'instagram_media', 
    'tiktok_videos', 
    'ghl_social_posts',
    'ghl_social_insights',
    'facebook_pages'
);

-- Twitter
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'twitter_tweets', id, 'pending' FROM public.twitter_tweets
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- LinkedIn
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'linkedin_posts', id, 'pending' FROM public.linkedin_posts
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- Instagram
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'instagram_media', id, 'pending' FROM public.instagram_media
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- TikTok
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'tiktok_videos', id, 'pending' FROM public.tiktok_videos
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- GHL Social Posts
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'ghl_social_posts', id, 'pending' FROM public.ghl_social_posts
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- GHL Social Insights
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'ghl_social_insights', id, 'pending' FROM public.ghl_social_insights
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- Facebook Pages
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'facebook_pages', id, 'pending' FROM public.facebook_pages
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;

-- Ensure ghl_social_accounts are also queued
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'ghl_social_accounts', id, 'pending' FROM public.ghl_social_accounts
ON CONFLICT (source_table, source_id) DO UPDATE SET status = 'pending', processed_at = NULL;
