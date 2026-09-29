import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CALENDAR_ALLOWLIST } from "@/lib/calendar/access";
import { INSTAGRAM_CONNECT_ALLOWLIST } from "@/lib/instagram-member";
import { isRunningDemoBusiness } from "@/lib/demo/core";
import { getPlanByEmail } from "@/lib/member-plan";
import { planAllows } from "@/lib/plans";

/**
 * Who may use the calendar and Instagram, in two phases.
 *
 * WHILE A FEATURE IS IN PRIVATE TESTING: the allowlist in code, a
 * feature_access row (how a tester is let in without a deploy), or the demo
 * business whose demo is running. The plan doesn't matter yet.
 *
 * ONCE IT'S OPEN (CALENDAR_OPEN / INSTAGRAM_MEMBER_CONNECT_OPEN): the Manage
 * plan or above (lib/plans.ts). Testers keep access either way.
 */

const lower = (e?: string | null) => (e ?? "").trim().toLowerCase();

async function hasTesterRow(email: string, feature: string) {
  const { data } = await (createAdminClient().from("feature_access") as any)
    .select("feature")
    .eq("email", email)
    .eq("feature", feature)
    .maybeSingle();
  return !!data;
}

export async function hasCalendarAccess(email?: string | null): Promise<boolean> {
  const e = lower(email);
  if (!e) return false;
  if (CALENDAR_ALLOWLIST.includes(e)) return true;
  // The demo business an agency is showing — only while that demo runs, so a
  // cron never treats a demo calendar as live (lib/demo/core.ts).
  if (isRunningDemoBusiness(e)) return true;
  if (await hasTesterRow(e, "calendar")) return true;
  if (process.env.CALENDAR_OPEN === "true") return planAllows((await getPlanByEmail(e)).plan, "calendar");
  return false;
}

export async function hasInstagramAccess(email?: string | null): Promise<boolean> {
  const e = lower(email);
  if (!e) return false;
  if (INSTAGRAM_CONNECT_ALLOWLIST.includes(e)) return true;
  if (isRunningDemoBusiness(e)) return true;
  if (process.env.INSTAGRAM_MEMBER_CONNECT_OPEN === "true") return planAllows((await getPlanByEmail(e)).plan, "instagram");
  return false;
}
