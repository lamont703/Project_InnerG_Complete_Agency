import type { SupabaseClient } from "@supabase/supabase-js";

export interface FindingInput {
  agentName: string;
  mission: string;
  subjectKey: string;
  directiveText: string;
  evidence: Record<string, any>;
}

// Checks whether a still-open directive (pending or approved) already
// exists for this exact subject — if so, updates it in place (bumping
// times_recurred/last_seen_at/evidence/directive_text) instead of inserting
// a duplicate row every run. Denied directives are NOT matched here — a
// human already said "not this," so a fresh recurrence gets its own new row
// rather than silently reviving something already dismissed.
export async function upsertFinding(supabase: SupabaseClient, finding: FindingInput): Promise<{ inserted: boolean }> {
  const { data: existing } = await supabase
    .from("agent_directives")
    .select("id, times_recurred")
    .eq("agent_name", finding.agentName)
    .eq("subject_key", finding.subjectKey)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("agent_directives")
      .update({
        directive_text: finding.directiveText,
        evidence: finding.evidence,
        last_seen_at: new Date().toISOString(),
        times_recurred: (existing.times_recurred || 1) + 1,
      })
      .eq("id", existing.id);
    return { inserted: false };
  }

  await supabase.from("agent_directives").insert({
    agent_name: finding.agentName,
    mission: finding.mission,
    subject_key: finding.subjectKey,
    directive_text: finding.directiveText,
    evidence: finding.evidence,
    status: "pending",
  });
  return { inserted: true };
}

// Marks previously open (pending/approved) directives as resolved when this
// run re-checked the same subject and the issue no longer reproduces.
// scopeSubjectKeys must be every subject actually re-examined this run (not
// just the failing ones) — otherwise a partial sweep (like Website
// Technology Performance Agent's rotating batch, which only checks ~15
// URLs per run) would wrongly "resolve" URLs that simply weren't looked at
// this time.
//
// Matching happens in application code against a bounded fetch of this
// agent's own currently-open directives, NOT via `.in('subject_key', scope)`
// — a real run against Website Traffic Optimization Agent's ~8,000
// query+page pairs sent a scope list large enough to blow past
// PostgREST/Cloudflare's URL length limit (414 Request-URI Too Large).
// The set of currently-open directives is always small (bounded by
// MAX_FINDINGS_PER_RUN-style caps), so filtering there instead is both
// correct and cheap regardless of how large the scope itself is.
export async function resolveStaleFindings(
  supabase: SupabaseClient,
  agentName: string,
  scopeSubjectKeys: string[],
  stillFailingSubjectKeys: Set<string>
): Promise<number> {
  if (scopeSubjectKeys.length === 0) return 0;
  const scopeSet = new Set(scopeSubjectKeys);

  const { data: openDirectives, error: fetchError } = await supabase
    .from("agent_directives")
    .select("id, subject_key")
    .eq("agent_name", agentName)
    .in("status", ["pending", "approved"])
    .not("subject_key", "is", null);

  if (fetchError || !openDirectives) {
    console.error("resolveStaleFindings fetch error:", fetchError);
    return 0;
  }

  const idsToResolve = openDirectives
    .filter((d) => scopeSet.has(d.subject_key as string) && !stillFailingSubjectKeys.has(d.subject_key as string))
    .map((d) => d.id);

  if (idsToResolve.length === 0) return 0;

  const { data, error } = await supabase
    .from("agent_directives")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .in("id", idsToResolve)
    .select("id");

  if (error) {
    console.error("resolveStaleFindings update error:", error);
    return 0;
  }
  return data?.length || 0;
}

export interface AgentHistorySummary {
  recentDenials: { subjectKey: string; directiveText: string; denyReason: string | null }[];
  recentApprovals: { subjectKey: string; directiveText: string }[];
  recurringOpen: { subjectKey: string; timesRecurred: number; directiveText: string }[];
}

// Pulled into each run's LLM prompt so the agent's prose can acknowledge
// history ("still not fixed after 3 checks") instead of repeating itself
// blind, and can avoid re-suggesting something a human already explicitly
// rejected.
export async function fetchAgentHistory(supabase: SupabaseClient, agentName: string, daysBack = 60): Promise<AgentHistorySummary> {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("agent_directives")
    .select("subject_key, directive_text, status, deny_reason, times_recurred")
    .eq("agent_name", agentName)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data || [];
  return {
    recentDenials: rows
      .filter((r) => r.status === "denied" && r.subject_key)
      .slice(0, 20)
      .map((r) => ({ subjectKey: r.subject_key!, directiveText: r.directive_text, denyReason: r.deny_reason })),
    recentApprovals: rows
      .filter((r) => r.status === "approved" && r.subject_key)
      .slice(0, 20)
      .map((r) => ({ subjectKey: r.subject_key!, directiveText: r.directive_text })),
    recurringOpen: rows
      .filter((r) => (r.status === "pending" || r.status === "approved") && r.times_recurred > 1)
      .slice(0, 20)
      .map((r) => ({ subjectKey: r.subject_key!, timesRecurred: r.times_recurred, directiveText: r.directive_text })),
  };
}

// Real, simple adaptive-threshold mechanism: if a specific finding type has
// been denied repeatedly with a reason indicating "too minor" (not that it
// was wrong, just not worth acting on), scale up that check's own
// sensitivity threshold rather than keep re-flagging the same class of
// low-value noise the human has already dismissed multiple times. Caps at
// 2x so a differently-motivated run of denials can't disable a check
// entirely.
const MINOR_DENIAL_KEYWORDS = ["too minor", "too small", "not worth", "low priority", "ignore", "skip", "noise"];

export async function getThresholdMultiplier(supabase: SupabaseClient, agentName: string, findingType: string): Promise<number> {
  const { data } = await supabase
    .from("agent_directives")
    .select("deny_reason, evidence")
    .eq("agent_name", agentName)
    .eq("status", "denied")
    .not("deny_reason", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = data || [];
  const minorDenialsForType = rows.filter((r) => {
    if (r.evidence?.type !== findingType) return false;
    const reason = (r.deny_reason || "").toLowerCase();
    return MINOR_DENIAL_KEYWORDS.some((kw) => reason.includes(kw));
  }).length;

  const steps = Math.floor(minorDenialsForType / 3);
  return Math.min(1 + steps * 0.25, 2.0);
}
