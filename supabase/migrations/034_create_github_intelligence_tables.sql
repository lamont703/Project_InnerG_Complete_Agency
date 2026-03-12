-- Strategic GitHub Intelligence for Inner G Complete

-- 0. Add GitHub to External DB Type Enum
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'github';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 0.5 Ensure provider is unique before seeding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'connector_types_provider_unique'
    ) THEN
        ALTER TABLE public.connector_types ADD CONSTRAINT connector_types_provider_unique UNIQUE (provider);
    END IF;
END $$;

-- 0.6 Seed Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'GitHub Repository',
    'github',
    'Sync repository metadata, commits, and pull requests.',
    '{
        "required": ["github_token", "repository"],
        "properties": {
            "github_token": { "type": "string", "label": "GitHub PAT", "placeholder": "ghp_...", "sensitive": true },
            "repository": { "type": "string", "label": "Repository", "placeholder": "Search or enter owner/repo", "dynamic": "github-repos" }
        }
    }'::jsonb
)
ON CONFLICT (provider) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description;

-- 1. GitHub Repositories
CREATE TABLE IF NOT EXISTS public.github_repos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    external_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    primary_language TEXT,
    stars INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    last_pushed_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GitHub Commits
CREATE TABLE IF NOT EXISTS public.github_commits (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    repo_id UUID REFERENCES public.github_repos(id) ON DELETE CASCADE,
    sha TEXT UNIQUE NOT NULL,
    message TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_login TEXT,
    authored_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GitHub Pull Requests
CREATE TABLE IF NOT EXISTS public.github_pull_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    repo_id UUID REFERENCES public.github_repos(id) ON DELETE CASCADE,
    external_id BIGINT UNIQUE NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    state TEXT NOT NULL, -- 'open', 'closed'
    author_login TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    merged_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.github_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_pull_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Standard Project-Based Access)
CREATE POLICY "Users can view GitHub data for their projects"
    ON public.github_repos FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can view Github commits for their projects"
    ON public.github_commits FOR SELECT
    USING (repo_id IN (SELECT id FROM public.github_repos WHERE project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())));

CREATE POLICY "Users can view Github PRs for their projects"
    ON public.github_pull_requests FOR SELECT
    USING (repo_id IN (SELECT id FROM public.github_repos WHERE project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_github_repos_project_id ON public.github_repos(project_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_repo_id ON public.github_commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_pull_requests_repo_id ON public.github_pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_authored_at ON public.github_commits(authored_at);
