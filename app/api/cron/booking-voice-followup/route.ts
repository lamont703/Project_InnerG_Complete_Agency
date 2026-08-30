import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import {
  MAX_ATTEMPTS,
  RETRY_AFTER_MS,
  withinCallWindow,
} from "@/lib/bookings/voice-script";

/**
 * Call the shops the text could not reach.
 *
 * LAST IN THE CHAIN, never first. It only looks at bookings already marked
 * `unreachable` — meaning the SMS was refused and the business-email fallback
 * found no address. A shop that got the text is never called.
 *
 * THE FAILURE IT ANSWERS IS A LANDLINE. GHL reports it as "DND is active for
 * SMS"; the number is fine, it just cannot receive text. So this is not a
 * second attempt at the same thing — it is the only channel that was ever
 * going to work on that number.
 *
 * WRITTEN FOR VOICEMAIL. Most of these reach a machine, and that is a success:
 * a message with a name, a number and a time is fully actionable. Nothing in
 * the flow depends on a person being on the line.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

interface TwilioCallResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

/**
 * Place the call through Twilio's REST API directly.
 *
 * No SDK, because the project does not depend on one and adding 2MB for a
 * single POST is not a trade worth making.
 *
 * MachineDetection=DetectMessageEnd is the important parameter. Without it
 * Twilio connects the moment the line opens, and on a voicemail the first two
 * sentences — including who is calling — land on top of the outgoing greeting
 * and are lost. With it, the message starts after the beep.
 */
async function placeCall(args: {
  to: string;
  from: string;
  twimlUrl: string;
  statusUrl: string;
}): Promise<TwilioCallResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !auth) return { ok: false, error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set" };

  const body = new URLSearchParams({
    To: args.to,
    From: args.from,
    Url: args.twimlUrl,
    Method: "POST",
    StatusCallback: args.statusUrl,
    StatusCallbackMethod: "POST",
    MachineDetection: "DetectMessageEnd",
    // A shop that does not pick up in 30 seconds is not about to.
    Timeout: "30",
  });
  body.append("StatusCallbackEvent", "completed");

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json: any = await res.json();
    if (!res.ok) return { ok: false, error: json?.message || `HTTP ${res.status}` };
    return { ok: true, sid: json.sid };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  /** Shows what it would dial and says nothing to anyone. */
  const dryRun = url.searchParams.get("dry") === "1";
  /**
   * Redirect every call to one number, for testing.
   *
   * The call is REAL — same script, same caller id, same machine detection —
   * only the destination changes. A rehearsal that stubs the dialling proves
   * the code compiles; this proves the call actually sounds right, which is
   * the only thing worth knowing before it rings a real shop.
   *
   * Logged as the number actually dialled, so the record never claims we rang
   * a business we did not.
   */
  const overrideTo = url.searchParams.get("to");
  /** Ignore the calling window. Only meaningful alongside `to`. */
  const force = url.searchParams.get("force") === "1";
  /** Passed through to the TwiML endpoint, which validates it. Testing only. */
  const voice = url.searchParams.get("voice");

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    return NextResponse.json({ ok: false, error: "TWILIO_PHONE_NUMBER is not set" }, { status: 500 });
  }

  const now = new Date();
  if (!withinCallWindow(now) && !force) {
    return NextResponse.json({
      ok: true,
      skipped: "outside the calling window (10:00–19:00 US Eastern, every day)",
      placed: 0,
    });
  }

  const admin = createAdminClient() as any;

  const { data: bookings, error } = await admin
    .from("booking_requests")
    .select("id, entity_name, entity_phone, customer_name, created_at")
    .eq("status", "unreachable")
    .not("entity_phone", "is", null)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const report: any[] = [];
  let placed = 0;

  for (const b of bookings ?? []) {
    const { data: prior } = await admin
      .from("booking_voice_calls")
      .select("id, attempt, created_at, status")
      .eq("booking_id", b.id)
      .order("created_at", { ascending: false });

    const attempts = prior?.length ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      report.push({ shop: b.entity_name, action: "given up", attempts });
      continue;
    }
    const last = prior?.[0];
    if (last && Date.now() - new Date(last.created_at).getTime() < RETRY_AFTER_MS) {
      report.push({ shop: b.entity_name, action: "waiting", retryAfterHours: RETRY_AFTER_MS / 3_600_000 });
      continue;
    }

    const to = overrideTo || b.entity_phone;

    if (dryRun) {
      report.push({
        shop: b.entity_name,
        action: "would call",
        to,
        redirected: Boolean(overrideTo),
        realNumber: b.entity_phone,
        from,
        attempt: attempts + 1,
      });
      continue;
    }

    // The row is created BEFORE the call, so the TwiML endpoint has something
    // to read when Twilio fetches it seconds later.
    const { data: call, error: callErr } = await admin
      .from("booking_voice_calls")
      .insert({ booking_id: b.id, to_number: to, from_number: from, attempt: attempts + 1 })
      .select("id")
      .single();

    if (callErr || !call) {
      report.push({ shop: b.entity_name, action: "failed", reason: callErr?.message ?? "insert failed" });
      continue;
    }

    const res = await placeCall({
      to,
      from,
      twimlUrl:
        `${SITE_URL}/api/voice/booking-notify?call=${call.id}` +
        (voice ? `&voice=${encodeURIComponent(voice)}` : ""),
      statusUrl: `${SITE_URL}/api/voice/booking-status?call=${call.id}`,
    });

    await admin
      .from("booking_voice_calls")
      .update({
        call_sid: res.sid ?? null,
        status: res.ok ? "initiated" : "failed",
        error: res.ok ? null : res.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", call.id);

    if (res.ok) placed++;
    report.push({
      shop: b.entity_name,
      action: res.ok ? "calling" : "failed",
      to,
      redirected: Boolean(overrideTo),
      sid: res.sid,
      reason: res.error,
    });
  }

  return NextResponse.json({ ok: true, dryRun, due: bookings?.length ?? 0, placed, report });
}
