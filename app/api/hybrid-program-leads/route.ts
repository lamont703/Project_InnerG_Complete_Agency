import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendGhlSms } from "@/lib/ghl-sms";

/**
 * A school asking about a hybrid program.
 *
 * SAME ORDERING DISCIPLINE AS app/api/bookings and app/api/school-tours: the
 * row is written before anything else can fail, and the visitor is only told
 * "we'll call you" once it exists. A lead lost to an SMS outage is a school
 * that thinks a call is coming and never gets one.
 *
 * ============================================================================
 * THIS ROUTE DOES TEXT SOMEBODY — AND THAT IS NOT A CONTRADICTION
 * ============================================================================
 * app/api/school-tours/route.ts says, in capitals, that sendGhlSms is
 * deliberately not imported there so nobody adds it by reflex when copying the
 * file. That rule is about texting SCHOOLS: we hold four email addresses
 * across 1,185 of them, phone is a campus main line, and a tour request is the
 * wrong thing to put on it.
 *
 * The recipient here is the ShearQuery rep — one known number, belonging to
 * the person who asked to be told. Nothing is sent to the school by this
 * route, and nothing should be: the page promises them a phone call from a
 * human, and an automated text arriving first would undercut it.
 */

const ALERT_TO = process.env.SHEARQUERY_ALERT_SMS;

function clean(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const schoolName = clean(body.schoolName);
  const state = clean(body.state, 2).toUpperCase();
  const contactName = clean(body.contactName);
  const email = clean(body.email);
  const phone = clean(body.phone, 32);

  /*
   * All five are required in the UI, so a miss here is our bug rather than
   * theirs — but it is still checked, because a form is a suggestion and a
   * request body is whatever arrives.
   */
  const missing = (
    [
      ["school name", schoolName],
      ["state", state],
      ["name", contactName],
      ["email", email],
      ["phone", phone],
    ] as [string, string][]
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Still needed: ${missing.join(", ")}.` },
      { status: 400 }
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "That email address looks wrong." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ ok: false, error: "That phone number looks too short." }, { status: 400 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: row, error: insertError } = await db
    .from("hybrid_program_leads")
    .insert({
      school_name: schoolName,
      state,
      contact_name: contactName,
      email,
      phone,
      source: clean(body.source) || "texas-hybrid-program",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("[hybrid-leads] insert failed:", insertError?.message);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that. Please try again." },
      { status: 500 }
    );
  }

  /*
   * The alert. Its failure is recorded on the row rather than returned to the
   * school: their part worked, and telling them it did not would cost a lead
   * over something only we can fix. hybrid_program_leads_unalerted_idx exists
   * precisely so "saved but nobody was told" is one query away.
   */
  let alertError: string | null = null;
  if (!ALERT_TO) {
    alertError = "SHEARQUERY_ALERT_SMS is not set";
    console.error("[hybrid-leads] NO ALERT NUMBER CONFIGURED — lead saved, nobody notified");
  } else {
    try {
      const res = await sendGhlSms({
        message:
          `New hybrid program lead\n` +
          `${schoolName} (${state})\n` +
          `${contactName}\n${phone}\n${email}\n` +
          `They expect a call within 24 hours.`,
        phone: ALERT_TO,
        name: "ShearQuery alerts",
      });
      if (!res.ok) alertError = res.error || "unknown";
    } catch (err: any) {
      alertError = String(err?.message || err);
    }
  }

  await db
    .from("hybrid_program_leads")
    .update({
      alerted_at: alertError ? null : new Date().toISOString(),
      alert_error: alertError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (alertError) console.warn(`[hybrid-leads] row ${row.id}: alert failed — ${alertError}`);

  // Always ok from the school's side once the row exists.
  return NextResponse.json({ ok: true });
}
