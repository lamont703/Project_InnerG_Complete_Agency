import { NextRequest, NextResponse } from "next/server";
import { blockAt, blockWindow, canClockIn, ledger, toHours } from "@/lib/school/hours";
import {
  closePunch, firstSchool, insertPunch, openPunchFor, programById,
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
    return NextResponse.json({ ok: false, message: "We don't recognise that code." }, { status: 200 });
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

  const open = await openPunchFor(student.id);

  // ---- clocking OUT ----------------------------------------------------
  if (open) {
    const res = await closePunch(open.id, now);
    if (!res.ok) {
      return NextResponse.json({ ok: false, message: "Could not clock you out. See the front desk." });
    }
    const after = ledger(await punchesFor(student.id));
    const minutes = Math.round((now.getTime() - new Date(open.punchedInAt).getTime()) / 60000);
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
