import { NextResponse } from "next/server";
import { runDueReminders, runCampaign } from "@/lib/live-training/store";

/**
 * Every 5 minutes: the LIVE training's hype sequence (whatever is due for the
 * upcoming Monday) and the weekly member campaign (Wednesdays, 11 AM ET).
 * Both claim each send in the database first, so an overlapping run is harmless.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [reminders, campaign] = await Promise.all([runDueReminders(), runCampaign()]);
  if (reminders.missingLink) console.error("[live-training] a reminder with the join link is due but no Google Meet link is set — /admin/live-training");
  if ((campaign as any).blocked) console.error(`[live-training] campaign week ${campaign.week} blocked: ${(campaign as any).blocked}`);
  return NextResponse.json({ ok: true, reminders, campaign });
}
