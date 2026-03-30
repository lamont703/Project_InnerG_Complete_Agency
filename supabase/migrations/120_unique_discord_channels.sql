-- Migration 116: Unique Community Channels
-- Ensures a project cannot have duplicate bridges for the same Discord Guild.

-- Since guild_id is in config JSONB, we can use a functional index for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_channels_discord_uniqueness 
ON public.community_channels (project_id, (config->>'guild_id')) 
WHERE (platform = 'discord' AND config->>'guild_id' IS NOT NULL);
