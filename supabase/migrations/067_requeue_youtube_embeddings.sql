-- Re-queue all youtube_videos for embedding to pick up the updated transcript formatters
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'youtube_videos', id, 'pending'
FROM public.youtube_videos
ON CONFLICT (source_table, source_id) 
DO UPDATE SET status = 'pending', processed_at = NULL;

-- Also re-queue channels just in case
INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
SELECT project_id, 'youtube_channels', id, 'pending'
FROM public.youtube_channels
ON CONFLICT (source_table, source_id) 
DO UPDATE SET status = 'pending', processed_at = NULL;
