-- 085_project_metrics_snapshots.sql
-- Create a centralized table for project-level metrics history

CREATE TABLE IF NOT EXISTS public.project_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metrics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one snapshot per project per day
    UNIQUE(project_id, snapshot_date)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_project_metrics_snapshots_project_id ON public.project_metrics_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_snapshots_date ON public.project_metrics_snapshots(snapshot_date);

-- Enable RLS
ALTER TABLE public.project_metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can manage all snapshots"
    ON public.project_metrics_snapshots
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    ));

CREATE POLICY "Clients can view their own project snapshots"
    ON public.project_metrics_snapshots
    FOR SELECT
    USING (
        project_id IN (
            SELECT pua.project_id FROM public.project_user_access pua
            WHERE pua.user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_metrics_snapshots_updated_at
    BEFORE UPDATE ON public.project_metrics_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
