import { SITE_URL } from "@/lib/site";
import { EVENT_HOST, EVENT_NAME, sessionStart, type StepId } from "@/lib/live-training/schedule";

/**
 * EVERY WORD THE LIVE TRAINING SENDS — the hype sequence (email and text) and
 * the 12-week member campaign. Pure, so it's tested without sending anything.
 *
 * Rules the copy keeps (lib/live-training/messages.test.ts checks them):
 *  - The Meet link appears only from 24 hours before (the `link` step on).
 *  - Nothing claims a feature is open when lib/account-features.ts says it's
 *    in testing: the appointment book, client booking and payments are
 *    described as rolling out / in testing.
 *  - No invented statistics. "Market trends" are discussion topics, not numbers.
 *  - The end-of-training gift stays a surprise (the owner's choice).
 *  - Promotional email carries an unsubscribe link and the mailing address.
 *  - Texts are short and end with the opt-out.
 */

export const REGISTER_URL = `${SITE_URL}/live-training`;

export interface EmailOut { subject: string; preheader: string; html: string }

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** "Monday, October 5 at 3 PM ET (2 PM CT · 12 PM PT)" — the three offsets move together with DST. */
export function whenLong(sessionDate: string): string {
  const d = sessionStart(sessionDate);
  const day = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
  return `${day} at 3 PM ET (2 PM CT · 12 PM PT)`;
}
export function whenShort(sessionDate: string): string {
  const d = sessionStart(sessionDate);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })}, 3 PM ET`;
}

function shell(o: {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { href: string; label: string };
  why: string;
  unsubscribeUrl: string;
  mailingAddress: string | null;
}): string {
  const p = o.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${t}</p>`).join("");
  const cta = o.cta
    ? `<p style="margin:22px 0 6px"><a href="${esc(o.cta.href)}" style="background:#dc2626;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:800;font-size:15px;display:inline-block">${esc(o.cta.label)}</a></p>`
    : "";
  return `<div style="display:none;max-height:0;overflow:hidden">${esc(o.preheader)}</div>
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8">${esc(EVENT_NAME)} · LIVE</p>
  <h2 style="margin:0 0 16px;font-size:21px;line-height:1.3">${o.heading}</h2>
  ${p}${cta}
  <p style="color:#94a3b8;font-size:12px;margin-top:30px;line-height:1.55">
    ${o.why}<br>
    Hosted by the ${esc(EVENT_HOST)} · ShearQuery by Inner G Complete Agency<br>
    ${o.mailingAddress ? `${esc(o.mailingAddress)}<br>` : ""}
    <a href="${esc(o.unsubscribeUrl)}" style="color:#94a3b8">Unsubscribe</a>
  </p>
</div>`.trim();
}

const HOW_IT_WORKS = "No camera needed, and microphones stay muted until the Q&amp;A — just click the link and you're in.";
const GIFT = "Stay until the end: there's a special gift for everyone who makes it to the last minute.";

// ── the hype sequence ───────────────────────────────────────────────────────

export interface HypeInput {
  firstName: string;
  sessionDate: string;
  meetUrl: string | null;
  unsubscribeUrl: string;
  mailingAddress: string | null;
}

const WHY_REGISTERED = "You're getting this because you registered for the LIVE training on shearquery.com.";

