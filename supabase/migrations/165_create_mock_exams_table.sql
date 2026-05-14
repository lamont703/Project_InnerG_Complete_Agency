-- 165_create_mock_exams_table.sql
-- Persistent storage for the 90-minute State Board simulation.

CREATE TABLE IF NOT EXISTS mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'timed_out', 'abandoned')),
    
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    time_limit_minutes INTEGER DEFAULT 90,
    
    -- Store the 100-question blueprint generated for this specific session
    questions JSONB NOT NULL DEFAULT '[]',
    
    -- Store student progress: { question_id: { answer_index: number, flagged: boolean, latency_ms: number } }
    answers JSONB NOT NULL DEFAULT '{}',
    
    predicted_score INTEGER,
    final_score INTEGER,
    cognitive_analysis TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;

-- Students can view their own exams
CREATE POLICY "Students can view own mock exams" 
ON mock_exams FOR SELECT 
USING (auth.uid() = student_id);

-- Students can update their own in-progress exams
CREATE POLICY "Students can update own active mock exams" 
ON mock_exams FOR UPDATE 
USING (auth.uid() = student_id AND status = 'started');

-- Students can insert their own mock exams
CREATE POLICY "Students can create mock exams" 
ON mock_exams FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Performance Index
CREATE INDEX idx_mock_exams_student_status ON mock_exams(student_id, status);
