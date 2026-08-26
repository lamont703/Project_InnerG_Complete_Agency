import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { loadRoutes } from "@/lib/voice/load-routes";
import {
  buildWhisper, classifyIntent, confirmationLine, matchSchool,
  resolveSchoolByDialedNumber, type MatchConfidence,
} from "@/lib/voice/routing";

/**
 * Decide, say it out loud, record, bridge.
 *
 * ONE RETRY, THEN PROCEED. The first version re-prompted whenever it was
 * unsure, and a live call spent seventy-one seconds in that loop before the
 * caller gave up — the caller heard "sorry, I didn't catch that" repeatedly and
 * concluded the line was broken. A caller who cannot be understood twice is
 * better served by a human at the front desk than by a third attempt, so the
 * retry is counted in the query string and the second pass always connects.
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

  const url = new URL(req.url);
  const origin = url.origin;
  const retried = url.searchParams.get("r") === "1";
  const transcript = params.SpeechResult || "";
  const callSid = params.CallSid || "";

  const db = createAdminClient();
  const routes = await loadRoutes(db).catch(() => []);

  // The dialled number wins over anything spoken: it is a fact, not a guess.
  const dialed = resolveSchoolByDialedNumber(params.To, routes);
  const spoken = dialed ? null : matchSchool(transcript, routes);
  const route = dialed || spoken?.route || null;
  const matchedBy: MatchConfidence = dialed ? "confident" : (spoken?.matchedBy ?? "fallback");
  const intent = classifyIntent(transcript);

  const record = async (extra: Record<string, unknown>) => {
    try {
      await (db.from("school_calls") as any).upsert(
        {
          provider_call_id: callSid,
          from_number: params.From || null,
          to_number: params.To || null,
          intent_captured: transcript.slice(0, 500) || "(no speech recognised)",
          started_at: new Date().toISOString(),
          ...extra,
        },
        { onConflict: "provider_call_id" },
      );
    } catch (e) {
      console.error("[voice/connect] could not record", e);
    }
  };

  // No school at all, on the shared number. Ask once more, then give up
  // honestly rather than looping.
  if (!route) {
    await record({
      routing_id: null,
      school_matched_by: "fallback",
      department_intent: intent,
      source_context: { unmatched: true, retried, heard_anything: Boolean(transcript.trim()) },
    });
    if (retried) {
      return twiml(
        `<Response><Say voice="Polly.Joanna">Sorry, I could not connect you. Please try again, or use the phone number on the school's page.</Say><Hangup/></Response>`,
      );
    }
    return twiml(
      `<Response>` +
        `<Gather input="speech" speechTimeout="auto" actionOnEmptyResult="true" ` +
          `action="${escapeXml(`${origin}/api/voice/connect?r=1`)}" method="POST">` +
          `<Say voice="Polly.Joanna">Sorry, I did not catch that. Which school are you calling?</Say>` +
        `</Gather>` +
        `<Say voice="Polly.Joanna">Sorry, I could not connect you.</Say><Hangup/>` +
      `</Response>`,
    );
  }

  // School known, department not. Worth one clarifying question, because the
  // department is the entire value of the whisper — but only one.
  if (!intent && !retried) {
    return twiml(
      `<Response>` +
        `<Gather input="speech" speechTimeout="auto" actionOnEmptyResult="true" ` +
          `action="${escapeXml(`${origin}/api/voice/connect?r=1`)}" method="POST">` +
          `<Say voice="Polly.Joanna">Sure. Is that admissions, financial aid, or something for current students?</Say>` +
        `</Gather>` +
      `</Response>`,
    );
  }

  const whisper = buildWhisper(route, intent);
  await record({
    routing_id: route.id,
    school_matched_by: matchedBy,
    department_intent: intent,
    confirmed_department: intent ? (route.departmentLabels?.[intent] || intent) : null,
    routed_to: route.destinationNumber,
    whisper_text: whisper,
    source_context: {
      resolved_by: dialed ? "dialed_number" : "speech",
      matched_phrase: spoken?.matchedPhrase ?? null,
      speech_confidence: params.Confidence ?? null,
      retried,
    },
  });

  // Said aloud before the ring: a caller told where they are going will wait
  // through it, and one who is not assumes the call dropped.
  const dialAction = `${origin}/api/voice/completed`;
  const whisperUrl = `${origin}/api/voice/whisper?c=${encodeURIComponent(callSid)}`;
  return twiml(
    `<Response>` +
      `<Say voice="Polly.Joanna">${escapeXml(confirmationLine(route, intent))}</Say>` +
      `<Dial answerOnBridge="true" timeout="25" action="${escapeXml(dialAction)}" method="POST">` +
        `<Number url="${escapeXml(whisperUrl)}">${escapeXml(route.destinationNumber)}</Number>` +
      `</Dial>` +
    `</Response>`,
  );
}
