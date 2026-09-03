import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  openSessionFor,
  recordActivityMinute,
  studentForUser,
} from "@/lib/school/learning-store";

/**
 * The heartbeat behind "engaged minutes".
 *
 * WHAT IT IS FOR. A punch says a session was open for three hours. It cannot say
 * whether anybody was there. This endpoint is what separates the two, and the
 * two are never merged: the punch stays the hour record, and these minutes are
 * the evidence an instructor looks at before signing.
 *
 * THREE THINGS THIS DELIBERATELY DOES NOT TRUST THE CLIENT WITH:
 *
 *   1. WHO. Identity comes from the session cookie. A student id in the body
 *      would let anybody credit anybody.
 *   2. WHICH SESSION. The open punch is looked up from the student, never
 *      supplied — otherwise minutes could be posted against an old session.
 *   3. WHEN. The minute is stamped from the server clock. A client-supplied
 *      timestamp is a client-supplied hour.
 *   4. WHICH SECTION. The id is accepted from the body but verified against the
 *      punch's own schedule block before it is stored, so a section from
 *      another class cannot be counted as work done in this one.
 *
 * The most it can do is assert "somebody with this session cookie is at the
 * keyboard right now", which is exactly the claim being measured. It cannot
 * prove that somebody is the student, and nothing here pretends otherwise —
 * that is what the instructor signature is for.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const student = await studentForUser(user.id);
  if (!student) return NextResponse.json({ ok: false }, { status: 403 });

  const open = await openSessionFor(student.id);
  // No open session is a normal race, not an error: the tab beats once more
  // after the student clicks "finish". Reporting 200 keeps it out of their
  // console and out of ours.
  if (!open) return NextResponse.json({ ok: true, recorded: false });

  /*
   * The section is a hint, not a claim. It is verified against the punch's own
   * schedule block downstream, and a body that fails to parse costs the minute
   * its section rather than the whole heartbeat — being on an unknown section
   * is still being at the keyboard.
   */
  let sectionId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.sectionId === "string") sectionId = body.sectionId;
  } catch {}

  const res = await recordActivityMinute({
    studentId: student.id, punchId: open.id, sectionId, now: new Date(),
  });
  return NextResponse.json({ ok: true, recorded: res.ok });
}
