import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams } from "@/lib/voice/signature";

/**
 * The student picked up. Now ring the school.
 *
 * No question is asked because there is nothing left to ask: the school and the
 * department were decided on the web page before the phone ever rang.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const params = await formParams(req).catch(() => ({}) as Record<string, string>);
  const callSid = params.CallSid || "";
  const origin = new URL(req.url).origin;

  let destination: string | null = null;
  let greeting = "the school";
  try {
    const db = createAdminClient();
    const { data } = await (db.from("school_calls") as any)
      .select("routed_to, school_call_routing(greeting_name)")
      .eq("provider_call_id", callSid)
      .maybeSingle();
    destination = data?.routed_to ?? null;
    greeting = data?.school_call_routing?.greeting_name || greeting;
  } catch (e) {
    console.error("[voice/callback-connect] lookup failed", e);
  }

  if (!destination) {
    return twiml(
      `<Response><Say voice="Polly.Joanna">Sorry, we could not complete this connection. Please try again from the school's page.</Say><Hangup/></Response>`,
    );
  }

  return twiml(
    `<Response>` +
      `<Say voice="Polly.Joanna">${escapeXml(`Connecting you to ${greeting} now.`)}</Say>` +
      `<Dial answerOnBridge="true" timeout="25" action="${escapeXml(`${origin}/api/voice/completed`)}" method="POST">` +
        `<Number url="${escapeXml(`${origin}/api/voice/whisper?c=${encodeURIComponent(callSid)}`)}">${escapeXml(destination)}</Number>` +
      `</Dial>` +
    `</Response>`,
  );
}
