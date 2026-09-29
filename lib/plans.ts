import type { AudienceId } from "@/lib/audiences";

/**
 * PLANS: Free, Manage, Autopilot. What each unlocks, what each costs per
 * account type, and the free publishing allowance. Pure, so the rules are
 * tested without a database; lib/member-plan.ts reads a member's plan.
 *
 * Decided with the product owner on 2026-09-28:
 *  - Free: read everything, Claude drafts any fix, and FREE_PUBLISHES_PER_MONTH
 *    publishes a month — enough to see it work once.
 *  - Manage: unlimited publishing, the appointment book, Instagram insights.
 *  - Autopilot: things that run without being asked (built later, and
 *    narrow on purpose: nothing hard to undo).
 *  - Prices are per account type and are starting points to test.
 *  - Agencies earn COMMISSION_RATE of what each credited client actually
 *    pays, for as long as the client stays ("subject to change").
 *
 * Checkout isn't built yet (step 2). Until it is, an admin sets a plan by
 * hand at /admin/plans, and nothing here may say a plan can be bought.
 */

export type Plan = "free" | "manage" | "autopilot";
export const PLANS: Plan[] = ["free", "manage", "autopilot"];
export const PLAN_LABEL: Record<Plan, string> = { free: "Free", manage: "Manage", autopilot: "Autopilot" };
const RANK: Record<Plan, number> = { free: 0, manage: 1, autopilot: 2 };

export const isPlan = (p: unknown): p is Plan => typeof p === "string" && (PLANS as string[]).includes(p);

export const FREE_PUBLISHES_PER_MONTH = 3;
export const COMMISSION_RATE = 0.25;

/** Monthly price in US dollars, by account type. Types not listed are always free. */
export const PRICES: Partial<Record<AudienceId, { manage: number; autopilot: number }>> = {
  barber: { manage: 19, autopilot: 39 },
  cosmetologist: { manage: 19, autopilot: 39 },
  barbershop: { manage: 49, autopilot: 99 },
  salon: { manage: 49, autopilot: 99 },
  supply_store: { manage: 39, autopilot: 79 },
  school: { manage: 99, autopilot: 199 },
};

/** Whether an account type can be on a paid plan at all. Students, clients and agencies can't. */
export const hasPaidPlans = (type: AudienceId | null | undefined) => !!type && !!PRICES[type];

export type PlanFeature = "unlimited_publishing" | "calendar" | "instagram" | "autopilot";

export const FEATURE_PLAN: Record<PlanFeature, Plan> = {
  unlimited_publishing: "manage",
  calendar: "manage",
  instagram: "manage",
  autopilot: "autopilot",
};

export const planAllows = (plan: Plan, feature: PlanFeature) => RANK[plan] >= RANK[FEATURE_PLAN[feature]];

/** The allowance resets on the 1st, UTC. */
export function monthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, next };
}

export type PublishAllowance =
  | { allowed: true; unlimited: true }
  | { allowed: boolean; unlimited: false; used: number; remaining: number; resetsOn: Date };

export function publishAllowance(plan: Plan, usedThisMonth: number, now = new Date()): PublishAllowance {
  if (planAllows(plan, "unlimited_publishing")) return { allowed: true, unlimited: true };
  const remaining = Math.max(0, FREE_PUBLISHES_PER_MONTH - usedThisMonth);
  return { allowed: remaining > 0, unlimited: false, used: usedThisMonth, remaining, resetsOn: monthWindow(now).next };
}

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

/** One line for the owner: the plan, and what it leaves them this month. */
export function planSummary(plan: Plan, type: AudienceId | null, usedThisMonth: number, now = new Date()): string {
  const a = publishAllowance(plan, usedThisMonth, now);
  const head = `${PLAN_LABEL[plan]} plan`;
  if (a.unlimited) return `${head} — unlimited publishing.`;
  const upgrade = type && PRICES[type]
    ? ` Manage ($${PRICES[type]!.manage}/month for this account type) publishes without a limit; paid plans aren't open for checkout yet.`
    : "";
  return `${head} — ${a.remaining} of ${FREE_PUBLISHES_PER_MONTH} free publishes left this month (resets ${day(a.resetsOn)}).${upgrade}`;
}
