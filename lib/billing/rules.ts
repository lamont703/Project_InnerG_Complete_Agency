import type { AudienceId } from "@/lib/audiences";
import type { Plan } from "@/lib/plans";

/**
 * The pure half of billing: which subscriptions count, and what they add up
 * to. Tested in rules.test.ts.
 */

/** Statuses that keep a plan. past_due keeps it while Stripe retries the card. */
export const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** A member's plan from all their subscriptions: the best live one, or Free. */
export function planFromSubscriptions(subs: { plan: string; status: string }[]): Plan {
  const live = subs.filter((s) => LIVE_STATUSES.includes(s.status));
  if (live.some((s) => s.plan === "autopilot")) return "autopilot";
  return live.length ? "manage" : "free";
}

/**
 * The Stripe price lookup key. It carries the AMOUNT, so changing a price in
 * lib/plans.ts makes a new Stripe price and existing subscribers keep theirs.
 */
export const lookupKey = (type: AudienceId, plan: Exclude<Plan, "free">, dollars: number) =>
  `shearquery_${type}_${plan}_${dollars}usd_monthly`;
