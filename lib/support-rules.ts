/**
 * Support messages, the pure part (lib/support.ts sends them): who gets told,
 * the limits, and the words of the alert email and text. Tested in
 * lib/support-rules.test.ts.
 */

/** Where every support message goes (product owner, 2026-10-01). */
export const SUPPORT_EMAIL = "info@innergcomplete.com";
export const SUPPORT_PHONE = "+17702805711";

export const SUPPORT_TOPICS = ["bug", "account", "billing", "booking", "question", "other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export const TOPIC_LABEL: Record<SupportTopic, string> = {
  bug: "Something's broken", account: "Account", billing: "Billing", booking: "Booking", question: "Question", other: "Other",
};

export const MESSAGE_MAX = 4000;
/** Per member per rolling day — enough for a real problem, not enough to flood a phone. */
export const DAILY_LIMIT = 5;

export function cleanTopic(t: unknown): SupportTopic {
  const s = String(t ?? "").trim().toLowerCase();
  return (SUPPORT_TOPICS as readonly string[]).includes(s) ? (s as SupportTopic) : "other";
}

export function cleanMessage(m: unknown): { ok: true; message: string } | { ok: false; error: string } {
  const s = String(m ?? "").replace(/\r\n/g, "\n").trim();
  if (s.length < 5) return { ok: false, error: "Write what you need help with — a sentence or two is fine." };
  if (s.length > MESSAGE_MAX) return { ok: false, error: `That's too long for one message (${MESSAGE_MAX} characters max). Send the main point first.` };
  return { ok: true, message: s };
}

export interface SupportAlertInput {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  audience: string | null;
  topic: SupportTopic;
  message: string;
  door: "claude" | "site";
}

const DOOR_LABEL = { claude: "their Claude", site: "the /search chat" } as const;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const who = (i: SupportAlertInput) => i.name?.trim() || i.email || "A member";

export function supportEmail(i: SupportAlertInput): { subject: string; html: string } {
  const firstLine = i.message.split("\n")[0].slice(0, 70);
  return {
    subject: `ShearQuery support — ${TOPIC_LABEL[i.topic]}: ${firstLine}`,
    html: [
      `<p><strong>${esc(who(i))}</strong>${i.audience ? ` (${esc(i.audience)})` : ""} sent a support message from ${DOOR_LABEL[i.door]}.</p>`,
      `<p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px">${esc(i.message)}</p>`,
      `<p>Topic: ${TOPIC_LABEL[i.topic]}<br/>Email: ${i.email ? `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>` : "none on file"}<br/>Phone: ${i.phone ? esc(i.phone) : "none on file"}</p>`,
      `<p style="color:#888;font-size:12px">Message ${i.id.slice(0, 8)} · saved in support_messages</p>`,
    ].join("\n"),
  };
}

/** One text, short enough to read on a lock screen. */
export function supportSms(i: SupportAlertInput): string {
  const body = i.message.replace(/\s+/g, " ");
  const clip = body.length > 140 ? `${body.slice(0, 137)}…` : body;
  return `ShearQuery support (${TOPIC_LABEL[i.topic]}) from ${who(i)}${i.audience ? `, ${i.audience}` : ""}: "${clip}" Reply: ${i.email ?? i.phone ?? "no contact on file"}`;
}
