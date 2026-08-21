import { NextResponse } from "next/server";
import { runRebookingAgent } from "@/lib/rebooking/agent";
import { reconcileRedemptions } from "@/lib/offers/haircut-offer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The autonomous tick.
 *
 * ONCE A DAY, at 16:00 UTC — midday Eastern in summer, 11am in winter. Both sit
 * comfortably inside the 9am–6pm window, so daylight saving cannot push the run
 * outside it. The hour is chosen to be mid-window rather than near an edge for
 * exactly that reason.
 *
 * WHY NOT HOURLY. It was, and it was waste. The daily-cap check happens after
 * the queue is built, so every in-window tick pulled all ~3,000 Shopify orders
 * (a dozen paginated GraphQL calls) even with nothing to do — and after the
 * first run of the day every eligible client is resting on a 14-day cooldown,
 * so the other eight runs could only ever find nothing. The precision hourly
 * bought was meaningless too: clients in this queue are weeks to months past
 * their rhythm, and being reached at 11am instead of 4pm changes nothing.
 *
 * A missed day is survivable and a retry is not worth building. At two to four
 * messages a week, tomorrow's run picks up anyone today's run missed — the
 * cooldown makes a repeat run safe rather than duplicative.
 *
 * AUTHENTICATED BY CRON_SECRET, not by obscurity. Vercel Cron sends the secret
 * as a bearer token; anything else is refused. An unauthenticated endpoint that
 * sends text messages to real clients is a hole with a phone bill attached.
 *
 * ALWAYS RETURNS 200 ON A COMPLETED RUN, including one that halted or had send
 * failures. A halt is the guardrails working, not an error, and a 500 there
 * would make Vercel retry a run that correctly decided to do nothing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRebookingAgent();

    // Redemptions are matched on the same tick. Separate try/catch: a failure
    // here is a reporting gap, not a reason to fail a run that already sent.
    let redemptions: { checked: number; matched: number } | null = null;
    try {
      redemptions = await reconcileRedemptions();
    } catch (e) {
      console.warn("[cron/rebooking-agent] redemption reconcile failed:", e);
    }

    return NextResponse.json({
      redemptions,
      ok: true,
      runId: result.runId,
      halted: result.halted,
      haltReason: result.haltReason,
      dryRun: result.dryRun,
      considered: result.considered,
      sent: result.sent,
      wouldSend: result.wouldSend,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (e) {
    // A thrown error means the run did not complete and the audit trail may be
    // incomplete — that IS a 500, unlike a clean halt.
    console.error("[cron/rebooking-agent] run threw:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
