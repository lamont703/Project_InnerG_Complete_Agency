-- 163_create_preselected_question_bank_function.sql
-- This function acts as the "Preselected Bank" for the Barber Intelligence engine.
-- Standards: Verified, Active, and Not Correctly Answered in the last 7 days.

CREATE OR REPLACE FUNCTION get_preselected_question_bank(p_student_id UUID)
RETURNS SETOF question_bank AS $$
BEGIN
    RETURN QUERY
    SELECT q.*
    FROM question_bank q
    WHERE q.is_active = true
      AND q.is_verified = true
      -- ANTI-REPETITION FILTER:
      -- Exclude questions the student has answered correctly in the last 7 days.
      AND NOT EXISTS (
        SELECT 1
        FROM barber_exam_telemetry t
        WHERE t.question_id = q.id
          AND t.student_id = p_student_id
          AND t.is_correct = true
          AND t.created_at > (NOW() - INTERVAL '7 days')
      );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_preselected_question_bank IS 'Returns a filtered list of questions for a student that are active, verified, and not recently mastered.';
