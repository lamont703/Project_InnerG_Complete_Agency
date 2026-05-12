-- BARBER INTELLIGENCE EXAM TELEMETRY
-- ARCHIVIST: ADI Framework

CREATE TABLE IF NOT EXISTS public.barber_exam_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portal_slug TEXT NOT NULL,
    question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    domain public.barber_exam_domain NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_ms INTEGER NOT NULL,
    changed_answer BOOLEAN DEFAULT false,
    session_id UUID NOT NULL, -- Used to group a 10-question burst
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid AI querying
CREATE INDEX IF NOT EXISTS idx_telemetry_student_id ON public.barber_exam_telemetry(student_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_portal_slug ON public.barber_exam_telemetry(portal_slug);
CREATE INDEX IF NOT EXISTS idx_telemetry_domain ON public.barber_exam_telemetry(domain);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON public.barber_exam_telemetry(session_id);

-- Enable RLS
ALTER TABLE public.barber_exam_telemetry ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Students can insert their own telemetry
DO $$ BEGIN
    CREATE POLICY "Students can insert own telemetry" 
    ON public.barber_exam_telemetry FOR INSERT 
    WITH CHECK (auth.uid() = student_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Students can view their own telemetry
DO $$ BEGIN
    CREATE POLICY "Students can view own telemetry" 
    ON public.barber_exam_telemetry FOR SELECT 
    USING (auth.uid() = student_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Admins can view/manage all telemetry
DO $$ BEGIN
    CREATE POLICY "Admins can manage all telemetry" 
    ON public.barber_exam_telemetry FOR ALL 
    USING (auth.jwt() ->> 'role' = 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
