import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutopilotFor } from "@/lib/autopilot/run";

/**
 * Autopilot, hourly (lib/autopilot/).
 *
 * Runs ONLY for owners whose STORED plan is Autopilot — paid for, or set by
 * an admin at /admin/plans. Deliberately not the effective plan: admins are
 * treated as Autopilot everywhere else so they can test, and that must never
 * mean replying on an admin's real Google profile without being asked. Demo
 * businesses are excluded too.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: members, error } = await (createAdminClient().from("community_members") as any)
    .select("id")
    .eq("plan", "autopilot")
    .eq("is_demo", false)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Record<string, unknown> = {};
  for (const m of members || []) {
    try {
      results[m.id] = await runAutopilotFor(m.id);
    } catch (e: any) {
      console.error(`[autopilot] ${m.id} failed:`, e);
      results[m.id] = { error: e?.message || "failed" };
    }
  }
  return NextResponse.json({ ran: members?.length ?? 0, results });
}
