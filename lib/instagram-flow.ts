import { SITE_URL } from "@/lib/site";

/**
 * THE INSTAGRAM COMMENT → DM FLOW. Pure: every word, every button, and what
 * happens next for each tap or message — tested without Instagram
 * (lib/instagram-flow.test.ts). lib/instagram-flow-runner.ts sends it.
 *
 * Modeled step for step on the ManyChat flow @sabrina_ramonov ran in our DMs
 * on 2026-09-24 (read from our own inbox via the Graph API):
 *   1. comment → public "check your DM" + a private reply with one button
 *   2. tap → "drop your best email" (+ what else they'll get)
 *   3. email → "you're all set, check Promotions" + a three-topic menu
 *   4. topic → one line + link buttons; any topic, any order
 *
 * Ours, decided with the product owner 2026-09-30: the gift is the Claude +
 * ShearQuery kit; the email also brings the weekly LIVE training invite (and
 * says so before they give it); the topics are Learn Claude / LIVE training /
 * Grow my shop; typed messages get a nudge back to the buttons — no AI.
 *
 * Differences from hers, on purpose:
 *  - The first message says "bot". California requires telling people they're
 *    talking to one, and Meta's own guidance asks for it at the start of a
 *    thread (see DISCLOSURE in lib/instagram-dm-policy.ts).
 *  - Links carry ?src=ig_dm so we can see what the flow sends.
 */

export type Stage = "opened" | "awaiting_email" | "done";
export type TopicId = "claude" | "live" | "shop";
export interface FlowState { stage: Stage; email: string | null; topics: TopicId[] }

export type Button = { type: "postback"; title: string; payload: string } | { type: "web_url"; title: string; url: string };

export const PAYLOAD = {
  sendKit: "SQ_SEND_KIT",
  topic: (t: TopicId) => `SQ_TOPIC_${t.toUpperCase()}`,
} as const;

const YOUTUBE = "https://www.youtube.com/@shearqueryai";
const link = (path: string) => `${SITE_URL}${path}${path.includes("?") ? "&" : "?"}src=ig_dm`;

// ── the words ───────────────────────────────────────────────────────────────

/** Public replies under the comment, rotated so the thread doesn't read as a bot wall. */
export const PUBLIC_REPLIES = ["Check your DM 📩", "Just sent it to your DMs 🎁", "Sent! Check your DMs 👀", "It's in your DMs 📩🔥", "Check your inbox 📥"];

