import { NextRequest, NextResponse } from "next/server";
import { blockAt, blockWindow, canClockIn, ledger, sessionMustEndAt, toHours } from "@/lib/school/hours";
import {
  closePunch, closeStaleSessions, firstSchool, insertPunch, openPunchFor, programById,
  punchesFor, scheduleFor, studentByCode,
} from "@/lib/school/store";

/**
 * The kiosk endpoint. One code in, one decision out.
 *
 * A SHARED SCREEN AT THE DOOR, so there is no session and no password — the
 * clock code is the whole credential. That is a deliberate trade and worth
 * naming: a code is guessable by a classmate, which is why this endpoint can
 * only ever clock somebody IN or OUT. It reads no transcript, exposes no other
 * student, and returns a first name and an hour total and nothing else. The
 * worst a misused code can do is create a punch that an instructor voids.
 *
 * THE SCHEDULE DECIDES THE HOUR TYPE. Nothing in the request body says what
 * kind of hour this is, because a student has an incentive to get that wrong
 * and no reason to know. The block running at that minute answers it.
 *
 * NOTHING IS SCHEDULED IS A REAL ANSWER. A student tapping in at 6am Sunday is
 * told the truth rather than handed a default hour type — inventing one is how
 * a ledger stops matching the timetable it is supposed to reflect.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request." }, { status: 400 });
  }

  const code = String(body?.code ?? "").trim();
  if (!code) return NextResponse.json({ ok: false, message: "Enter your code." }, { status: 400 });

  const school = await firstSchool();
  if (!school) {
    return NextResponse.json({ ok: false, message: "This kiosk is not set up yet." }, { status: 500 });
  }

  const student = await studentByCode(school.id, code);
  // Deliberately the same message as a wrong code would give: a kiosk that
  // distinguishes "no such code" from "withdrawn student" tells anyone at the
  // door which codes are real.
  if (!student) {
    return NextResponse.json({ ok: false, message: "We don't recognize that code." }, { status: 200 });
  }

  const now = new Date();
  const [program, punches, blocks] = await Promise.all([
    programById(student.programId),
    punchesFor(student.id),
    scheduleFor(student.programId),
  ]);
  if (!program) {
    return NextResponse.json({ ok: false, message: "Your program is not set up. See the front desk." });
  }

  /*
   * SWEEP BEFORE DECIDING. A punch left open past the end of its class is
   * closed at that end, not at this moment — otherwise tapping in on Wednesday
   * morning would clock out a Tuesday evening session with twenty hours on it,
   * which then eats the student's 184-hour month and refuses every punch after.
   *
   * Done here as well as in the hourly cron on purpose: a student standing at
   * the door should not be relying on a scheduled job having run.
   */
  const sweep = await closeStaleSessions(school.id, school.timezone, now, {
    studentId: student.id,
  });

  /*
   * IF THE SWEEP CLOSED SOMETHING, THAT IS THIS TAP'S ANSWER. Falling through
   * would silently turn a tap the student meant as "clock me out" into a clock
   * IN — and between blocks it would then refuse with "nothing is scheduled",
   * which reads as the kiosk being broken rather than as their old session
   * having been tidied up. One tap, one thing that happened, said out loud.
   */
  if (sweep.closed > 0) {
    const after = ledger(await punchesFor(student.id));
    return NextResponse.json({
      ok: false,
      message: `You were still clocked in from an earlier class, ${student.firstName}. We closed it at the time that class ended — you have ${toHours(after.totalMinutes).toFixed(1)} hours. Tap your code again to clock in.`,
    });
  }

  const open = await openPunchFor(student.id);

  // ---- clocking OUT ----------------------------------------------------
  if (open) {
    /*
     * CAPPED AT THE END OF THE CLASS, the same rule the sweep applies. Someone
     * who tidies up and taps out at 5:30 from a class that ended at 5:00 must
     * not be credited half an hour more than the class offered — and a student
     * who does the right thing should never end up with fewer hours than one
     * who forgets, which is what an uncapped clock-out plus a capped sweep
     * would have produced.
     */
    const block = open.scheduleBlockId
      ? blocks.find((b) => b.id === open.scheduleBlockId) ?? null
      : null;
    const mustEnd = sessionMustEndAt(new Date(open.punchedInAt), block, school.timezone);
    const outAt = mustEnd && now.getTime() > mustEnd.getTime() ? mustEnd : now;

    const res = await closePunch(open.id, outAt);
    if (!res.ok) {
      return NextResponse.json({ ok: false, message: "Could not clock you out. See the front desk." });
    }
    const after = ledger(await punchesFor(student.id));
    const minutes = Math.round((outAt.getTime() - new Date(open.punchedInAt).getTime()) / 60000);
    return NextResponse.json({
      ok: true,
      action: "out",
      firstName: student.firstName,
      sessionMinutes: minutes,
      totalHours: Number(toHours(after.totalMinutes).toFixed(1)),
      programHours: program.totalHours,
    });
  }

  // ---- clocking IN -----------------------------------------------------
  const block = blockAt(blocks, now, school.timezone);
  if (!block) {
    return NextResponse.json({
      ok: false,
      message: `Nothing is scheduled right now, ${student.firstName}. Hours can only be earned during a scheduled block.`,
    });
  }

  const decision = canClockIn({
    request: { kind: block.kind, modality: block.modality, segment: block.segment },
    punches, program, studentStatus: student.status, now, timeZone: school.timezone,
  });

  if (!decision.allowed) {
    return NextResponse.json({ ok: false, message: decision.message ?? "You can't clock in right now." });
  }

  const res = await insertPunch({ studentId: student.id, block, at: now });
  if (!res.ok) {
    return NextResponse.json({
      ok: false,
      message: res.error === "already_clocked_in"
        ? "You're already clocked in."
        : "Could not clock you in. See the front desk.",
    });
  }

  const l = ledger(punches);
  return NextResponse.json({
    ok: true,
    action: "in",
    firstName: student.firstName,
    block: { label: block.label, window: blockWindow(block), kind: block.kind, modality: block.modality },
    totalHours: Number(toHours(l.totalMinutes).toFixed(1)),
    programHours: program.totalHours,
    // Shown only when it is close enough to matter — a student two hours from a
    // ceiling should hear it now, not at the punch that gets refused.
    headroomHours:
      decision.headroomMinutes !== undefined && decision.headroomMinutes < 20 * 60
        ? Number(toHours(decision.headroomMinutes).toFixed(1))
        : null,
  });
}
