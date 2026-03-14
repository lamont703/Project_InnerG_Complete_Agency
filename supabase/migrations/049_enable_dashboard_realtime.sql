-- Migration 049: Enable Supabase Realtime for Dashboard Tables
-- Inner G Complete Agency — Client Intelligence Portal
-- This allows the UI to receive instant updates when the AI Agent creates data.

-- 1. Check if the publication exists, if not create it (Supabase usually has it by default)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to the publication
-- Note: We use ALTER PUBLICATION ... ADD TABLE because typical Supabase setups 
-- expect this publication to exist. If it's already "FOR ALL TABLES", this is redundant but safe.
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_content_plan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ghl_social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ghl_social_insights;

-- 3. Ensure REPLICA IDENTITY is set to DEFAULT or FULL if needed for deletes
-- For most cases DEFAULT (primary key) is enough for Realtime.
ALTER TABLE public.ai_signals REPLICA IDENTITY DEFAULT;
ALTER TABLE public.social_content_plan REPLICA IDENTITY DEFAULT;
ALTER TABLE public.activity_log REPLICA IDENTITY DEFAULT;

COMMENT ON PUBLICATION supabase_realtime IS 'Enables realtime broadcasting for Inner G Agency dashboard tables.';
