import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRoutes } from "@/lib/voice/load-routes";
import { buildWhisper, normaliseUsPhone, type DepartmentIntent } from "@/lib/voice/routing";

/**
 * The page asks us to connect a caller to a school.
 *
 * THE SCHOOL AND THE INTENT ARE FACTS HERE, not inferences. They came from the
 * page the visitor was reading and a button they pressed, so there is no speech
 * to misrecognise and no "which school did you want" to ask. That is the entire
 * argument for this path over tapping a tel: link: a phone call carries only a
 * caller ID and a dialled number, and neither can express "the Houston page".
 *
 * THIS ENDPOINT SPENDS MONEY AND DIALS STRANGERS, so it is guarded. It is
 * public by necessity — a visitor has no account — which makes it the one place
 * in this feature where an abuser can make our Twilio account ring an arbitrary
 * number. US numbers only, and a hard cap per number per hour.
 */
export const dynamic = "force-dynamic";

const MAX_CALLBACKS_PER_NUMBER_PER_HOUR = 3;
const VALID_INTENTS: DepartmentIntent[] = ["admissions", "financial_aid", "education"];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const phone = normaliseUsPhone(body?.phone);
  const intent: DepartmentIntent | null = VALID_INTENTS.includes(body?.intent) ? body.intent : null;
  const routingId = typeof body?.routingId === "string" ? body.routingId : null;
  if (!phone) return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  if (!routingId) return NextResponse.json({ ok: false, error: "missing_school" }, { status: 400 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.error("[voice/callback] Twilio is not configured");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const db = createAdminClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await (db.from("school_calls") as any)
    .select("id", { count: "exact", head: true })
    .eq("to_number", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_CALLBACKS_PER_NUMBER_PER_HOUR) {
    // Deliberately not an error the UI dwells on: the honest reading is almost
    // always someone retrying, not an attacker.
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const routes = await loadRoutes(db).catch(() => []);
  const route = routes.find((r) => r.id === routingId);
  if (!route) return NextResponse.json({ ok: false, error: "unknown_school" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const whisper = buildWhisper(route, intent);

  const form = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Url: `${origin}/api/voice/callback-connect`,
    Method: "POST",
    StatusCallback: `${origin}/api/voice/status`,
    StatusCallbackMethod: "POST",
    // Twilio keeps ringing long after a person has decided not to answer.
    Timeout: "30",
  });

  let callSid: string | null = null;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("[voice/callback] Twilio refused", json?.code, json?.message);
      return NextResponse.json({ ok: false, error: "call_failed" }, { status: 502 });
    }
    callSid = json.sid;
  } catch (e) {
    console.error("[voice/callback] could not place call", e);
    return NextResponse.json({ ok: false, error: "call_failed" }, { status: 502 });
  }

  // Written AFTER the call exists so provider_call_id is the real CallSid, and
  // before anyone answers so /callback-connect has the whisper waiting for it.
  try {
    await (db.from("school_calls") as any).upsert(
      {
        routing_id: route.id,
        provider_call_id: callSid,
        from_number: fromNumber,
        to_number: phone,
        routed_to: route.destinationNumber,
        // 'confident' is the literal truth on this path: the school was not
        // heard over a phone line, it was the page they were reading.
        school_matched_by: "confident",
        department_intent: intent,
        confirmed_department: intent ? route.departmentLabels?.[intent] || intent : null,
        intent_captured: `(web callback: ${intent ?? "unspecified"})`,
        whisper_text: whisper,
        source_context: { channel: "web_callback", school_id: route.id },
        started_at: new Date().toISOString(),
      },
      { onConflict: "provider_call_id" },
    );
  } catch (e) {
    console.error("[voice/callback] could not record call", e);
  }

  return NextResponse.json({ ok: true, callSid });
}
