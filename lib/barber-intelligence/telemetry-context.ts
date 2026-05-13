import { createAdminClient } from "@/lib/supabase/admin";

/**
 * BARBER INTELLIGENCE: High-Fidelity Telemetry Context
 */

interface MasteryMetric {
  student_id: string;
  domain: string;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: string;
  avg_latency_ms: number;
  pivot_count: number;
  mastery_score: string;
  last_attempt_at: string;
}

export async function getRichTelemetryContext(studentId: string) {
  const supabase = createAdminClient();

  // 1. Fetch User Profile
  const { data: rawUser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', studentId)
    .single();
  const user = rawUser as { full_name?: string; email?: string } | null;

  // 2. Fetch Authoritative Mastery Metrics
  const { data: rawMetrics } = await supabase
    .from('student_mastery_metrics')
    .select('*')
    .eq('student_id', studentId);

  const masteryMetrics = rawMetrics as MasteryMetric[] | null;

  if (!masteryMetrics || masteryMetrics.length === 0) {
    return {
      user_context: {
        username: user?.full_name || "New Student",
        student_id: studentId,
        pathway: "Texas Class A Barber Exam Prep"
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

  // 3. Map High-Fidelity Breakdown
  const domainBreakdown = masteryMetrics.map(m => {
    const score = parseFloat(m.mastery_score || "0");
    return {
      domain: m.domain,
      mastery_score: score,
      accuracy_rate: parseFloat(m.accuracy_rate || "0"),
      total_attempts: m.total_attempts,
      avg_latency_ms: m.avg_latency_ms,
      status: score > 80 ? "Mastered" : score > 60 ? "Stable" : "Review Needed"
    };
  });

  // 4. Calculate Aggregate Stats based on DB Metrics
  const totalAttempts = masteryMetrics.reduce((acc, curr) => acc + (curr.total_attempts || 0), 0);
  const avgMastery = masteryMetrics.reduce((acc, curr) => acc + parseFloat(curr.mastery_score || "0"), 0) / masteryMetrics.length;
  const avgLatency = masteryMetrics.reduce((acc, curr) => acc + (curr.avg_latency_ms || 0), 0) / masteryMetrics.length;

  return {
    user_context: {
      username: user?.full_name || "Barber Student",
      student_id: studentId,
      pathway: "Texas Class A Barber"
    },
    performance_telemetry_snapshot: {
      overall_accuracy: parseFloat((avgMastery / 100).toFixed(2)),
      total_questions_attempted: totalAttempts,
      estimated_pass_probability: `${Math.round(avgMastery)}%`,
      domain_breakdown: domainBreakdown
    },
    cognitive_signals: {
      avg_latency_seconds: parseFloat((avgLatency / 1000).toFixed(1)),
      behavioral_note: avgMastery > 70 
        ? "Consistent performance across key domains." 
        : "Targeted remediation required in weak domains."
    }
  };
}
