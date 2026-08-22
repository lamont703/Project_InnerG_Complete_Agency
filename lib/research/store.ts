import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DraftFinding, ResearchAgent, ResearchFinding, FindingStatus } from "./types";

/** Reading and writing findings. `as any` per the repo convention for new tables. */

function fromRow(r: Record<string, any>): ResearchFinding {
  return {
    id: r.id,
    agent: r.agent,
    runId: r.run_id,
    title: r.title,
    suggestion: r.suggestion,
    rationale: r.rationale,
    category: r.category,
    evidence: (r.evidence ?? {}) as Record<string, unknown>,
    confidence: r.confidence,
    status: r.status,
    operatorNote: r.operator_note,
    createdAt: r.created_at,
  };
}

export async function saveFindings(
  agent: ResearchAgent,
  runId: string,
  findings: DraftFinding[],
): Promise<void> {
  if (findings.length === 0) return;
  const db = createAdminClient();
  const { error } = await (db.from("research_findings") as any).insert(
    findings.map((f) => ({
      agent,
      run_id: runId,
      title: f.title,
      suggestion: f.suggestion,
      rationale: f.rationale,
      category: f.category,
      evidence: f.evidence,
      confidence: f.confidence,
    })),
  );
  if (error) throw new Error(`Could not save findings: ${error.message}`);
}

export async function fetchFindings(agent: ResearchAgent, limit = 60): Promise<ResearchFinding[]> {
  const db = createAdminClient();
  const { data, error } = await (db.from("research_findings") as any)
    .select("*")
    .eq("agent", agent)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not read findings: ${error.message}`);
  return ((data ?? []) as Record<string, any>[]).map(fromRow);
}

export async function setFindingStatus(
  id: string,
  status: FindingStatus,
  note?: string | null,
): Promise<void> {
  const db = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (note !== undefined) patch.operator_note = note;
  const { error } = await (db.from("research_findings") as any).update(patch).eq("id", id);
  if (error) throw new Error(`Could not update finding: ${error.message}`);
}

export interface AgentStats {
  total: number;
  open: number;
  actioned: number;
  dismissed: number;
  lastRunAt: string | null;
}

export async function findingStats(agent: ResearchAgent): Promise<AgentStats> {
  const db = createAdminClient();
  const { data } = await (db.from("research_findings") as any)
    .select("status,created_at")
    .eq("agent", agent);
  const rows = (data ?? []) as { status: string; created_at: string }[];
  return {
    total: rows.length,
    open: rows.filter((r) => r.status === "new").length,
    actioned: rows.filter((r) => r.status === "actioned").length,
    dismissed: rows.filter((r) => r.status === "dismissed").length,
    lastRunAt: rows.length
      ? rows.map((r) => r.created_at).sort().slice(-1)[0]
      : null,
  };
}
