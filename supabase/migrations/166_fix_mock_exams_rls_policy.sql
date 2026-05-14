-- 166_fix_mock_exams_rls_policy.sql
-- Relaxing the UPDATE policy to allow status transitions.

DROP POLICY IF EXISTS "Students can update own active mock exams" ON mock_exams;

-- Allow students to UPDATE their own records as long as they were the ones who started it.
-- We check the student_id in USING, and allow any transition in WITH CHECK as long as student_id remains theirs.
CREATE POLICY "Students can update own mock exams" 
ON mock_exams FOR UPDATE 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
