/**
 * What the voice agent says, and when it is allowed to say it.
 *
 * PURE — no Twilio, no database. The two things most likely to be wrong here
 * are the calling window and the wording of an automated call to a business,
 * and neither should need a phone call to test.
 */

/**
 * The calling window, in US Central, as [openHour, closeHour) on a 24h clock.
 *
 * CENTRAL BECAUSE THE DIRECTORY IS TEXAS-FIRST, and 11–18 Central rather than
 * 9–17 because it has to be defensible in every continental timezone at once:
 * it is 09:00–16:00 Pacific and 12:00–19:00 Eastern. A 9am Central call is 7am
 * in California, which is how an automated call gets a number blocked.
 *
 * Narrower than strictly necessary in Texas, on purpose. Calling a shop an hour
 * late costs nothing; calling one at seven in the morning costs the number.
 */
export const CALL_WINDOW_CENTRAL: [number, number] = [11, 18];

/** No Sunday calls, and no Monday calls — most barbershops are shut. */
export const CALL_DAYS = [2, 3, 4, 5, 6] as const; // Tue–Sat, 0 = Sunday

/** Two attempts, then it is a human's problem. */
export const MAX_ATTEMPTS = 2;

/** Four hours between attempts — a second call ten minutes later is a nuisance. */
export const RETRY_AFTER_MS = 4 * 60 * 60 * 1000;

/**
 * Is now inside the window?
 *
 * Central time is derived with Intl rather than a fixed UTC offset, so it
 * follows daylight saving without a table to maintain. A hardcoded -6 would be
 * an hour wrong for eight months of the year — and an hour wrong at the edge of
 * this window is a 10am call.
 */
export function withinCallWindow(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  const [open, close] = CALL_WINDOW_CENTRAL;
  return (CALL_DAYS as readonly number[]).includes(dayIndex) && hour >= open && hour < close;
}

export interface VoiceScriptInput {
  shopName: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  prettyDate: string;
  requestedTime: string;
}

/**
 * Read a phone number so a person can write it down.
 *
 * "seven seven zero, two eight zero, five seven one one" rather than
 * "7702805711", which a TTS engine reads as "seven billion, seven hundred and
 * two million…". The number is the single most important thing in the call and
 * the one most likely to be mangled.
 */
export function spokenPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return digits.split("").join(" ");
  return `${digits.slice(0, 3).split("").join(" ")}, ${digits.slice(3, 6).split("").join(" ")}, ${digits
    .slice(6)
    .split("")
    .join(" ")}`;
}

/**
 * The script.
 *
 * WRITTEN FOR AN ANSWERING MACHINE FIRST. Most of these calls will reach one,
 * and that is fine — a clear message with a name, a number and a time is fully
 * actionable, arguably more so than a text nobody opens. Anything that depends
 * on a person being on the line (press 1, say yes) would make the common case
 * the broken one.
 *
 * IT IDENTIFIES ITSELF IMMEDIATELY and offers a way out. An automated call to a
 * business about a customer who asked for that business is safe ground, but it
 * is still an automated call, and "who is this" has to be answered in the first
 * sentence or the rest is not heard.
 *
 * THE NUMBER IS SAID TWICE, at the natural points a listener reaches for a pen:
 * once in the detail, once at the end.
 */
export function bookingVoiceScript(i: VoiceScriptInput): string[] {
  const phone = spokenPhone(i.customerPhone);
  return [
    `Hello, this is ShearQuery calling for ${i.shopName}.`,
    `A customer requested an appointment with you, and we could not reach you by text message.`,
    `${i.customerName || "A customer"} asked for ${i.serviceName}, on ${i.prettyDate}, at ${i.requestedTime}.`,
    `Their phone number is ${phone}.`,
    `This is a request, not a confirmed booking. Please call them back to confirm the time.`,
    `Once more, that number is ${phone}.`,
    `To stop these calls, reply STOP to any ShearQuery text, or visit shear query dot com. Thank you.`,
  ];
}

function escapeXml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * TwiML for the call.
 *
 * A pause before the first word, deliberately: on a real answer the first
 * half-second is the person saying "hello", and on a machine it is the tail of
 * the greeting. Speaking into either loses the sentence that says who we are.
 */
export function bookingVoiceTwiml(lines: string[]): string {
  const speech = lines
    .map((l) => `  <Say voice="Polly.Joanna">${escapeXml(l)}</Say>\n  <Pause length="1"/>`)
    .join("\n");
  /*
   * NO <?xml?> DECLARATION HERE. lib/twiml.ts prepends one, and a document with
   * two prologs is malformed — which Twilio surfaces as a generic "application
   * error" on the call rather than a parse error, so the symptom is dead air on
   * an answered call and nothing useful in any log. That helper's own comment
   * warns about this class of failure; this is it.
   */
  return `<Response>
  <Pause length="1"/>
${speech}
  <Hangup/>
</Response>`;
}