export function hypeEmail(step: StepId, i: HypeInput): EmailOut {
  const name = esc(i.firstName);
  const when = whenLong(i.sessionDate);
  const join = i.meetUrl ? { href: i.meetUrl, label: "Join the LIVE training" } : undefined;
  const base = { why: WHY_REGISTERED, unsubscribeUrl: i.unsubscribeUrl, mailingAddress: i.mailingAddress };
  switch (step) {
    case "confirm":
      return {
        subject: `You're in: ${EVENT_NAME}, ${whenShort(i.sessionDate)}`,
        preheader: "Your seat is saved. The join link arrives 24 hours before.",
        html: shell({
          ...base,
          preheader: "Your seat is saved. The join link arrives 24 hours before.",
          heading: `You're registered, ${name}.`,
          paragraphs: [
            `<strong>${esc(when)}</strong>, live on Google Meet.`,
            "We'll look at barber, beauty and wellness in the age of AI: what's changing in the market, the ways shops and stylists are putting AI to work, and how to run your business from Claude + ShearQuery — or your favorite AI, like ChatGPT or Gemini.",
            "At the end, we'll walk you through connecting ShearQuery to your own Claude or ChatGPT, step by step.",
            `Your join link arrives 24 hours before we go live. ${HOW_IT_WORKS}`,
            GIFT,
          ],
        }),
      };
    case "closed":
      return {
        subject: "Registration's closed — your seat is saved for Monday",
        preheader: "What we'll cover, and how joining works.",
        html: shell({
          ...base,
          preheader: "What we'll cover, and how joining works.",
          heading: `See you Monday, ${name}.`,
          paragraphs: [
            `Registration for ${esc(whenShort(i.sessionDate))} just closed, and you're on the list.`,
            "What we'll cover: where AI is taking barber, beauty and wellness; real ways shops, stylists and schools are using it; and a live walkthrough connecting ShearQuery to Claude or ChatGPT so you leave with it working.",
            "Bring a question — the Q&amp;A is where we get specific about your chair, your shop or your school.",
            `Your Google Meet link arrives tomorrow at this time. ${HOW_IT_WORKS}`,
          ],
        }),
      };
    case "link":
      return {
        subject: `Your link for tomorrow's LIVE training (3 PM ET)`,
        preheader: "Save this — it's how you get in tomorrow.",
        html: shell({
          ...base,
          preheader: "Save this — it's how you get in tomorrow.",
          heading: `Here's your link, ${name}.`,
          paragraphs: [
            `<strong>${esc(when)}</strong>. We'll send it again before we start, so there's no digging for it.`,
            HOW_IT_WORKS,
            "Tip: if you already use Claude or ChatGPT, have it open on your laptop — you can follow along when we connect ShearQuery at the end.",
            GIFT,
          ],
          cta: join,
        }),
      };
    case "morning":
      return {
        subject: "Today at 3 PM ET: AI Barber Beauty Business Training",
        preheader: "Live this afternoon. Here's your link.",
        html: shell({
          ...base,
          preheader: "Live this afternoon. Here's your link.",
          heading: `Today's the day, ${name}.`,
          paragraphs: [`We go live at <strong>3 PM ET</strong> (2 PM CT · 12 PM PT). ${HOW_IT_WORKS}`, GIFT],
          cta: join,
        }),
      };
    case "hour":
      return {
        subject: "One hour — we're live at 3 PM ET",
        preheader: "Grab your link and a question for the Q&A.",
        html: shell({
          ...base,
          preheader: "Grab your link and a question for the Q&A.",
          heading: "One hour to go.",
          paragraphs: ["Grab a question for the Q&amp;A — the more specific to your business, the better.", HOW_IT_WORKS],
          cta: join,
        }),
      };
    case "ten":
      return {
        subject: "Starting in 10 minutes — join now",
        preheader: "Doors are open.",
        html: shell({ ...base, preheader: "Doors are open.", heading: "Starting in 10 minutes.", paragraphs: ["Doors are open — come on in.", HOW_IT_WORKS], cta: join }),
      };
    case "live":
      return {
        subject: "We're LIVE now",
        preheader: "Jump in — we just started.",
        html: shell({ ...base, preheader: "Jump in — we just started.", heading: "We're live.", paragraphs: ["We just started. Jump in now.", GIFT], cta: join }),
      };
  }
}

const STOP = "Reply STOP to opt out.";

export function hypeSms(step: StepId, i: { firstName: string; sessionDate: string; meetUrl: string | null }): string | null {
  const link = i.meetUrl ?? "";
  switch (step) {
    case "confirm":
      return `ShearQuery: You're registered for the LIVE AI Barber Beauty Business Training, ${whenShort(i.sessionDate)}. Your join link comes 24 hrs before. ${STOP}`;
    case "link":
      return `ShearQuery: Your link for tomorrow's LIVE training (3 PM ET): ${link} No camera needed. ${STOP}`;
    case "morning":
      return `ShearQuery: Today 3 PM ET — AI Barber Beauty Business Training LIVE. Join: ${link} Stay to the end for a gift. ${STOP}`;
    case "hour":
      return `ShearQuery: 1 hour! LIVE at 3 PM ET: ${link} ${STOP}`;
    case "ten":
      return `ShearQuery: Starting in 10 min. Tap to join: ${link} ${STOP}`;
    case "live":
      return `ShearQuery: We're LIVE now! ${link} ${STOP}`;
    default:
      return null;
  }
}

