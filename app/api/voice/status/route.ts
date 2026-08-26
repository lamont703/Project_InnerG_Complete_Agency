import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { isBillable, type MatchConfidence } from "@/lib/voice/routing";

/**
 * Completion of the INBOUND leg — the only thing billing reads.
 *
 * Inbound, not the outbound leg, because answerOnBridge means the inbound call
 * is not answered until the two sides are actually bridged. Its duration is
 * therefore conversation time; the outbound leg's includes ringing and the
 * whisper, and billing on that would charge schools for their own phone
 * ringing. Measured live: 2s inbound against 7s outbound on the same call.
 *
 * THIS ROUTE REJECTS AN UNVERIFIED SIGNATURE, unlike the others. It writes the
 * rows an invoice is built from, so an unauthenticated caller here is a
 * stranger manufacturing billable calls against a school's account.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const params = await formParams(req).catch(() => ({}) as Record<string, string>);
  if (
    !twilioSignatureIsValid({
      url: requestUrlForSignature(req),
      params,
      signature: req.headers.get("x-twilio-signature"),
      authToken: process.env.TWILIO_AUTH_TOKEN,
    })
  ) {
    console.warn("[voice/status] rejected unverified Twilio signature");
    return new NextResponse("forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  if (!callSid) return new NextResponse("", { status: 204 });

  const status = params.CallStatus || null;
  const duration = params.CallDuration ? Number(params.CallDuration) : null;
  const answered = status === "completed" && (duration ?? 0) > 0;

  const db = createAdminClient();
  const { data: existing } = await (db.from("school_calls") as any)
    .select("id, school_matched_by")
    .eq("provider_call_id", callSid)
    .maybeSingle();

  // No row means the call never reached /connect — hung up during the prompt.
  // Recording it anyway keeps the funnel honest about how many callers drop
  // before they ever name a school.
  const matchedBy: MatchConfidence = (existing?.school_matched_by as MatchConfidence) || "fallback";
  const billable = isBillable({ answered, durationSeconds: duration, matchedBy });

  try {
    await (db.from("school_calls") as any).upsert(
      {
        provider_call_id: callSid,
        from_number: params.From || null,
        to_number: params.To || null,
        answered,
        status,
        duration_seconds: duration,
        billable,
        ended_at: new Date().toISOString(),
      },
      { onConflict: "provider_call_id" },
    );
  } catch (e) {
    console.error("[voice/status] could not record completion", e);
  }
  return new NextResponse("", { status: 204 });
}
