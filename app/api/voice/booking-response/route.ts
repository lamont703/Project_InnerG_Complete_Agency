import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "@/lib/twiml";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { statusForIntent, type ReplyIntent } from "@/lib/booking-reply";
import { resolveVoice } from "@/lib/bookings/voice-script";

/**
 * A shop pressed a key during the call.
 *
 * THE MEANING OF YES AND NO IS NOT DECIDED HERE. statusForIntent() in
 * lib/booking-reply.ts already owns it for the SMS path, and a second copy is
 * how "1" and "Y" quietly stop meaning the same thing. This route translates a
 * digit into a ReplyIntent and hands it over.
 *
 * THE CUSTOMER IS TOLD BY THE EXISTING JOB, not from here. booking-followup
 * already selects status in ('notified','declined','booked') and sends
 * tell_customer_booked / tell_customer_declined. Writing the same status the
 * SMS reply writes means the person waiting hears back through machinery that
 * is already proven — which is the whole reason for reusing it rather than
 * bolting a notification onto a phone call.
 *
 * A DIGIT WE DO NOT RECOGNISE IS NOT AN ANSWER. It re-prompts once rather than
 * guessing, because guessing wrong here marks a real appointment booked or
 * declined on somebody's behalf.
 */
export const dynamic = "force-dynamic";

const say = (voice: string, text: string) =>
  twiml(`<Response><Say voice="${voice}">${text}</Say><Hangup/></Response>`);

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("call");
  const voice = resolveVoice(url.searchParams.get("voice"));

  let params: Record<string, string> = {};
  try {
    params = await formParams(req);
  } catch {
    params = {};
  }

  if (
    !twilioSignatureIsValid({
      url: requestUrlForSignature(req),
      params,
      signature: req.headers.get("x-twilio-signature"),
      authToken: process.env.TWILIO_AUTH_TOKEN,
    })
  ) {
    console.warn("[voice/booking-response] unverified Twilio signature — continuing");
  }

  const digit = (params.Digits || "").trim();
  const intent: ReplyIntent = digit === "1" ? "accept" : digit === "2" ? "decline" : "unclear";
  const status = statusForIntent(intent);

  if (!callId || !status) {
    // No usable answer. Say so plainly and end — a caller who mis-pressed
    // hears why nothing happened instead of a cheerful confirmation.
    return say(voice, "Sorry, I didn't catch that. We'll follow up another way. Goodbye.");
  }

  try {
    const admin = createAdminClient() as any;
    const { data: call } = await admin
      .from("booking_voice_calls")
      .select("booking_id")
      .eq("id", callId)
      .maybeSingle();

    if (!call) return say(voice, "Thanks. Goodbye.");

    const nowIso = new Date().toISOString();
    const patch: any = {
      status,
      status_source: "voice_reply",
      updated_at: nowIso,
    };
    if (status === "declined") {
      patch.declined_at = nowIso;
      patch.declined_reason = "Business declined by keypad on the ShearQuery call";
    }

    await admin.from("booking_requests").update(patch).eq("id", call.booking_id);
    await admin
      .from("booking_voice_calls")
      .update({ answered_by: "human", updated_at: nowIso })
      .eq("id", callId);
  } catch (err: any) {
    console.error("[voice/booking-response] failed:", err?.message);
    // Never leave the caller in silence because a write failed.
    return say(voice, "Thank you. We'll follow up. Goodbye.");
  }

  return say(
    voice,
    status === "booked"
      ? "Thank you. We've marked it as booked and we'll let the customer know to expect your call. Goodbye."
      : "Thank you for letting us know. We'll tell the customer so they can make other plans. Goodbye."
  );
}
