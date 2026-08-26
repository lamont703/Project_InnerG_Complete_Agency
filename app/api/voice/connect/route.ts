import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { buildWhisper, classifyIntent, matchSchool, type SchoolRoute } from "@/lib/voice/routing";

/**
 * Decide, record, bridge.
 *
 * The whisper is computed HERE and stored, not rebuilt on the whisper leg.
 * Two reasons: the child leg would have to re-derive state it was never given,
 * and when a school disputes a lead the exact sentence they were played is a
 * row rather than a reconstruction.
 *
 * callerId is deliberately NOT set, so the school sees the STUDENT's number.
 * That loses attribution on any callback the school makes directly — an
 * accepted cost: a school that cannot ring a lead back churns faster than the
 * lost attribution is worth.
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
    console.warn("[voice/connect] unverified Twilio signature — continuing");
  }

  const origin = new URL(req.url).origin;
  const transcript = params.SpeechResult || "";
  const callSid = params.CallSid || "";

  const db = createAdminClient();
  const { data } = await (db.from("school_call_routing") as any)
    .select("id, school_type, school_name, greeting_name, destination_number, main_number, voice_match_phrases, department_labels")
    .eq("status", "active");

  const routes: SchoolRoute[] = (data || []).map((r: any) => ({
    id: r.id,
    schoolType: r.school_type,
    schoolName: r.school_name,
    greetingName: r.greeting_name,
    destinationNumber: r.destination_number,
    mainNumber: r.main_number,
    voiceMatchPhrases: r.voice_match_phrases || [],
    departmentLabels: r.department_labels || {},
  }));

  const match = matchSchool(transcript, routes);
  const intent = classifyIntent(transcript);

  // Nothing matched. Do not guess a school and do not hang up on someone who
  // rang a number we advertised — say so plainly and let them try again.
  if (!match.route) {
    return twiml(
      `<Response>` +
        `<Gather input="speech" speechTimeout="auto" actionOnEmptyResult="true" ` +
          `action="${escapeXml(`${origin}/api/voice/connect`)}" method="POST">` +
          `<Say voice="Polly.Joanna">Sorry, I did not catch which school. Please say the school name.</Say>` +
        `</Gather>` +
        `<Say voice="Polly.Joanna">Sorry, I could not connect you. Please try again.</Say>` +
      `</Response>`,
    );
  }

  const whisper = buildWhisper(match.route, intent);

  // Recorded BEFORE the bridge so a call that drops mid-connect still leaves a
  // trace. /status fills in duration and billability when the leg ends.
  try {
    await (db.from("school_calls") as any).upsert(
      {
        routing_id: match.route.id,
        provider_call_id: callSid,
        from_number: params.From || null,
        to_number: params.To || null,
        routed_to: match.route.destinationNumber,
        school_matched_by: match.matchedBy,
        department_intent: intent,
        intent_captured: transcript.slice(0, 500),
        whisper_text: whisper,
        source_context: { matched_phrase: match.matchedPhrase, speech_confidence: params.Confidence ?? null },
        started_at: new Date().toISOString(),
      },
      { onConflict: "provider_call_id" },
    );
  } catch (e) {
    // Never fail a live call over a logging problem.
    console.error("[voice/connect] could not record call", e);
  }

  const whisperUrl = `${origin}/api/voice/whisper?c=${encodeURIComponent(callSid)}`;
  return twiml(
    `<Response>` +
      `<Dial answerOnBridge="true" timeout="25">` +
        `<Number url="${escapeXml(whisperUrl)}">${escapeXml(match.route.destinationNumber)}</Number>` +
      `</Dial>` +
    `</Response>`,
  );
}
