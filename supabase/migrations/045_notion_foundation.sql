-- Migration 045: Create Notion Intelligence Tables
-- Connects Notion pages and blocks for AI analysis.

-- 1. Add notion to External DB Type Enum if not exists
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'notion';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed Notion Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'Notion Knowledge',
    'notion',
    'Sync Notion pages and databases for AI analysis.',
    '{
        "required": ["notion_api_key"],
        "properties": {
            "notion_api_key": { "type": "string", "label": "Notion API Key", "placeholder": "secret_...", "sensitive": true },
            "page_id": { "type": "string", "label": "Starting Page ID", "placeholder": "Enter page or database ID to sync from", "default": "" },
            "depth": { "type": "number", "label": "Sync Depth", "default": 2 }
        }
    }'::jsonb
)
ON CONFLICT (provider) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description;

-- 3. Add notion_data_enabled to project_agent_config
ALTER TABLE public.project_agent_config
ADD COLUMN IF NOT EXISTS notion_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Notion Pages
CREATE TABLE IF NOT EXISTS public.notion_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    notion_page_id TEXT NOT NULL, -- Page ID from Notion
    title TEXT NOT NULL,
    parent_id TEXT,
    url TEXT,
    content TEXT, -- Markdown or plain text representation
    last_edited_time TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, notion_page_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notion_pages_project ON public.notion_pages(project_id);

-- RLS
ALTER TABLE public.notion_pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their project's notion pages" 
    ON public.notion_pages FOR SELECT 
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS trigger_queue_notion_pages_embedding ON public.notion_pages;
CREATE TRIGGER trigger_queue_notion_pages_embedding
    AFTER INSERT OR UPDATE ON public.notion_pages
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
