import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { storedAudience, type AudienceId } from "@/lib/audiences";
import { hasPaidPlans, isPlan, monthWindow, type Plan } from "@/lib/plans";

/**
 * A member's plan, as the tools see it. The rules are in lib/plans.ts.
 *
 * Admins and demo businesses are treated as Autopilot: an admin tests every
 * feature, and a demo shows an agency everything.
 */

const db = () => createAdminClient() as any;

export interface MemberPlan {
  plan: Plan;
  type: AudienceId | null;
  email: string | null;
}

function effective(row: any): MemberPlan {
  const type = storedAudience(row?.audience);
  const stored: Plan = isPlan(row?.plan) ? row.plan : "free";
  const plan: Plan = row?.is_demo || isAdminEmail(row?.email) ? "autopilot" : stored;
  return { plan, type, email: row?.email ?? null };
}

const COLUMNS = "plan, audience, email, is_demo";

export async function getMemberPlan(memberId: string): Promise<MemberPlan> {
  const { data } = await db().from("community_members").select(COLUMNS).eq("id", memberId).maybeSingle();
  return effective(data);
}

export async function getPlanByEmail(email: string | null | undefined): Promise<MemberPlan> {
  if (!email) return effective(null);
  const { data } = await db().from("community_members").select(COLUMNS).eq("email", email.trim().toLowerCase()).maybeSingle();
  return effective(data ?? { email });
}

/**
 * Publishes that count against the free allowance this month: every change
 * that went out (or was undone after going out). A change Google refused
 * didn't publish, so it doesn't count.
 */
export async function publishesThisMonth(memberId: string, now = new Date()): Promise<number> {
  const { count } = await db()
    .from("gbp_change_requests")
    .select("id", { count: "exact", head: true })
    .eq("community_member_id", memberId)
    .in("status", ["approved", "applied", "reverted"])
    .gte("approved_at", monthWindow(now).start.toISOString());
  return count ?? 0;
}

/** Set by hand, from /admin/plans. Refuses types that can't be on a paid plan. */
export async function setMemberPlan(memberId: string, plan: Plan): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: m } = await db().from("community_members").select("audience, is_demo").eq("id", memberId).maybeSingle();
  if (!m) return { ok: false, error: "No such member." };
  if (m.is_demo) return { ok: false, error: "Demo businesses are always on Autopilot." };
  if (plan !== "free" && !hasPaidPlans(storedAudience(m.audience))) {
    return { ok: false, error: "This account type is always free (students, clients and agencies)." };
  }
  const { error } = await db()
    .from("community_members")
    .update({ plan, plan_source: "admin", plan_updated_at: new Date().toISOString() })
    .eq("id", memberId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
