import { twiml } from "@/lib/twiml";

/**
 * SCAFFOLDING — the whisper leg.
 *
 * Twilio runs this on the CALLED party's end after they answer and before the
 * parties are bridged, so the school hears it and the student never does.
 * Keep it under about three seconds: the student is holding a connected line
 * in silence for however long this takes.
 */
export const dynamic = "force-dynamic";

const WHISPER = "Shear Query. Financial aid. Cosmetology program.";

async function handle() {
  return twiml(`<Response><Say voice="Polly.Joanna">${WHISPER}</Say></Response>`);
}

export const POST = handle;
export const GET = handle;
