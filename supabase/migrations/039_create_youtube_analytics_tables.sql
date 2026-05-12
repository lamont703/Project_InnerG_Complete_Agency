-- Migration 039: Create YouTube Analytics Intelligence Tables
-- Provides the foundation for storing YouTube channel metrics and video data for AI analysis.

-- 1. YouTube Channels
CREATE TABLE IF NOT EXISTS public.youtube_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    subscriber_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    video_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, channel_id)
);

-- 2. YouTube Videos
CREATE TABLE IF NOT EXISTS public.youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, video_id)
);

-- Indexes for efficient querying by AI Intelligence
CREATE INDEX IF NOT EXISTS idx_youtube_channels_project ON public.youtube_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_channel_id ON public.youtube_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_project ON public.youtube_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel ON public.youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_video_id ON public.youtube_videos(video_id);

-- RLS Policies
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

-- Channels Policies
DROP POLICY IF EXISTS "Users can view their project's youtube channels" ON public.youtube_channels;
CREATE POLICY "Users can view their project's youtube channels" 
    ON public.youtube_channels FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Service role can manage youtube channels" ON public.youtube_channels;
CREATE POLICY "Service role can manage youtube channels" 
    ON public.youtube_channels FOR ALL 
    USING (auth.uid() IS NULL);

-- Videos Policies
DROP POLICY IF EXISTS "Users can view their project's youtube videos" ON public.youtube_videos;
CREATE POLICY "Users can view their project's youtube videos" 
    ON public.youtube_videos FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Service role can manage youtube videos" ON public.youtube_videos;
CREATE POLICY "Service role can manage youtube videos" 
    ON public.youtube_videos FOR ALL 
    USING (auth.uid() IS NULL);

-- Enable RAG Embedding Triggers for Analysis
DROP TRIGGER IF EXISTS trigger_queue_youtube_channels_embedding ON public.youtube_channels;
CREATE TRIGGER trigger_queue_youtube_channels_embedding
    AFTER INSERT OR UPDATE ON public.youtube_channels
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS trigger_queue_youtube_videos_embedding ON public.youtube_videos;
CREATE TRIGGER trigger_queue_youtube_videos_embedding
    AFTER INSERT OR UPDATE ON public.youtube_videos
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

