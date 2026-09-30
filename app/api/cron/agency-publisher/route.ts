import { NextResponse } from "next/server";
import { runAgencySlots } from "@/lib/agency-publisher";

/**
 * Hourly. At 9 AM, 2 PM and 7 PM Eastern, each agency using that slot posts
 * the front of its line to its own Instagram (lib/agency-publisher.ts). It
 * decides for itself whether this is a slot hour, because Vercel cron is UTC
 * and a fixed entry would drift an hour when daylight saving ends.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runAgencySlots()) });
}
