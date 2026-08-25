import "server-only";
import { STEP_BRIEFS, type FunnelStep } from "@/lib/admin/outreach-funnel";
import { SITE_URL } from "@/lib/site";

/**
 * Writing one outreach message with a model, grounded in what we know.
 *
 * WHAT THE TEMPLATES COULD NOT DO. The first version interpolated a first name
 * into a fixed sentence, so a five-star salon in Houston with twenty reviews
 * got the same line as a shop with no reviews at all — and we hold both facts.
 * Generic is what a template buys you, and it is the whole reason a page of
 * them reads as a mail merge.
 *
 * IT IS GROUNDED, NOT CREATIVE. Everything the model may assert is handed to
 * it; the prompt forbids inventing anything else. A message that flatters
 * somebody with a number we did not check is worse than a plain one, because it
 * is the owner's own business and they will notice immediately.
 *
 * THE SURVEILLANCE RULE SURVIVES THE MOVE. "You clicked our email and didn't
 * finish" is accurate and reads as being watched. The click decides WHO gets a
 * message and never appears in it — that was a comment in the template file and
 * is now a line in the prompt, because it is exactly the sort of thing a model
 * will do unprompted.
 *
 * FAILURE RETURNS NULL, NEVER A GUESS. Quota runs out — it did twice in one day
 * — and the caller falls back to the template. A page that shows nothing
 * because generation was unavailable is worse than one showing plain drafts.
 */

export interface DraftContext {
  firstName: string;
  channel: "sms" | "email";
  step: FunnelStep;
  /** Why this person surfaced. For the model's judgement, never to be repeated back. */
  reason: string;
  business?: {
    name?: string | null;
    city?: string | null;
    rating?: number | null;
    reviews?: number | null;
    category?: string | null;
    hasWebsite?: boolean;
    hasHours?: boolean;
  } | null;
  /** Their own words, most recent last. The strongest thing available. */
  theirWords?: string[];
}

export interface GeneratedDraft {
  subject?: string;
  body: string;
}

const MODEL = "gemini-3.1-flash-lite";

function buildPrompt(ctx: DraftContext): string {
  const brief = STEP_BRIEFS[ctx.step];
  const b = ctx.business;

  const facts: string[] = [];
  if (b?.name) facts.push(`Business name: ${b.name}`);
  if (b?.city) facts.push(`City: ${b.city}`);
  if (b?.category) facts.push(`Type: ${b.category}`);
  if (b?.rating != null && b?.reviews != null) facts.push(`Google rating: ${b.rating} from ${b.reviews} reviews`);
  if (b?.hasHours === false) facts.push("No opening hours on file");
  if (b?.hasWebsite === false) facts.push("No website on file");

  /*
   * ABSOLUTE, ALWAYS. The funnel stores relative paths because the app renders
   * them, but these are read in a text message or a mail client with no base
   * URL to resolve against — "/account/add-business" is not a link anywhere
   * outside the site, it is a string.
   */
  const url = `${SITE_URL}${brief.href}`;

  return `You write one short outreach message from ShearQuery to a barbershop or salon owner.

THE ONE THING YOU ARE ASKING THEM TO DO
${brief.label} — so they can ${brief.benefit}. It takes ${brief.effort}.
Do not mention any other feature. One ask, nothing else.

WHERE THEY GO TO DO IT
${url}
This link MUST appear in the message, exactly as written, and it must be the
only link. A message that asks somebody to do something and does not say where
is asking them to go and find it, which is the point most people stop.

WHAT WE KNOW ABOUT THEM (use only what helps; never state a fact not listed here)
Name: ${ctx.firstName}
${facts.length ? facts.join("\n") : "Nothing beyond their name."}
${ctx.theirWords?.length ? `\nTHINGS THEY HAVE SAID TO US (most recent last):\n${ctx.theirWords.map((w) => `- "${w}"`).join("\n")}` : ""}

RULES
- NEVER mention that we tracked anything. Not opens, not clicks, not visits, not "I noticed you". We know why we are writing; they do not need to be told they were watched.
- NEVER invent a fact. If you were not given their rating, do not guess it. If you were not given their city, do not name one.
- Lead with something true about THEIR business, not about our product. "Chevere Beauty Studio is at 5.0 from 20 reviews" earns the next sentence. "ShearQuery helps salons grow" does not.
- Write the way one person texts another. No marketing voice, no exclamation marks, no "unlock", "leverage", "empower", "seamless", "elevate".
- Never promise anything not described above.
- ${ctx.channel === "sms"
    ? `SMS: under 320 characters INCLUDING the link, no subject line, no greeting block, no sign-off. Put the link at the end on its own line, with nothing after it — a URL followed by more words gets mangled by phones that auto-detect links.`
    : "Email: under 120 words. Return a subject line under 8 words on the FIRST line, then a blank line, then the body. Put the link on its own line. Sign off as Lamont."}
- If their own words are given above and one is relevant, refer to it naturally. That is worth more than any fact about their listing.

Return only the message. No preamble, no quotes around it.`;
}

export async function generateDraft(ctx: DraftContext): Promise<GeneratedDraft | null> {
  // GEMINI_API_KEY only — never the chat key. Google rate-limits per PROJECT,
  // so borrowing the chat's key would spend the live assistant's allowance on a
  // background page. lib/gemini-keys.ts documents the outage that taught us.
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(ctx) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) return null;

    const clean = text.trim().replace(/^["']|["']$/g, "");
    if (ctx.channel === "sms") return { body: clean };

    // Email: first line is the subject, the rest is the body. A model that
    // ignores that instruction would otherwise put the subject INSIDE the
    // email, which reads as a mistake to whoever receives it.
    const [first, ...rest] = clean.split("\n");
    const body = rest.join("\n").trim();
    if (!body) return { body: clean };
    return { subject: first.replace(/^subject:\s*/i, "").trim().slice(0, 90), body };
  } catch {
    return null;
  }
}
