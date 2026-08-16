/**
 * Reading a business's text message back.
 *
 * WHY THIS IS THE FIRST OF THE THREE PIECES. Four requests went out, one
 * business replied, and it replied to a TEXT — after a human chased it. Asking
 * that same business to register, verify ownership and sign in is strictly more
 * friction than the channel it is already ignoring. A dashboard is the right
 * home for an owner who cares; a reply of "Y" is the only thing that will ever
 * work for the rest.
 *
 * THE TRAP THIS FILE EXISTS FOR. "No problem" means YES. So does "no worries"
 * and "yeah no problem". A naive scan for "no" marks a confirmed appointment as
 * declined and emails the customer that nobody is coming — a false negative
 * that actively destroys a booking that had succeeded. That is far worse than
 * failing to understand, which costs nothing but a follow-up. So:
 *
 *   AMBIGUITY RESOLVES TO "unclear", NEVER TO A GUESS. If a message carries
 *   both signals, or neither, the status does not move. Nothing is lost — the
 *   request stays open, the escalation job still runs, and a human can read it.
 *
 * OPT-OUT OUTRANKS EVERYTHING. "STOP" is a carrier-level command, not an answer
 * about an appointment. Treating it as a decline would both mis-record the
 * booking and ignore a legal request to stop messaging.
 *
 * Pure and exhaustively tested, because the input is free text written by a
 * stranger on a phone and the output changes what a customer is told.
 */

export type ReplyIntent = "accept" | "decline" | "optout" | "unclear";

/**
 * How long after we text a business its reply is still assumed to be ABOUT
 * that booking.
 *
 * WHY A WINDOW AT ALL. This number holds more than one conversation. The same
 * business is texted by app/api/bookings (a new request), the escalation cron
 * (a reminder), app/api/account/verify-listing (a claim code) and
 * scripts/trigger_sms_barber_agent (outreach). A message arriving three weeks
 * after a booking notification is almost certainly about something else, and
 * treating it as an answer would move a real appointment on the strength of an
 * unrelated sentence.
 *
 * Seven days is generous against the fact that requests are usually for the
 * next day or two — a business that has not answered in a week is not about to.
 */
export const REPLY_WINDOW_DAYS = 7;

/** True when we texted this business about the booking recently enough. */
export function withinReplyWindow(lastContactIso: string | null, now: Date): boolean {
  if (!lastContactIso) return false;
  const age = now.getTime() - new Date(lastContactIso).getTime();
  if (Number.isNaN(age) || age < 0) return false;
  return age <= REPLY_WINDOW_DAYS * 24 * 3600_000;
}

/**
 * Carrier opt-out keywords. Checked first and in isolation — these are commands
 * to the messaging system, not answers.
 */
const OPT_OUT = /\b(stop|stopall|unsubscribe|cancel all|end|quit|optout|opt out)\b/i;

/**
 * Phrases that contain a negative word but mean the opposite.
 *
 * These do double duty and both halves matter. They are stripped before decline
 * matching so the "no" inside them is never counted as a refusal — AND they
 * count as an acceptance in their own right, because "No problem" on its own is
 * a yes. Stripping alone would leave an empty string and an "unclear", which
 * would quietly fail to record a booking the business had just agreed to.
 *
 * No `g` flag: RegExp.test is stateful with it, so a shared global regex
 * returns alternating results across calls. Stripping compiles a global copy.
 */
const FALSE_NEGATIVES = [
  /\bno problem\b/i,
  /\bno worries\b/i,
  /\bno issues?\b/i,
  /\bnot a problem\b/i,
  /\bno prob\b/i,
];