export function publicReplyFor(commentId: string): string {
  let h = 0;
  for (const c of commentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PUBLIC_REPLIES[h % PUBLIC_REPLIES.length];
}

export const OPENER = {
  text: "🤖 Hey, it's the ShearQuery bot! I made something for you — it's free. Tap below and I'll send it 👇",
  buttons: [{ type: "postback", title: "SEND IT 🎁", payload: PAYLOAD.sendKit }] as Button[],
  /** If Instagram won't take a button in the private reply: the same offer, one word to type. */
  fallbackText: "🤖 Hey, it's the ShearQuery bot! I made something for you — it's free. Reply SEND and I'll send it 🎁",
};

export const OPT_IN_TEXT =
  "Your free Claude + ShearQuery kit — the exact setup steps, starter prompts and training videos. You'll also get our free weekly invite to the LIVE AI Barber Beauty Business Training, Mondays at 3 PM ET.";

export const ASK_EMAIL = [
  `You got it 🎁 Drop your best email below and I'll send your free Claude + ShearQuery kit — the exact setup steps, starter prompts and training videos to put AI to work in your chair.\n\nYou'll also get our free weekly invite to the LIVE AI Barber Beauty Business Training, Mondays at 3 PM ET 👇`,
  "What's your best email? ✉️",
];

export const NOT_AN_EMAIL = "Hmm, that doesn't look like an email 🤔 What's your best email? ✉️";

export const MENU_BUTTONS: Button[] = [
  { type: "postback", title: "🤖 Learn Claude", payload: PAYLOAD.topic("claude") },
  { type: "postback", title: "🔴 LIVE training", payload: PAYLOAD.topic("live") },
  { type: "postback", title: "💈 Grow my shop", payload: PAYLOAD.topic("shop") },
];

export function allSet(email: string): string {
  return `You're all set! 🚀 Your kit is on its way to ${email}.\n\nIf it's not there, peek in Promotions or Spam and drag it to your main inbox so you never miss one 💛\n\nBtw, what do you want to learn? Tap one and I'll send you our best free resource 👇`;
}

export const WELCOME_BACK = "Welcome back 👋 What do you want to learn? Tap one 👇";

export const TOPICS: Record<TopicId, { text: string; buttons: Button[] }> = {
  claude: {
    text: "Good choice 🤖 Claude + ShearQuery can run your Google profile, your reviews and more — by just asking. Start here 👇",
    buttons: [
      { type: "web_url", title: "SETUP STEPS", url: link("/links#connect") },
      { type: "web_url", title: "WATCH THE TRAINING", url: YOUTUBE },
    ],
  },
  live: {
    text: "See you Monday 🔴 Free LIVE AI training every Monday at 3 PM ET on Google Meet — no camera needed, and bring your questions for the Q&A. Save your seat 👇",
    buttons: [{ type: "web_url", title: "SAVE MY SEAT", url: link("/live-training") }],
  },
  shop: {
    text: "Let's grow your shop 💈 Start with a free audit of your Google Business Profile — see exactly what's costing you bookings 👇",
    buttons: [
      { type: "web_url", title: "FREE PROFILE AUDIT", url: link("/google-business-profile-audit") },
      { type: "web_url", title: "SEE PLANS", url: link("/pricing") },
    ],
  },
};

export const NUDGE_TEXT =
  "I'm ShearQuery's automated bot 🤖 so I can't answer typed questions — bring them to our free LIVE Q&A, Mondays at 3 PM ET! Or tap one 👇";

// ── what happens next ───────────────────────────────────────────────────────

export type Action =
  | { kind: "buttons"; text: string; buttons: Button[] }
  | { kind: "text"; text: string }
  | { kind: "capture_email"; email: string }
  | { kind: "stage"; stage: Stage }
  | { kind: "topic"; topic: TopicId };

export type Event = { type: "postback"; payload: string } | { type: "text"; text: string };

export function looksLikeEmail(text: string): string | null {
  const m = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(text.trim());
  return m && text.trim().length <= m[0].length + 20 ? m[0].toLowerCase() : null;
}

/** The private reply to a comment: the opener, or — for someone who already has the kit — the menu. */
export function privateReplyFor(state: FlowState | null): { kind: "opener" | "menu"; text: string; buttons: Button[] } {
  return state?.stage === "done"
    ? { kind: "menu", text: WELCOME_BACK, buttons: MENU_BUTTONS }
    : { kind: "opener", text: OPENER.text, buttons: OPENER.buttons };
}

/** Everything to do in response to a tap or a typed message. No AI anywhere in here. */
export function decide(state: FlowState | null, event: Event): Action[] {
  const stage = state?.stage ?? null;

  if (event.type === "postback") {
    if (event.payload === PAYLOAD.sendKit) {
      if (stage === "done") return [{ kind: "buttons", text: WELCOME_BACK, buttons: MENU_BUTTONS }];
      return [{ kind: "stage", stage: "awaiting_email" }, { kind: "text", text: ASK_EMAIL[0] }, { kind: "text", text: ASK_EMAIL[1] }];
    }
    const topic = (Object.keys(TOPICS) as TopicId[]).find((t) => PAYLOAD.topic(t) === event.payload);
    if (topic) return [{ kind: "topic", topic }, { kind: "buttons", text: TOPICS[topic].text, buttons: TOPICS[topic].buttons }];
    return [];
  }

  const text = event.text.trim();
  const email = looksLikeEmail(text);

  // An email is welcome whenever it comes — they might type it before tapping.
  if (email && stage !== "done") {
    return [{ kind: "capture_email", email }, { kind: "stage", stage: "done" }, { kind: "buttons", text: allSet(email), buttons: MENU_BUTTONS }];
  }
  if (stage === "awaiting_email") return [{ kind: "text", text: NOT_AN_EMAIL }];
  // The typed fallback for the opener.
  if (/^\s*send\b/i.test(text) && stage !== "done") {
    return [{ kind: "stage", stage: "awaiting_email" }, { kind: "text", text: ASK_EMAIL[0] }, { kind: "text", text: ASK_EMAIL[1] }];
  }
  return [{ kind: "buttons", text: NUDGE_TEXT, buttons: stage === "done" ? MENU_BUTTONS : OPENER.buttons }];
}

// ── the kit email ───────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function kitEmail(i: { unsubscribeUrl: string; mailingAddress: string | null }): { subject: string; html: string } {
  const li = (href: string, label: string, note: string) =>
    `<li style="margin:0 0 12px"><a href="${esc(href)}" style="color:#1d4ed8;font-weight:700">${esc(label)}</a><br><span style="color:#475569">${esc(note)}</span></li>`;
  return {
    subject: "Your free Claude + ShearQuery kit 🎁",
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a;font-size:15px;line-height:1.55">
  <h2 style="margin:0 0 12px;font-size:21px">Here's your kit 🎁</h2>
  <p style="margin:0 0 16px">Everything you need to put Claude + ShearQuery to work in your barber, beauty or wellness business:</p>
  <ol style="padding-left:20px;margin:0 0 18px">
    ${li(`${SITE_URL}/links?src=kit_email#connect`, "1. Connect ShearQuery to Claude (2 minutes)", "Copy-paste steps for Claude and ChatGPT, done once.")}
    ${li(`${SITE_URL}/links?src=kit_email`, "2. Starter prompts", "What to ask first — for shops, stylists, your clients and students.")}
    ${li(YOUTUBE, "3. The training videos", "Step-by-step on our YouTube channel.")}
    ${li(`${SITE_URL}/live-training?src=kit_email`, "4. The free LIVE training — Mondays, 3 PM ET", "Market trends, AI use cases, a live walkthrough and Q&A. No camera needed. Stay to the end for a gift.")}
  </ol>
  <p style="margin:0 0 6px">We'll send you the weekly LIVE training invite, as promised. See you Monday!</p>
  <p style="color:#94a3b8;font-size:12px;margin-top:28px;line-height:1.55">
    You're getting this because you asked for the kit in our Instagram DMs.<br>
    ShearQuery by Inner G Complete Agency<br>
    ${i.mailingAddress ? `${esc(i.mailingAddress)}<br>` : ""}
    <a href="${esc(i.unsubscribeUrl)}" style="color:#94a3b8">Unsubscribe</a>
  </p>
</div>`,
  };
}
