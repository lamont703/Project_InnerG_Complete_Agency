import { NextResponse } from "next/server";
import { closeStaleSessions, firstSchool } from "@/lib/school/store";

/**
 * Close sessions nobody closed.
 *
 * WHY THIS EXISTS. An open punch refuses every subsequent clock-in, so a
 * student who forgets to clock out is locked out of the kiosk and out of their
 * lessons until a member of staff intervenes. This runs hourly and closes each
 * one at the end of the class it was opened under.
 *
 * NIGHTLY, AT 05:00 UTC — 11pm or midnight in Chicago, safely after the latest
 * block on the timetable ends at 9pm, so nothing still legitimately running is
 * swept.
 *
 * THIS CRON IS THE BACKSTOP, NOT THE MAIN DEFENCE, which is why nightly is
 * enough. The kiosk, the lesson start and the student's own finish button each
 * sweep that student before they act, so anybody who comes back is fixed the
 * moment they touch anything — a student who abandons Tuesday morning theory
 * and returns at 1pm has it closed by their own tap, not by this.
 *
 * What is left for this to catch is the session nobody returns to: a student
 * who stops coming, or who never taps again. Those cost nothing by waiting
 * until the end of the day, and a job that runs once is a job whose failures
 * are visible rather than lost in twenty-three successful runs.
 *
 * REPORTS WHAT IT COULD NOT DO. Punches with no schedule block have no
 * defensible end time, so they are counted and named rather than closed at some
 * invented hour. That is a human's call.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const school = await firstSchool();
  if (!school) return NextResponse.json({ ok: true, skipped: "no school" });

  try {
    const sweep = await closeStaleSessions(school.id, school.timezone);
    return NextResponse.json({
      ok: true,
      school: school.name,
      closed: sweep.closed,
      stillRunning: sweep.running,
      // Named, not just counted: "3 unclosable" is not actionable, and the
      // whole point of surfacing these is that somebody has to go and look.
      needsAHuman: sweep.unclosable.map((s) => ({
        student: s.studentName,
        punchedInAt: s.punchedInAt,
        why: "no schedule block, so nothing can say when it should have ended",
      })),
    });
  } catch (e: any) {
    // A failure here means students stay locked out, so it is a 500 rather than
    // an ok:false a monitor would score as a successful run.
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
