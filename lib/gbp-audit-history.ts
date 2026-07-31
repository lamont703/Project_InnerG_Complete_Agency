import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditCheck, AuditReport } from "@/lib/gbp-audit";

/**
 * Audit history — recording snapshots and working out what changed.
 *
 * The diff is the point. A score on its own tells an owner where they stand; a
 * diff tells them whether the work they did moved anything, and whether Google
 * changed something behind their back. It's also what makes the monitoring tier
 * a real product rather than a re-run of the same report.
 */

export interface AuditSnapshot {
  id: string;
  score: number;
  grade: string | null;
  areas: Record<string, { earned: number; possible: number }>;
  checks: AuditCheck[];
  created_at: string;
}

export interface CheckChange {
  id: string;
  label: string;
  from: string;
  to: string;
  /** Score movement for this check — the sign is what makes it a win or a regression. */
  delta: number;
}

export interface AuditDiff {
  since: string;
  scoreDelta: number;
  improved: CheckChange[];
  regressed: CheckChange[];
}

/**
 * What moved between two runs.
 *
 * Compares by check id rather than position, so adding or reordering checks
 * doesn't produce phantom changes. A check present in only one of the two runs
 * is skipped: we can't say whether it improved, and inventing a direction would
 * be worse than staying quiet.
 */
export function diffSnapshots(previous: AuditSnapshot, current: AuditReport): AuditDiff {
  const before = new Map(previous.checks.map((c) => [c.id, c]));
  const improved: CheckChange[] = [];
  const regressed: CheckChange[] = [];

  for (const now of current.checks) {
    const then = before.get(now.id);
    if (!then) continue;
    const delta = Math.round((now.earned - then.earned) * 100) / 100;
    if (delta === 0 && then.detail === now.detail) continue;
    // A wording change with no score movement isn't news.
    if (delta === 0) continue;
    const change: CheckChange = { id: now.id, label: now.label, from: then.detail, to: now.detail, delta };
    (delta > 0 ? improved : regressed).push(change);
  }

  improved.sort((a, b) => b.delta - a.delta);
  regressed.sort((a, b) => a.delta - b.delta);

  return {
    since: previous.created_at,
    scoreDelta: current.score - previous.score,
    improved,
    regressed,
  };
}

/** Most recent snapshots for a member's location, newest first. */
export async function recentSnapshots(
  memberId: string,
  locationName: string,
  limit = 12
): Promise<AuditSnapshot[]> {
  const admin = createAdminClient();
  const { data, error } = await (admin.from("gbp_audit_snapshots") as any)
    .select("id, score, grade, areas, checks, created_at")
    .eq("community_member_id", memberId)
    .eq("location_name", locationName)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // History is a bonus on top of the live audit — never let a missing table or
    // a query error take the report down with it.
    console.warn("[gbp-audit-history] read failed:", error.message);
    return [];
  }
  return (data || []) as AuditSnapshot[];
}

/** Minimum gap between snapshots when nothing has changed. */
const QUIET_PERIOD_MS = 12 * 60 * 60 * 1000;

/**
 * Record a snapshot, if it's worth recording.
 *
 * Called on every audit page view, so it has to be selective or the history
 * becomes one row per refresh and the "what changed" view drowns. A row is
 * written when there's no history yet, when the score has moved, or when the
 * last row is older than the quiet period — the last case so a stable profile
 * still leaves a periodic trail to compare against later.
 */
export async function recordSnapshot(args: {
  memberId: string;
  locationName: string;
  businessName: string | null;
  report: AuditReport;
  performance: unknown;
  keywordCount: number;
  latest?: AuditSnapshot | null;
  now?: Date;
}): Promise<void> {
  const { memberId, locationName, businessName, report, performance, keywordCount } = args;
  const now = args.now ?? new Date();
  const latest = args.latest;

  if (latest) {
    const age = now.getTime() - new Date(latest.created_at).getTime();
    const unchanged = latest.score === report.score;
    if (unchanged && age < QUIET_PERIOD_MS) return;
  }

  const admin = createAdminClient();
  const { error } = await (admin.from("gbp_audit_snapshots") as any).insert({
    community_member_id: memberId,
    location_name: locationName,
    business_name: businessName,
    score: report.score,
    grade: report.grade,
    areas: report.areas,
    checks: report.checks,
    performance: performance ?? null,
    keyword_count: keywordCount,
  });

  if (error) console.warn("[gbp-audit-history] write failed:", error.message);
}
