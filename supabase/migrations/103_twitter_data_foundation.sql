-- Migration 103: Twitter (X) Data Foundation
-- Inner G Complete Agency — Proprietary Tracking System

-- 1. Twitter Accounts Table
CREATE TABLE IF NOT EXISTS public.twitter_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    twitter_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    name TEXT,
    profile_picture_url TEXT,
    follower_count BIGINT DEFAULT 0,
    following_count BIGINT DEFAULT 0,
    tweet_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, twitter_user_id)
);

-- 2. Twitter Tweets Table (Posts/X's)
CREATE TABLE IF NOT EXISTS public.twitter_tweets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tweet_id TEXT NOT NULL,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    like_count BIGINT DEFAULT 0,
    retweet_count BIGINT DEFAULT 0,
    reply_count BIGINT DEFAULT 0,
    quote_count BIGINT DEFAULT 0,
    impression_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tweet_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_project ON public.twitter_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_twitter_tweets_project ON public.twitter_tweets(project_id);

-- 4. RLS
ALTER TABLE public.twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitter_tweets ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can view their project's twitter accounts" ON public.twitter_accounts;
CREATE POLICY "Users can view their project's twitter accounts" 
    ON public.twitter_accounts FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view their project's twitter tweets" ON public.twitter_tweets;
CREATE POLICY "Users can view their project's twitter tweets" 
    ON public.twitter_tweets FOR SELECT 
    USING (can_access_project(project_id));

-- 6. AI RAG Triggers: Queue for Embeddings
DROP TRIGGER IF EXISTS trigger_queue_twitter_accounts_embedding ON public.twitter_accounts;
CREATE TRIGGER trigger_queue_twitter_accounts_embedding
    AFTER INSERT OR UPDATE ON public.twitter_accounts
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS trigger_queue_twitter_tweets_embedding ON public.twitter_tweets;
CREATE TRIGGER trigger_queue_twitter_tweets_embedding
    AFTER INSERT OR UPDATE ON public.twitter_tweets
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
