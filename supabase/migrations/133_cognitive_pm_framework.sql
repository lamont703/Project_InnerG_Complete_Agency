-- Migration 133: Cognitive Project Management Framework (CPMAI)
-- Implements the 6-phase iterative AI project management hub.

-- 1. Project Management Iterations
CREATE TABLE IF NOT EXISTS public.pm_iterations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL, -- e.g. "Q1 Strategy Refresh", "Alpha Launch"
    status          TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, FINALIZED
    current_phase   INTEGER NOT NULL DEFAULT 1, -- 1-6 representing the CPMAI phases
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Framework Responses (Answers for each question)
CREATE TABLE IF NOT EXISTS public.pm_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id    UUID NOT NULL REFERENCES public.pm_iterations(id) ON DELETE CASCADE,
    phase           INTEGER NOT NULL, -- 1-6
    question_key    TEXT NOT NULL, -- The unique identifier for the prompt from the MD file
    response_text   TEXT,
    ai_suggestion   TEXT, -- For storing suggestions from the Neural Assistant
    metadata        JSONB DEFAULT '{}'::jsonb, -- For structured data like selections/scores
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(iteration_id, question_key)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pm_iterations_project ON public.pm_iterations(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_responses_iteration ON public.pm_responses(iteration_id);

-- 4. Enable RLS
ALTER TABLE public.pm_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_responses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Agency Admin Access)
CREATE POLICY "Super admins can manage PM iterations"
    ON public.pm_iterations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage PM responses"
    ON public.pm_responses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_iterations i
            WHERE i.id = iteration_id
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role = 'super_admin'
            )
        )
    );

-- 6. Trigger for updated_at
DROP TRIGGER IF EXISTS tr_pm_iterations_updated_at ON public.pm_iterations;
CREATE TRIGGER tr_pm_iterations_updated_at
    BEFORE UPDATE ON public.pm_iterations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_pm_responses_updated_at ON public.pm_responses;
CREATE TRIGGER tr_pm_responses_updated_at
    BEFORE UPDATE ON public.pm_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Add Feature Flag to projects (if not existing)
-- This ensures 'pm_framework' is a toggleable feature.
COMMENT ON COLUMN public.pm_iterations.status IS 'Status of the PM cycle: DRAFT, ACTIVE, FINALIZED';
COMMENT ON COLUMN public.pm_responses.question_key IS 'Unique key mapping to the project_management_framework instructions.';