// ── the 12-week member campaign ─────────────────────────────────────────────

export interface CampaignInput {
  firstName: string | null;
  sessionDate: string;
  unsubscribeUrl: string;
  mailingAddress: string;
}

interface Week { subject: string; preheader: string; heading: string; paragraphs: string[] }

/**
 * One topic a week, each a reason to come to THIS Monday. Features are named
 * as they stand: Google profile tools and Autopilot are available; the
 * appointment book, clients booking from their AI and payments are in testing.
 */
export const CAMPAIGN: Week[] = [
  {
    subject: "New: a LIVE AI training for barbers & stylists, every Monday",
    preheader: "Free, 3 PM ET, no camera needed. Here's what it is.",
    heading: "We're going live every Monday.",
    paragraphs: [
      "Starting this week, the ShearQuery Cosmetology &amp; Barber Board is hosting a free LIVE training every Monday at 3 PM ET: <strong>AI Barber Beauty Business Training</strong>.",
      "We'll talk about where AI is taking barber, beauty and wellness, the ways shops and stylists are already using it, and how to run your business from Claude + ShearQuery — or your favorite AI, like ChatGPT or Gemini.",
      "At the end we connect ShearQuery to your own Claude or ChatGPT, live. Stay to the last minute for a special gift.",
    ],
  },
  {
    subject: "Your Google profile is your front door. Let AI check it.",
    preheader: "Monday's LIVE training: a full profile audit in minutes.",
    heading: "Most new clients meet you on Google first.",
    paragraphs: [
      "Your Google Business Profile is often the first thing a new client sees — hours, photos, reviews, services. Gaps there cost you bookings you never hear about.",
      "This Monday we'll show how Claude + ShearQuery audits your profile, drafts the fixes, and publishes them only after you approve each one.",
    ],
  },
  {
    subject: "Answering every review, in your voice",
    preheader: "Monday LIVE: replies you approve before they post.",
    heading: "Every review deserves an answer. You don't have to write them all.",
    paragraphs: [
      "Replying to reviews shows new clients you're paying attention — but it's one more job at the end of a long day.",
      "Monday we'll show Claude drafting replies in your voice for you to approve, and how ShearQuery's Autopilot can answer 4 and 5 star reviews for you automatically, while anything under 4 stars always stays yours to answer.",
    ],
  },
  {
    subject: "An appointment book you run by talking to it",
    preheader: "Monday LIVE: \"move my 2 o'clock to 4\" — and it's done.",
    heading: "What if your book answered you back?",
    paragraphs: [
      "\"What does tomorrow look like?\" \"Book Marcus a fade Friday at 3.\" \"Block off next Monday.\" That's how running an appointment book from Claude works.",
      "ShearQuery's appointment book is in testing now and rolling out to pros. Monday we'll show it live and talk about where booking is heading in the age of AI.",
    ],
  },
  {
    subject: "Your clients will book you from their AI",
    preheader: "Monday LIVE: the next 'Book now' button isn't on your website.",
    heading: "The next \"Book now\" button isn't on your website.",
    paragraphs: [
      "More people are asking an AI assistant to find and book things for them. Soon \"book me a haircut with my barber on Friday\" is a sentence, not an app.",
      "ShearQuery lets clients book you from their own Claude or ChatGPT — in testing now. Monday we'll show what that looks like from the client's side and yours.",
    ],
  },
  {
    subject: "No-shows, deposits, and your own rules",
    preheader: "Monday LIVE: deposits straight to your own Stripe.",
    heading: "A no-show is a chair you could have filled.",
    paragraphs: [
      "Deposits change behavior. ShearQuery's deposits and full payment at booking are in testing now — paid straight to your own Stripe account, under cancellation and refund rules you set yourself.",
      "Monday we'll talk through how shops set these policies, what clients respond to, and how AI takes the awkward conversations off your plate.",
    ],
  },
  {
    subject: "Booth renters: build your own brand with AI",
    preheader: "Monday LIVE: you're a business, not just a chair.",
    heading: "Renting a booth means running a business.",
    paragraphs: [
      "Booth renters handle their own marketing, booking and clients — usually alone. That's exactly where an AI assistant pays off.",
      "Monday we'll cover the AI use cases that matter most when it's just you: your own Google profile, your own booking page and clients who find you directly.",
    ],
  },
  {
    subject: "Shop & salon owners: an assistant that works while you cut",
    preheader: "Monday LIVE: what Autopilot does without being asked.",
    heading: "What runs while you're behind the chair?",
    paragraphs: [
      "ShearQuery's Autopilot answers 4 and 5 star reviews in your voice, writes one Google post a week that you see a day ahead, and sends you a Monday report — and everything it publishes can be undone.",
      "Monday we'll show it live, and talk about which jobs owners are handing to AI first.",
    ],
  },
  {
    subject: "Schools & students: AI, exams and the next generation",
    preheader: "Monday LIVE: what AI means for barber and cosmetology education.",
    heading: "The next generation is learning with AI.",
    paragraphs: [
      "Students are already using AI to study. Schools are asking how to compete for enrollment when families compare exam pass rates online.",
      "Monday we'll talk about AI in barber and cosmetology education — and show how ShearQuery compares schools on state exam outcomes, right inside Claude.",
    ],
  },
  {
    subject: "Claude, ChatGPT or Gemini — which AI for your business?",
    preheader: "Monday LIVE: what actually matters when you pick one.",
    heading: "Which AI should you use?",
    paragraphs: [
      "Claude, ChatGPT, Gemini — they all write and answer questions. For a business, the difference is what they can connect to and act on for you.",
      "Monday we'll talk through choosing one, then connect ShearQuery to Claude or ChatGPT live so it can work with your real business information.",
    ],
  },
  {
    subject: "You approve every change. Here's why that matters.",
    preheader: "Monday LIVE: trust, privacy and AI in your business.",
    heading: "AI should work for you, not around you.",
    paragraphs: [
      "The fair question about AI is: what can it change without me? With ShearQuery in Claude, changes to your Google profile are drafted first and published only after you approve them — and most can be undone.",
      "Monday we'll talk honestly about trust, privacy and where AI does and doesn't belong in a beauty business.",
    ],
  },
  {
    subject: "Reimagining the chair: barber & beauty in the age of AI",
    preheader: "Monday LIVE: the big picture — and your last reminder this season.",
    heading: "Barber, beauty and wellness in the age of AI.",
    paragraphs: [
      "Twelve weeks of Monday trainings, one big question: what does this industry look like when every client — and every business — has an AI assistant?",
      "Join us Monday for the big picture, the trends we're watching, and a live walkthrough connecting ShearQuery to your Claude or ChatGPT. Stay to the end for a special gift.",
    ],
  },
];

export function campaignEmail(week: number, i: CampaignInput): EmailOut {
  const w = CAMPAIGN[week - 1];
  if (!w) throw new Error(`No campaign email for week ${week}`);
  const hi = i.firstName ? `${esc(i.firstName)}, ` : "";
  return {
    subject: w.subject,
    preheader: w.preheader,
    html: shell({
      preheader: w.preheader,
      heading: w.heading,
      paragraphs: [
        ...w.paragraphs,
        `${hi}join us <strong>${esc(whenLong(i.sessionDate))}</strong> on Google Meet. Free. ${HOW_IT_WORKS} Registration closes Saturday at 3 PM ET.`,
      ],
      cta: { href: `${REGISTER_URL}?src=email_w${week}`, label: "Save my seat" },
      why: "You're getting this because you have a ShearQuery account or asked for our weekly LIVE training invite.",
      unsubscribeUrl: i.unsubscribeUrl,
      mailingAddress: i.mailingAddress,
    }),
  };
}
