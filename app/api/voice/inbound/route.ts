import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";

/**
 * The one number answers here.
 *
 * Asks a single question and hands the transcript to /connect. One question,
 * not three: every exchange is latency the caller hears, and the only thing we
 * cannot infer is which school they want.
 *
 * SIGNATURE FAILURE IS ADVISORY ON THIS ROUTE. It writes nothing and bills
 * nothing, so a false negative here would drop a live call to protect data that
 * does not exist. /status, which writes the rows invoices are built from,
 * rejects instead.
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
    console.warn("[voice/inbound] unverified Twilio signature — answering anyway");
  }

  // Hints materially improve recognition of proper nouns, and the list stays
  // short because we only route for schools that pay.
  let hints = "";
  try {
    const db = createAdminClient();
    const { data } = await (db.from("school_call_routing") as any)
      .select("voice_match_phrases")
      .eq("status", "active");
    hints = (data || [])
      .flatMap((r: any) => r.voice_match_phrases || [])
      .slice(0, 100)
      .join(", ");
  } catch {
    // A hint list is an optimisation. Losing it degrades accuracy, not service.
  }

  const action = `${new URL(req.url).origin}/api/voice/connect`;
  return twiml(
    `<Response>` +
      `<Gather input="speech" speechTimeout="auto" language="en-US" ` +
        `actionOnEmptyResult="true" action="${escapeXml(action)}" method="POST"` +
        (hints ? ` hints="${escapeXml(hints)}"` : "") + `>` +
        `<Say voice="Polly.Joanna">Thanks for calling. Which school are you trying to reach, and what is it regarding?</Say>` +
      `</Gather>` +
    `</Response>`,
  );
}
