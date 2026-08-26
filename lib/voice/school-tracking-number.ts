import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The number a school's page should publish, when that school has one.
 *
 * This is what makes the voice agent's first question about the DEPARTMENT
 * rather than "which school are you trying to reach". A phone call carries only
 * the caller's number and the number dialled, so a shared number cannot know
 * which page the caller came from — publishing a per-school number turns the
 * school from something the caller must say into something the call arrives
 * knowing.
 *
 * Returns null freely: a school without one still works through the shared
 * number, it just gets asked.
 */
export async function schoolTrackingNumber(schoolId: string): Promise<string | null> {
  try {
    const db = createAdminClient();
    const { data } = await (db.from("school_call_routing") as any)
      .select("tracking_number")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .maybeSingle();
    return data?.tracking_number ?? null;
  } catch {
    // A missing call button is a smaller failure than a page that will not render.
    return null;
  }
}

/** "+13465887680" -> "(346) 588-7680" */
export function formatUsNumber(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (n.length !== 10) return e164;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}
