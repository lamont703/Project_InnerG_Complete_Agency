import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Reading the agent's decision trail, for the human doing the auditing. */

export interface AuditDecision {
  id: string;
  runId: string;
  decidedAt: string;
  clientName: string | null;
  decision: "sent" | "would_send" | "skipped" | "failed" | "run_halted";
  reason: string | null;
  channel: string | null;
  daysOverdue: number | null;
  annualValue: number | null;
  messageBody: string | null;
  error: string | null;
}

export interface AuditRun {
  runId: string;
  at: string;
  decisions: AuditDecision[];
  sent: number;
  wouldSend: number;
  skipped: number;
  failed: number;
  halted: boolean;
  haltReason: string | null;
}

/**
 * The most recent runs, newest first, grouped so a run reads as one event.
 *
 * Capped rather than paginated: this page is for spotting "what did it just do"
 * and "why was that person skipped", and a hundred runs of scrollback answers
 * neither. The table keeps everything; this view is deliberately a window.
 */
export async function fetchRecentRuns(runLimit = 10): Promise<AuditRun[]> {
  const db = createAdminClient();
  const { data, error } = await (db.from("rebooking_agent_decisions") as any)
    .select("*")
    .order("decided_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not read the audit trail: ${error.message}`);

  const rows = (data ?? []) as Record<string, any>[];
  const byRun = new Map<string, AuditDecision[]>();
  for (const r of rows) {
    const d: AuditDecision = {
      id: r.id,
      runId: r.run_id,
      decidedAt: r.decided_at,
      clientName: r.client_name,
      decision: r.decision,
      reason: r.reason,
      channel: r.channel,
      daysOverdue: r.days_overdue == null ? null : Number(r.days_overdue),
      annualValue: r.annual_value == null ? null : Number(r.annual_value),
      messageBody: r.message_body,
      error: r.error,
    };
    if (!byRun.has(d.runId)) byRun.set(d.runId, []);
    byRun.get(d.runId)!.push(d);
  }

  return [...byRun.entries()]
    .map(([runId, decisions]) => {
      const halt = decisions.find((d) => d.decision === "run_halted");
      return {
        runId,
        at: decisions[0].decidedAt,
        decisions,
        sent: decisions.filter((d) => d.decision === "sent").length,
        wouldSend: decisions.filter((d) => d.decision === "would_send").length,
        skipped: decisions.filter((d) => d.decision === "skipped").length,
        failed: decisions.filter((d) => d.decision === "failed").length,
        halted: Boolean(halt),
        haltReason: halt?.reason ?? null,
      };
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, runLimit);
}
