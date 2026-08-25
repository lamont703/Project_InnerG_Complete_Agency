import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";

/**
 * SCAFFOLDING — proves the whisper mechanic, nothing more.
 *
 * Replaces the TwiML Bin from the test plan. Serving the XML ourselves rather
 * than from a Bin costs nothing and means the thing we prove is the thing we
 * later ship, instead of a console artifact we would have to re-implement.
 *
 * No signature validation here ON PURPOSE: this route creates no records and
 * bills nothing, so the only thing an attacker gains is making our own phone
 * ring. The real inbound handler MUST validate X-Twilio-Signature, because
 * that one writes rows an invoice is built from.
 */
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const school = process.env.TWILIO_TEST_SCHOOL_NUMBER;
  if (!school) {
    return twiml(`<Response><Say>Test school number is not configured.</Say></Response>`);
  }
  const whisperUrl = `${new URL(req.url).origin}/api/voice/test-whisper`;
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
