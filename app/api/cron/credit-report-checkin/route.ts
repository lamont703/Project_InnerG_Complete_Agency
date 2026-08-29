import { NextResponse } from "next/server";
import { sendGhlSms } from "@/lib/ghl-sms";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import {
  CHECKIN_TTL_DAYS,
  checkinEmailHtml,
  checkinEmailSubject,
  checkinPeriod,
  checkinSms,
  checkinUrl,
  isStale,
  outstandingWeeks,
} from "@/lib/credit-report/checkin";
import {
  createCheckin,
  dueEnrollments,
  markCheckinSent,
  markPresenceAsked,
  rosterActivity,
  scheduleNextCheckin,
} from "@/lib/credit-report/store";

/**
 * The fortnightly booth-rent check-in.
 *
 * Runs daily and picks up whichever shops are due, rather than running
 * fortnightly itself: enrollments start on different days, and a fortnightly
 * cron would batch every shop onto whatever day it happened to fire.
 *
 * ONE LINK, BOTH CHANNELS. The SMS and the email carry the SAME token, so an
 * owner can open whichever arrived first and the other one lands on a page that
 * already knows what they answered. Email is not decoration here — phone
 * numbers in this trade change constantly, and a shop that switches numbers
 * silently stops answering, which from our side looks identical to a shop where
 * nobody is paying.
 *
 * A SHOP WITH NOTHING TO ASK IS NOT MESSAGED. No active roster, or every week
 * in the period already recorded on the management screen, and the check-in is
 * skipped and rescheduled. Texting somebody to ask a question with no content
 * is how a useful message becomes one that gets ignored.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /*
   * A dry run sends nothing and writes nothing. This job texts and emails real
   * business owners, so there has to be a way to see exactly who it would
   * contact and why before it does — including on production, where the only
   * honest rehearsal is against real rows.
   */
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);
  const due = await dueEnrollments();

  const report: any[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const enrollment of due) {
    /*
     * ONE SHOP'S FAILURE MUST NOT BE THE WHOLE JOB'S, and it must not be
     * silent either. A read that fails here used to surface as "nothing
     * outstanding" and a green result — see the note on rosterActivity.
     */
    try {
    const period = checkinPeriod(enrollment.checkinIntervalDays, todayIso);
    const roster = await rosterActivity(enrollment.id);

    // Who still owes an answer for this period.
    const asking = roster.filter((r) => outstandingWeeks(period, r.answeredWeeks).length > 0);

    // Who has gone quiet long enough that the question is "are they still
    // here" rather than "did they pay".
    const stale = roster.filter((r) =>
      isStale(
        {
          lastReportedAt: r.lastReportedAt,
          presenceAskedAt: r.presenceAskedAt,
          startedAt: r.startedAt,
          createdAt: r.createdAt,
        },
        now
      )
    );

    if (asking.length === 0 && stale.length === 0) {
      skipped++;
      report.push({ shop: enrollment.shopName, action: "skipped", reason: "nothing outstanding" });
      if (!dryRun) await scheduleNextCheckin(enrollment.id, enrollment.checkinIntervalDays);
      continue;
    }

    if (dryRun) {
      report.push({
        shop: enrollment.shopName,
        action: "would send",
        period,
        asking: asking.map((r) => r.barberName),
        stale: stale.map((r) => r.barberName),
        sms: enrollment.smsPhone || null,
        email: enrollment.email || null,
      });
      continue;
    }

    const checkin = await createCheckin(enrollment.id, period, CHECKIN_TTL_DAYS, stale.length);
    if (!checkin) {
      report.push({ shop: enrollment.shopName, action: "failed", reason: "could not create check-in" });
      continue;
    }

    const url = checkinUrl(SITE_URL, checkin.token);
    const count = asking.length || stale.length;

    let smsStatus = "no_phone";
    if (enrollment.smsPhone) {
      const res = await sendGhlSms({
        message: checkinSms(enrollment.shopName, url, count),
        phone: enrollment.smsPhone,
        name: enrollment.shopName,
      });
      smsStatus = res.ok ? "sent" : res.skipped ? "skipped" : "failed";
    }

    let emailStatus = "no_email";
    if (enrollment.email) {
      const res = await sendGhlEmail({
        email: enrollment.email,
        subject: checkinEmailSubject(enrollment.shopName),
        html: checkinEmailHtml({
          shopName: enrollment.shopName,
          url,
          workerCount: count,
          period,
          staleNames: stale.map((r) => r.barberName),
        }),
        name: enrollment.shopName,
      });
      emailStatus = res.ok ? "sent" : "failed";
    }

    await markCheckinSent(checkin.id, { sms: smsStatus, email: emailStatus });

    /*
     * The presence prompt is stamped as ASKED when the check-in goes out, not
     * when it is answered. An owner who ignores it must not be asked again on
     * every check-in forever — that is what turns a useful question into noise
     * and gets the whole message ignored.
     */
    await markPresenceAsked(stale.map((r) => r.id));
    await scheduleNextCheckin(enrollment.id, enrollment.checkinIntervalDays);

    sent++;
    report.push({
      shop: enrollment.shopName,
      action: "sent",
      sms: smsStatus,
      email: emailStatus,
      asking: asking.length,
      stale: stale.length,
    });
    } catch (err: any) {
      failed++;
      const message = String(err?.message || err);
      console.error(`[credit-report-checkin] ${enrollment.shopName}: ${message}`);
      report.push({ shop: enrollment.shopName, action: "failed", reason: message });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    due: due.length,
    sent,
    skipped,
    // Surfaced at the top level so a failure is visible without reading the
    // per-shop report — a cron nobody reads closely still has to be loud.
    failed,
    report,
  });
}
