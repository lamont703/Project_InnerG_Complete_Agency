/**
 * The shape of an email/SMS conversation, as the providers actually report it.
 *
 * MODELLED ON THE WEBHOOKS RATHER THAN ON A CHAT APP, because the difference
 * decides the UI. A chat app has "sent". Twilio and Mailgun both hand back a
 * status that keeps changing after you let go of it — queued, then sent, then
 * delivered or failed, minutes apart — so a message is a row that mutates, not
 * an event that happened. Every list here has to be able to redraw a message it
 * already drew.
 *
 * CONSENT IS PART OF THE CONTACT, NOT A SETTING SOMEWHERE ELSE. A person can be
 * reachable by email and unreachable by SMS at the same time, and the composer
 * has to know that before it will let you type. Anything that treats "has a
 * phone number" as "may be texted" is one STOP reply away from being the thing
 * that gets the sending number shut off.
 */

export type Channel = "sms" | "email";
export type Direction = "inbound" | "outbound";

/** Twilio and Mailgun terminal states, normalised to one vocabulary. */
export type DeliveryStatus =
  | "queued"        // accepted by us, not yet handed to the provider
  | "sent"          // provider accepted it
  | "delivered"     // carrier / mailbox confirmed
  | "opened"        // email only; Mailgun open tracking
  | "failed"        // provider rejected it
  | "undelivered";  // provider accepted, carrier/mailbox refused

export type ConsentStatus = "opted_in" | "opted_out" | "unknown";

export interface Message {
  id: string;
  channel: Channel;
  direction: Direction;
  /** Email only. SMS has no subject and the composer must not offer one. */
  subject?: string;
  body: string;
  at: string;                 // ISO 8601
  status: DeliveryStatus;
  /** Present on failed / undelivered. Providers give a code and a sentence. */
  failureCode?: string;
  failureReason?: string;
  /** Which provider this went through. Prototype: nothing is really sent. */
  provider?: "twilio" | "mailgun";
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  tags: string[];
  smsConsent: ConsentStatus;
  emailConsent: ConsentStatus;
  /** Why the consent is what it is — shown in the panel so it is auditable. */
  consentNote?: string;
}

export interface Thread {
  id: string;
  contact: Contact;
  messages: Message[];
  unread: number;
  assignedTo?: string;
}

/* ------------------------------------------------------------------ */

/**
 * How many SMS segments a body costs, and therefore what Twilio bills.
 *
 * THIS IS NOT length/160. Two things break that:
 *
 *   1. A single character outside GSM-7 — a curly apostrophe pasted from a
 *      document, an emoji, an accented name — switches the whole message to
 *      UCS-2 and the limit drops from 160 to 70. One smart quote can turn a
 *      one-segment message into three.
 *   2. Concatenation costs space. Multipart messages carry a header, so the
 *      per-segment budget falls to 153 (GSM-7) or 67 (UCS-2) — a 161-character
 *      message is two segments of 153, not 160 + 1.
 *
 * A few GSM-7 characters are themselves escape sequences and count as two.
 * They are the ones people actually type, which is why they are handled rather
 * than rounded away: square brackets, braces, backslash, tilde, caret and the
 * euro sign.
 */
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

export interface SegmentInfo {
  segments: number;
  /** Characters used, counting escaped GSM-7 characters as two. */
  used: number;
  /** Characters still available before another segment is charged. */
  remaining: number;
  encoding: "GSM-7" | "UCS-2";
  /** The character that forced UCS-2, if one did. Worth surfacing. */
  forcedBy?: string;
}

export function smsSegments(body: string): SegmentInfo {
  let used = 0;
  let forcedBy: string | undefined;

  for (const ch of body) {
    if (GSM7_EXTENDED.includes(ch)) used += 2;
    else if (GSM7.includes(ch)) used += 1;
    else {
      // Any single one of these drops the whole message to UCS-2.
      forcedBy ??= ch;
      used += 1;
    }
  }

  const unicode = forcedBy !== undefined;
  if (unicode) {
    // UCS-2 counts UTF-16 code units, so an emoji outside the BMP costs two.
    used = [...body].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  }

  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;

  if (used === 0) return { segments: 0, used: 0, remaining: single, encoding: "GSM-7" };

  const segments = used <= single ? 1 : Math.ceil(used / multi);
  const capacity = segments === 1 ? single : segments * multi;

  return {
    segments,
    used,
    remaining: capacity - used,
    encoding: unicode ? "UCS-2" : "GSM-7",
    forcedBy,
  };
}

/** Whether this channel may be used for this contact at all. */
export function canSend(contact: Contact, channel: Channel): { ok: boolean; reason?: string } {
  if (channel === "sms") {
    if (!contact.phone) return { ok: false, reason: "No phone number on file." };
    if (contact.smsConsent === "opted_out")
      return { ok: false, reason: "This contact replied STOP. Texting them again is a violation." };
    if (contact.smsConsent === "unknown")
      return { ok: false, reason: "No recorded SMS consent. Get consent before the first text." };
    return { ok: true };
  }
  if (!contact.email) return { ok: false, reason: "No email address on file." };
  if (contact.emailConsent === "opted_out")
    return { ok: false, reason: "This contact unsubscribed. Only transactional mail is allowed." };
  return { ok: true };
}
