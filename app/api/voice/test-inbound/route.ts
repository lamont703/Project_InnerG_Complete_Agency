import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";

/**
 * SCAFFOLDING — proves the whisper mechanic, nothing more.
 *
 * Replaces the TwiML Bin from the test plan. Serving the XML ourselves rather
 * than from a Bin costs nothing and means the thing we prove is the thing we
 * later ship, instead of a console artifact we would have to re-implement.
 *
 * GATED BY A SHARED SECRET because this runs in PRODUCTION, on a public URL,
 * and the TwiML it returns contains a real personal phone number. Without the
 * gate, reading that number is a GET request away.
 *
 * A shared secret rather than X-Twilio-Signature, deliberately, for scaffolding:
 * signature validation hashes the request URL, and behind Vercel's proxy the
 * URL this route observes can differ from the one Twilio signed — a mismatch
 * that fails the call for a reason having nothing to do with what we are
 * testing. The real inbound handler MUST validate the signature, because that
 * one writes rows an invoice is built from; this one writes nothing.
 */
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const expected = process.env.TWILIO_TEST_KEY;
  if (!expected || url.searchParams.get("k") !== expected) {
    // Valid TwiML, no detail. A 403 would show in Twilio as a generic
    // application error and send us debugging the wrong thing.
    return twiml(`<Response><Say>Not configured.</Say></Response>`);
  }
  const school = process.env.TWILIO_TEST_SCHOOL_NUMBER;
  if (!school) {
    return twiml(`<Response><Say>Test school number is not configured.</Say></Response>`);
  }
  const whisperUrl = `${url.origin}/api/voice/test-whisper`;
  // answerOnBridge: the caller hears real ringing instead of silence while the
  // school's phone rings, and the inbound leg isn't marked answered until the
  // two are actually bridged.
  return twiml(
    `<Response>` +
      `<Dial answerOnBridge="true" timeout="20">` +
        `<Number url="${escapeXml(whisperUrl)}">${escapeXml(school)}</Number>` +
      `</Dial>` +
    `</Response>`,
  );
}

export const POST = handle;
export const GET = handle;
