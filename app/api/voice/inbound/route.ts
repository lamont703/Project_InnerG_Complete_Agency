import type { NextRequest } from "next/server";
import { twiml, escapeXml } from "@/lib/twiml";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";
import { loadRoutes } from "@/lib/voice/load-routes";
import { resolveSchoolByDialedNumber } from "@/lib/voice/routing";

/**
 * The call answers here.
 *
 * WHICH SCHOOL IS ANSWERED BY THE NUMBER THEY DIALLED, not by asking. Each
 * school page publishes that school's own number, so by the time the phone
 * rings the school is already known and the one question left is which
 * department. A caller who has just read a school's page and is then asked
 * "which school?" has been made to repeat themselves by a machine.
 *
 * The shared number still works and still asks, because a school without a
 * number of its own must not simply fail.
 *
 * SIGNATURE FAILURE IS ADVISORY HERE. This route writes nothing, so rejecting
 * would drop a live call to protect data that does not exist. /completed and
 * /status, which write the rows invoices are built from, reject.
 */
export const dynamic = "force-dynamic";

const DEPARTMENT_HINTS =
  "admissions, enroll, enrollment, apply, tour, financial aid, fafsa, tuition, cost, grant, loan, " +
  "student services, schedule, transcript, class, current student";

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

  const routes = await loadRoutes(createAdminClient()).catch(() => []);
  const school = resolveSchoolByDialedNumber(params.To, routes);

  const prompt = school
    ? `Thanks for calling ${school.greetingName}. Are you calling about admissions, financial aid, or something for current students?`
    : `Thanks for calling. Which school are you trying to reach, and what is it regarding?`;

  // Only offer school names as hints when the school is still unknown. Feeding
  // the recogniser a list of schools it does not need makes it likelier to hear
  // one in a sentence that only mentions a department.
  const hints = school
    ? DEPARTMENT_HINTS
    : [...routes.flatMap((r) => r.voiceMatchPhrases), DEPARTMENT_HINTS].join(", ");

  const action = `${new URL(req.url).origin}/api/voice/connect`;
  return twiml(
    `<Response>` +
      `<Gather input="speech" speechTimeout="auto" language="en-US" ` +
        `actionOnEmptyResult="true" action="${escapeXml(action)}" method="POST" ` +
        `hints="${escapeXml(hints.slice(0, 2000))}">` +
        `<Say voice="Polly.Joanna">${escapeXml(prompt)}</Say>` +
      `</Gather>` +
    `</Response>`,
  );
}
