import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCalendar } from "@/lib/calendar/access";

/**
 * Who may use a private-testing feature: the allowlist in code, or a row in
 * feature_access. The row is how a tester (a prospective agency, say) is let
 * in without a code change and a deploy. A stopgap until plans and tiers
 * decide access.
 */
export async function hasCalendarAccess(email?: string | null): Promise<boolean> {
  if (canUseCalendar(email)) return true;
  if (!email) return false;
  const { data } = await (createAdminClient().from("feature_access") as any)
    .select("feature")
    .eq("email", email.trim().toLowerCase())
    .eq("feature", "calendar")
    .maybeSingle();
  return !!data;
}
