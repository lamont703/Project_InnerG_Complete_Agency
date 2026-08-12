"use server";

import { getRecentUsage, type UsageSummary } from "@/lib/ai-usage-record";

/**
 * The dashboard's data, refetched on a timer by the client.
 *
 * Gated on the admin allowlist even though middleware already gates
 * /admin/ai-usage: a server action is its own public HTTP endpoint and does
 * not inherit a page's route protection. Anyone who learned the action id
 * could call it directly, and this returns spend data.
 */
import { createServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

export async function fetchUsage(windowHours: number): Promise<UsageSummary | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) return { error: "Not authorised." };

  const hours = [1, 24, 24 * 7, 24 * 30].includes(windowHours) ? windowHours : 24;
  return getRecentUsage(100, hours);
}
