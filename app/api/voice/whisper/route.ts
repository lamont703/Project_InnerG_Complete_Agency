import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHISPER_LEAD_PAUSE_SECONDS } from "@/lib/voice/routing";

/**
 * Played to the SCHOOL only, after they answer and before the bridge.
 *
 * The leading pause is not padding. On the first live test the message had
 * already begun before the phone reached the tester's ear and half of it was
 * lost — a person answers, then moves the handset, and that motion is what the
 * pause covers.
 *
 * Reads the sentence that /connect stored rather than rebuilding it, so what
 * the school heard is a recorded fact when a lead is disputed.
 */
export const dynamic = "force-dynamic";

const FALLBACK = "Shear Query lead.";

async function handle(req: NextRequest) {
  const callSid = new URL(req.url).searchParams.get("c");
  let text = FALLBACK;
  if (callSid) {
    try {
      const db = createAdminClient();
      const { data } = await (db.from("school_calls") as any)
        .select("whisper_text")
        .eq("provider_call_id", callSid)
        .maybeSingle();
      if (data?.whisper_text) text = data.whisper_text;
    } catch {
      // Say something rather than nothing: silence here reads to the school as
      // an ordinary cold call, which is the one impression this exists to stop.
    }
  }
  return twiml(
    `<Response>` +
      `<Pause length="${WHISPER_LEAD_PAUSE_SECONDS}"/>` +
      `<Say voice="Polly.Joanna">${escapeXml(text)}</Say>` +
    `</Response>`,
  );
}

export const POST = handle;
export const GET = handle;
