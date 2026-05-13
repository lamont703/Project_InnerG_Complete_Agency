-- 🛰️ MASTERY ANALYTICS VIEW
-- This view aggregates raw telemetry into actionable "Mastery Scores" for the AI Agent.

CREATE OR REPLACE VIEW public.student_mastery_metrics AS
SELECT 
    student_id,
    domain,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE is_correct = true) as correct_count,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE is_correct = true)::DECIMAL / COUNT(*)::DECIMAL) * 100 
            ELSE 0 
        END, 
        2
    ) as accuracy_rate,
    ROUND(AVG(time_spent_ms)) as avg_latency_ms,
    COUNT(*) FILTER (WHERE changed_answer = true) as pivot_count,
    
    -- CALCULATE MASTERY SCORE (0-100)
    -- Formula: Accuracy Base - Latency Penalty - Guessing Penalty
    GREATEST(0, LEAST(100, 
        ROUND(
            (CASE 
                WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE is_correct = true)::DECIMAL / COUNT(*)::DECIMAL * 100)
                ELSE 0 
            END)
            - (CASE WHEN AVG(time_spent_ms) > 20000 THEN 5 ELSE 0 END) -- Penalty for >20s avg
            - (CASE 
                WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE changed_answer = true)::DECIMAL / COUNT(*)::DECIMAL * 10)
                ELSE 0 
            END), -- Penalty for pivots (guessing behavior)
            2
        )
    )) as mastery_score,
    
    MAX(created_at) as last_attempt_at
FROM 
    public.barber_exam_telemetry
GROUP BY 
    student_id, domain;

-- 🛡️ SECURITY: Grant access to the view
GRANT SELECT ON public.student_mastery_metrics TO authenticated;
GRANT SELECT ON public.student_mastery_metrics TO service_role;
