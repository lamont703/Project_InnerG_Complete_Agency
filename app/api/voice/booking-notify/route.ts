import { createAdminClient } from "@/lib/supabase/admin";
import { twiml } from "@/lib/twiml";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { bookingVoiceScript, bookingVoiceTwiml, resolveVoice } from "@/lib/bookings/voice-script";

/**
 * What Twilio plays when the outbound booking call connects.
 *
 * THE SCRIPT IS BUILT HERE, NOT PASSED IN THE URL. A call whose words came from
 * its own query string is a call anybody who guesses the URL can make our
 * number say anything on. The URL carries only a call id; every word is read
 * from the row.
 *
 * SPEAKS EVEN IF THE SIGNATURE CANNOT BE VERIFIED, matching /api/voice/inbound.
 * A silent answered call is worse than an unverified one: the shop has picked
 * up, and dead air from an unknown number is what teaches somebody to block it.
 * The signature failing is logged loudly instead.
 */
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("call");

  let params: Record<string, string> = {};
  if (req.method === "POST") {
    try {
      params = await formParams(req);
    } catch {
      params = {};
    }
  }

  const ok = twilioSignatureIsValid({
    url: requestUrlForSignature(req),
    params,
    signature: req.headers.get("x-twilio-signature"),
    authToken: process.env.TWILIO_AUTH_TOKEN,
  });
  if (!ok) console.warn("[voice/booking-notify] unverified Twilio signature — speaking anyway");

  if (!callId) {
    return twiml(`<Response><Hangup/></Response>`);
  }

  const admin = createAdminClient() as any;
  const { data: call } = await admin
    .from("booking_voice_calls")
    .select("id, booking_id")
    .eq("id", callId)
    .maybeSingle();

  if (!call) {
    return twiml(`<Response><Hangup/></Response>`);
  }

  const { data: b } = await admin
    .from("booking_requests")
    .select("entity_name, customer_name, customer_phone, service_name, requested_date, requested_time")
    .eq("id", call.booking_id)
    .maybeSingle();

  if (!b) {
    return twiml(`<Response><Hangup/></Response>`);
  }

  const prettyDate = b.requested_date
    ? new Date(`${b.requested_date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "the requested date";

  /*
   * A voice may be named in the URL, validated against the whitelist. Unlike
   * the words — which are read from the row precisely so a URL cannot dictate
   * them — this is a rendering choice from a fixed set, and being able to
   * change it without a deploy is what makes comparing voices cost a phone
   * call instead of a release.
   */
  const voice = resolveVoice(url.searchParams.get("voice"));

  return twiml(
    bookingVoiceTwiml(
      bookingVoiceScript({
        shopName: b.entity_name || "your shop",
        customerName: b.customer_name || "",
        customerPhone: b.customer_phone || "",
        serviceName: b.service_name || "an appointment",
        prettyDate,
        requestedTime: b.requested_time || "the requested time",
      }),
      voice
    )
  );
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
