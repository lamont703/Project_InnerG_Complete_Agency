import { createAdminClient } from "@/lib/supabase/admin";

/**
 * BARBER INTELLIGENCE: Rich Telemetry Context Generator
 * This script aggregates student performance into a format 
 * Google Agent Builder can use for "Pass/Fail" prediction.
 */

export async function getRichTelemetryContext(studentId: string) {
  const supabase = createAdminClient();

  // 1. Fetch User Profile
  const { data: rawUser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', studentId)
    .single();
  const user = rawUser as { full_name?: string; email?: string } | null;

  // 2. Fetch Aggregated Telemetry
  interface TelemetryRecord {
    domain: string;
    is_correct: boolean;
    time_spent_ms: number;
    changed_answer: boolean;
  }

  const { data: rawTelemetry } = await supabase
    .from('barber_exam_telemetry')
    .select('domain, is_correct, time_spent_ms, changed_answer')
    .eq('student_id', studentId);

  const telemetry = (rawTelemetry as any[]) as TelemetryRecord[] | null;

  if (!telemetry || telemetry.length === 0) {
    return {
      user_context: {
        username: user?.full_name || "New Student",
        student_id: studentId,
        pathway: "Texas Class A Barber"
      },
      performance_telemetry_snapshot: {
        overall_accuracy: 0,
        total_questions_attempted: 0,
        estimated_pass_probability: "0%",
        domain_breakdown: []
      },
      cognitive_signals: {
        avg_latency_seconds: 0,
        behavioral_note: "No historical data available. Initial assessment starting."
      }
    };
  }

  // 3. Logic: Calculate Domain Breakdown
  const domains = [...new Set(telemetry.map(t => t.domain))];
  const domainBreakdown = domains.map(d => {
    const attempts = telemetry.filter(t => t.domain === d);
    const correct = attempts.filter(t => t.is_correct).length;
    const accuracy = correct / attempts.length;
    
    return {
      domain: d,
      accuracy: parseFloat(accuracy.toFixed(2)),
      status: accuracy > 0.8 ? "Mastered" : accuracy > 0.7 ? "Stable" : "Review Needed"
    };
  });

  // 4. Logic: Predictive "Pass/Fail" Score
  const overallAccuracy = telemetry.filter(t => t.is_correct).length / telemetry.length;
  const passProbability = Math.min(Math.round(overallAccuracy * 100 + 5), 100);

  // 5. Logic: Cognitive Signals (Latency & Behavior)
  const avgLatency = telemetry.reduce((acc, curr) => acc + curr.time_spent_ms, 0) / telemetry.length;
  const changeCorrectToIncorrect = telemetry.filter(t => t.changed_answer && !t.is_correct).length;

  return {
    user_context: {
      username: user?.full_name || "Barber Student",
      student_id: studentId,
      pathway: "Texas Class A Barber"
    },
    performance_telemetry_snapshot: {
      overall_accuracy: parseFloat(overallAccuracy.toFixed(2)),
      total_questions_attempted: telemetry.length,
      estimated_pass_probability: `${passProbability}%`,
      domain_breakdown: domainBreakdown
    },
    cognitive_signals: {
      avg_latency_seconds: parseFloat((avgLatency / 1000).toFixed(1)),
      behavioral_note: changeCorrectToIncorrect > 5 
        ? "High rate of second-guessing (changing correct to incorrect)." 
        : "Stable decision-making."
    }
  };
}
