import type { NextRequest } from "next/server";
import { twiml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { isBillable, type MatchConfidence } from "@/lib/voice/routing";

/**
 * The school leg ended. THIS is where billing is decided.
 *
 * Not the inbound leg. A prompt now runs before the dial, so the inbound call
 * is answered at the greeting and its duration carries the agent conversation
 * plus the ringing — twenty to thirty seconds of machine time that nobody
 * should be charged for. DialCallDuration measures only the leg to the school.
 *
 * REJECTS AN UNVERIFIED SIGNATURE. It writes the field an invoice is built
 * from, so an unauthenticated caller here is a stranger manufacturing billable
 * calls against a school's account.
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
    console.warn("[voice/completed] rejected unverified Twilio signature");
    return twiml(`<Response><Hangup/></Response>`);
  }

  const callSid = params.CallSid;
  const dialStatus = params.DialCallStatus || null;
  const dialDuration = params.DialCallDuration ? Number(params.DialCallDuration) : null;
  const answered = dialStatus === "completed" && (dialDuration ?? 0) > 0;

  if (callSid) {
    const db = createAdminClient();
    let matchedBy: MatchConfidence = "fallback";
    try {
      const { data } = await (db.from("school_calls") as any)
        .select("school_matched_by")
        .eq("provider_call_id", callSid)
        .maybeSingle();
      if (data?.school_matched_by) matchedBy = data.school_matched_by as MatchConfidence;
    } catch (e) {
      console.error("[voice/completed] could not read match confidence", e);
    }

    try {
      await (db.from("school_calls") as any).upsert(
        {
          provider_call_id: callSid,
          dial_status: dialStatus,
          dial_duration_seconds: dialDuration,
          answered,
          billable: isBillable({ answered, dialDurationSeconds: dialDuration, matchedBy }),
          ended_at: new Date().toISOString(),
        },
        { onConflict: "provider_call_id" },
      );
    } catch (e) {
      console.error("[voice/completed] could not record dial outcome", e);
    }
  }

  // Whatever this returns continues the call. The conversation is over.
  return twiml(`<Response><Hangup/></Response>`);
}