const ACCEPT = [
  /\by\b/i,
  /\byes\b/i,
  /\byep\b/i,
  /\byeah\b/i,
  /\byup\b/i,
  /\bsure\b/i,
  /\bok(ay)?\b/i,
  /\bconfirm(ed|ing)?\b/i,
  /\bbook (them|it|her|him)\b/i,
  // Negative lookahead is load-bearing: \bi can\b matches inside "I can't",
  // because the apostrophe is a word boundary. Without it the clearest
  // possible refusal reads as an acceptance.
  /\bwe can(?!'?t)\b/i,
  /\bi can(?!'?t)\b/i,
  /\bthat works\b/i,
  /\bsee (them|her|him)\b/i,
  /\bgot (it|them)\b/i,
  /\bcome on in\b/i,
];

/**
 * Marks of a conditional or a question. A hedged message is NOT an answer, and
 * it forces "unclear" whatever keywords it also contains.
 *
 * "Yes but not at 9" carries a yes and a condition; acting on the yes tells a
 * customer their 9am is confirmed when the business just said it isn't.
 * "Sure, what time?" is a question, not a confirmation. Both cost only a
 * follow-up when treated as unclear, and cost a real appointment when guessed.
 */
const HEDGE = [
  /\bbut\b/i,
  /\bhowever\b/i,
  /\bthough\b/i,
  /\bnot sure\b/i,
  /\bunsure\b/i,
  /\bmaybe\b/i,
  /\bdepends\b/i,
  /\?/,
];

const DECLINE = [
  /\bn\b/i,
  /\bno\b/i,
  /\bnope\b/i,
  /\bcan'?t\b/i,
  /\bcannot\b/i,
  /\bunable\b/i,
  /\bunavailable\b/i,
  /\bnot available\b/i,
  /\bbooked (up|solid)\b/i,
  /\bfully booked\b/i,
  /\bno (openings?|availability|slots?)\b/i,
  /\bclosed\b/i,
  /\bday off\b/i,
  /\bdecline\b/i,
  /\bwe'?re full\b/i,
];

/**
 * The business's reply, as an intent.
 *
 * Returns "unclear" for anything carrying both signals or neither — including
 * an empty message, which is what an MMS with only a photo looks like.
 */
export function parseReply(raw: string): ReplyIntent {
  const text = String(raw ?? "").trim();
  if (!text) return "unclear";

  // First and alone. A message that says "stop" is not answering the question.
  if (OPT_OUT.test(text)) return "optout";

  // "No problem" is itself a yes, so record that before stripping it — and
  // strip it so its "no" is never read as a refusal.
  const softAccept = FALSE_NEGATIVES.some((re) => re.test(text));
  let scrubbed = text;
  for (const re of FALSE_NEGATIVES) scrubbed = scrubbed.replace(new RegExp(re.source, "gi"), " ");

  // A conditional or a question is not an answer, however clear its keywords.
  if (HEDGE.some((re) => re.test(scrubbed))) return "unclear";

  const accepts = softAccept || ACCEPT.some((re) => re.test(scrubbed));
  const declines = DECLINE.some((re) => re.test(scrubbed));

  // Both, or neither. Do not guess — see the header.
  if (accepts === declines) return "unclear";
  return accepts ? "accept" : "decline";
}

/**
 * Whether an unparseable message was even TRYING to answer us.
 *
 * WHY SILENCE IS OFTEN THE RIGHT REPLY. "unclear" covers two very different
 * messages: a genuine but ambiguous answer ("yes but not at 9"), and something
 * with nothing to do with the booking ("hey do you know what the booth rent is
 * at the shop on Westheimer?"). Both parse the same, and firing the
 * clarification prompt at the second one is a non-sequitur that names a
 * customer and a date into a conversation that was about something else.
 *
 * The heuristic is length plus keywords, and it is deliberately crude: a short
 * message to us is probably an answer, and anything containing a yes/no word is
 * probably an attempt at one. Everything else gets recorded and no reply. The
 * cost of being wrong here is a business waiting a bit longer for the
 * escalation nudge, not a wrong appointment.
 */
const ANSWER_ATTEMPT_MAX_CHARS = 40;

export function looksLikeAnswerAttempt(raw: string): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return false;
  if (text.length <= ANSWER_ATTEMPT_MAX_CHARS) return true;
  return ACCEPT.some((re) => re.test(text)) || DECLINE.some((re) => re.test(text));
}

/** The status an intent moves a request to, or null to leave it alone. */
export function statusForIntent(intent: ReplyIntent): "booked" | "declined" | null {
  if (intent === "accept") return "booked";
  if (intent === "decline") return "declined";
  return null;
}

/**
 * What we text back.
 *
 * ALWAYS ECHOES WHICH REQUEST MOVED. A business sitting on two open requests
 * that replies "Y" has not said which one it means; we apply it to the most
 * recent, because that is the message they were looking at, and then name the
 * customer and slot so a wrong guess is visible and correctable in one glance.
 * Silently picking one and saying "thanks" would bury the error.
 */
export function replyAcknowledgement(
  intent: ReplyIntent,
  ctx: { customerName: string | null; date: string; time: string; othersOpen: number }
): string | null {
  const who = ctx.customerName || "the customer";
  const when = `${ctx.date} at ${ctx.time}`;
  const more =
    ctx.othersOpen > 0
      ? ` You have ${ctx.othersOpen} other request${ctx.othersOpen === 1 ? "" : "s"} open.`
      : "";

  switch (intent) {
    case "accept":
      return `Got it — ${who}, ${when} marked as booked. Please call them to confirm the details.${more}`;
    case "decline":
      return `Thanks for letting us know — ${who}, ${when} marked as declined, and we'll tell them.${more}`;
    case "optout":
      // Nothing. The carrier handles STOP, and a reply to it would be another
      // message to someone who just asked for none.
      return null;
    case "unclear":
      return `Sorry — we couldn't tell if that was a yes or a no for ${who}, ${when}. Reply Y to confirm or N if you can't take it.`;
  }
}
