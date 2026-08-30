/**
 * What the voice agent says, and when it is allowed to say it.
 *
 * PURE — no Twilio, no database. The two things most likely to be wrong here
 * are the calling window and the wording of an automated call to a business,
 * and neither should need a phone call to test.
 */

/**
 * The calling window, in US EASTERN, as [openHour, closeHour) on a 24h clock.
 *
 * 10:00–19:00 Eastern, every day, set by the site owner.
 *
 * Worth knowing rather than arguing about: 10am Eastern is 7am Pacific, so a
 * West Coast shop can be called early in its morning. Texas — the directory's
 * centre of gravity — sees 09:00–18:00, which is squarely reasonable.
 */
export const CALL_WINDOW_EASTERN: [number, number] = [10, 19];

/** Every day. Barbershops keep their own hours and plenty trade on Sunday. */
export const CALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Two attempts, then it is a human's problem. */
export const MAX_ATTEMPTS = 2;

/** Four hours between attempts — a second call ten minutes later is a nuisance. */
export const RETRY_AFTER_MS = 4 * 60 * 60 * 1000;

/**
 * Is now inside the window?
 *
 * Eastern is derived with Intl rather than a fixed UTC offset, so it follows
 * daylight saving without a table to maintain. A hardcoded -5 would be an hour
 * wrong for eight months of the year — and an hour wrong at the open edge is a
 * 9am call.
 */
export function withinCallWindow(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  const [open, close] = CALL_WINDOW_EASTERN;
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
export function bookingVoiceScript(
  i: VoiceScriptInput,
  opts: { offerKeypad?: boolean } = {}
): string[] {
  const phone = spokenPhone(i.customerPhone);
  return [
    `Hello, this is ShearQuery calling for ${i.shopName}.`,
    `A customer requested an appointment with you, and we could not reach you by text message.`,
    `${i.customerName || "A customer"} asked for ${i.serviceName}, on ${i.prettyDate}, at ${i.requestedTime}.`,
    `Their phone number is ${phone}.`,
    `This is a request, not a confirmed booking. Please call them back to confirm the time.`,
    /*
     * THE KEYPAD PROMPT SITS IN THE MIDDLE, not at the end. A person who has
     * decided presses immediately, and everything after this is for somebody
     * who has not — so the callback number is repeated AFTER it rather than
     * before, and the opt-out stays last where it belongs.
     *
     * On voicemail nobody presses anything and this reads as a harmless
     * instruction. That is the right trade: the message still works, and the
     * one case where a person is on the line stops being a dead end.
     */
    ...(opts.offerKeypad
      ? [`If you can take this appointment, press 1. If you cannot, press 2.`]
      : []),
    `Once more, that number is ${phone}.`,
    `To stop these calls, reply STOP to any ShearQuery text, or visit shear query dot com. Thank you.`,
  ];
}

/**
 * Voices <Say> is allowed to use.
 *
 * A WHITELIST, not a free string, even though a voice name is a rendering
 * choice rather than content. The TwiML endpoint reads this from the query
 * string so a voice can be A/B tested with a phone call instead of a deploy —
 * and anything reachable from a URL that reaches Twilio gets validated, on
 * principle, before it is worth arguing about whether this particular value
 * could do harm.
 *
 * An unknown name is not an error Twilio reports usefully: it falls back to a
 * default or throws an application error mid-call, and the symptom is a voice
 * you did not choose or dead air.
 */
export const ALLOWED_VOICES = [
  "Polly.Joanna",
  "Polly.Joanna-Neural",
  "Polly.Danielle-Neural",
  "Polly.Ruth-Neural",
  "Polly.Matthew-Neural",
  "Polly.Stephen-Neural",
] as const;

export type AllowedVoice = (typeof ALLOWED_VOICES)[number];

/**
 * The default stays the standard voice until a neural one has been heard on a
 * real call. Making an unverified voice the default risks every call at once;
 * testing it through the parameter risks one.
 */
export const DEFAULT_VOICE: AllowedVoice = "Polly.Joanna";

export function resolveVoice(raw: string | null | undefined): AllowedVoice {
  const hit = (ALLOWED_VOICES as readonly string[]).find((v) => v === raw);
  return (hit as AllowedVoice) ?? DEFAULT_VOICE;
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
/**
 * @param gatherUrl When set, the whole message is wrapped in a <Gather> so a
 *   digit can be pressed AT ANY POINT during it, not only at the end. Somebody
 *   who already knows their diary should not have to sit through the opt-out
 *   line to answer.
 *
 *   On voicemail no digit ever arrives, the Gather times out, and the call
 *   falls through to Hangup — so the message is left exactly as before. The
 *   only cost is the timeout's silence on the recording, which is why it is
 *   short.
 */
export function bookingVoiceTwiml(
  lines: string[],
  voice: AllowedVoice = DEFAULT_VOICE,
  gatherUrl?: string
): string {
  const speech = lines
    .map((l) => `  <Say voice="${voice}">${escapeXml(l)}</Say>\n  <Pause length="1"/>`)
    .join("\n");
  /*
   * NO <?xml?> DECLARATION HERE. lib/twiml.ts prepends one, and a document with
   * two prologs is malformed — which Twilio surfaces as a generic "application
   * error" on the call rather than a parse error, so the symptom is dead air on
   * an answered call and nothing useful in any log. That helper's own comment
   * warns about this class of failure; this is it.
   */
  if (gatherUrl) {
    return `<Response>
  <Pause length="1"/>
  <Gather input="dtmf" numDigits="1" timeout="5" action="${escapeXml(gatherUrl)}" method="POST">
${speech}
  </Gather>
  <Hangup/>
</Response>`;
  }

  return `<Response>
  <Pause length="1"/>
${speech}
  <Hangup/>
</Response>`;
}
