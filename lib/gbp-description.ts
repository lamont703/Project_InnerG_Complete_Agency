/**
 * Drafting the Google Business Profile description.
 *
 * This is the surface most likely to get a listing suspended, and the one this
 * product has repeatedly promised not to abuse. Google's rules for the
 * description are specific: no URLs, no phone numbers, no prices or offers, no
 * HTML, and no keyword stuffing. "Barber shop Houston, best barber Houston,
 * Houston barber near me" is the thing everyone else in this market sells, and
 * it is what gets a shop removed from the map.
 *
 * So two constraints shape everything here:
 *
 *  1. The draft is built only from facts already on the profile — its
 *     categories, its services, its city. We do not know anything else about
 *     the business, and a description that invents a "master barber with 20
 *     years' experience" is a claim the owner has to live with.
 *  2. Output is validated against Google's rules before an owner ever sees it,
 *     and again before it's sent. A generator that occasionally produces
 *     something suspendable is not usable, however good its average output.
 */

export interface DescriptionFacts {
  businessName: string;
  city: string | null;
  region: string | null;
  primaryCategory: string | null;
  additionalCategories: string[];
  /** Service names taken from the profile, not invented. */
  services: string[];
  /** Human-readable attribute labels already set, e.g. "Wheelchair accessible entrance". */
  attributes: string[];
}

export const DESCRIPTION_MAX = 750;
/** Below this a description carries no information; Google allows shorter, but it wastes the field. */
export const DESCRIPTION_TARGET_MIN = 250;

export interface DescriptionIssue {
  code:
    | "too_long"
    | "too_short"
    | "contains_url"
    | "contains_phone"
    | "contains_email"
    | "contains_price"
    | "contains_html"
    | "shouting"
    | "keyword_stuffing";
  message: string;
}

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|co|io|shop|salon)\b/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PRICE_RE = /(?:[$£€]\s?\d|(?:\b\d+\s?%\s?off\b)|\bfrom\s+\$?\d+\b|\bonly\s+\$?\d+\b)/i;
const HTML_RE = /<\/?[a-z][\s\S]*>/i;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "our", "you", "your", "are", "from", "that", "this", "have", "has",
  "who", "all", "can", "get", "out", "not", "but", "its", "into", "were", "when", "where", "what",
  "book", "here", "more", "also", "were", "will", "each", "every", "them", "they", "their",
]);

/**
 * Repetition check.
 *
 * Keyword stuffing in this field looks like the same word appearing four or
 * five times in 500 characters — usually the category and the city. Three
 * occurrences is generous for genuine prose; beyond that it reads as written
 * for a crawler, which is exactly the judgement Google is making too.
 */
export function repeatedTerms(text: string, max = 3): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z']{3,}/g) || []) {
    if (STOPWORDS.has(raw)) continue;
    counts.set(raw, (counts.get(raw) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > max).map(([w]) => w).sort();
}

export function validateDescription(text: string): { ok: boolean; issues: DescriptionIssue[] } {
  const t = (text || "").trim();
  const issues: DescriptionIssue[] = [];

  if (t.length > DESCRIPTION_MAX) {
    issues.push({ code: "too_long", message: `${t.length} characters — Google allows ${DESCRIPTION_MAX}.` });
  }
  if (t.length < 40) {
    issues.push({ code: "too_short", message: "Too short to tell anyone anything." });
  }
  if (URL_RE.test(t)) {
    issues.push({ code: "contains_url", message: "Google doesn't allow links in the description." });
  }
  if (PHONE_RE.test(t)) {
    issues.push({ code: "contains_phone", message: "Google doesn't allow phone numbers here — it has its own field." });
  }
  if (EMAIL_RE.test(t)) {
    issues.push({ code: "contains_email", message: "Google doesn't allow email addresses in the description." });
  }
  if (PRICE_RE.test(t)) {
    issues.push({ code: "contains_price", message: "Prices and offers aren't allowed in the description." });
  }
  if (HTML_RE.test(t)) {
    issues.push({ code: "contains_html", message: "Remove the HTML — this field is plain text." });
  }

  const words = t.match(/\b[A-Z]{4,}\b/g) || [];
  if (words.length >= 3) {
    issues.push({ code: "shouting", message: "Too many words in capitals." });
  }

  const repeated = repeatedTerms(t);
  if (repeated.length) {
    issues.push({
      code: "keyword_stuffing",
      message: `Repeats ${repeated.slice(0, 3).map((w) => `"${w}"`).join(", ")} too often — this is what gets listings suspended.`,
    });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * A description assembled from profile facts alone.
 *
 * Used when no model is available, and as the shape the prompt is asked to
 * improve on. Deliberately plain: it states what the business is, where, and
 * what it does, because those are the only things we actually know.
 */
export function buildFallbackDescription(facts: DescriptionFacts): string {
  const where = facts.city ? ` in ${facts.city}${facts.region ? `, ${facts.region}` : ""}` : "";
  const what = facts.primaryCategory ? facts.primaryCategory.toLowerCase() : "business";

  const parts: string[] = [`${facts.businessName} is a ${what}${where}.`];

  if (facts.services.length) {
    const list = facts.services.slice(0, 6).map((s) => s.toLowerCase());
    const tail = list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0];
    parts.push(`Services include ${tail}.`);
  }

  const welcoming = facts.attributes.filter((a) =>
    /wheelchair|restroom|walk-?in|appointment|parking|kids/i.test(a)
  );
  if (welcoming.length) {
    parts.push(`${welcoming.slice(0, 3).join(", ")}.`);
  }

  return parts.join(" ").slice(0, DESCRIPTION_MAX);
}

/** The instruction given to the model. Exported so it can be reviewed and tested. */
export function descriptionPrompt(facts: DescriptionFacts): string {
  return [
    `Write the Google Business Profile description for ${facts.businessName}.`,
    "",
    "Everything you may use — do not add anything that isn't here:",
    `- Type of business: ${facts.primaryCategory || "unspecified"}`,
    facts.additionalCategories.length ? `- Also listed as: ${facts.additionalCategories.join(", ")}` : "",
    facts.city ? `- Location: ${facts.city}${facts.region ? `, ${facts.region}` : ""}` : "",
    facts.services.length ? `- Services on the profile: ${facts.services.slice(0, 25).join(", ")}` : "",
    facts.attributes.length ? `- Attributes set: ${facts.attributes.slice(0, 15).join(", ")}` : "",
    "",
    "Rules — Google rejects or penalises descriptions that break these:",
    `- Between ${DESCRIPTION_TARGET_MIN} and ${DESCRIPTION_MAX} characters.`,
    "- No links, no phone numbers, no email addresses.",
    "- No prices, discounts, or promotional offers.",
    "- No HTML, no emoji, no words in all capitals.",
    "- Do not repeat the business type or the city more than twice. Keyword stuffing gets listings suspended.",
    "- Invent nothing: no years in business, no staff names, no awards, no claims about quality that aren't in the facts above.",
    "- Write for a person deciding where to book, not for a search engine.",
    "- Plain prose, two or three sentences. Output only the description.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate a description, falling back to the assembled one.
 *
 * Model output is validated before it is returned, so a draft that breaks
 * Google's rules never reaches the owner's screen in the first place.
 */
export async function draftDescription(
  facts: DescriptionFacts
): Promise<{ draft: string; source: "generated" | "template"; issues: DescriptionIssue[] }> {
  const fallback = buildFallbackDescription(facts);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { draft: fallback, source: "template", issues: validateDescription(fallback).issues };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: descriptionPrompt(facts),
    });
    const text = (res.text || "").trim().replace(/^["']|["']$/g, "");
    const check = validateDescription(text);
    if (!check.ok) {
      console.warn("[gbp-description] draft rejected:", check.issues.map((i) => i.code).join(", "));
      return { draft: fallback, source: "template", issues: validateDescription(fallback).issues };
    }
    return { draft: text, source: "generated", issues: [] };
  } catch (e: any) {
    console.warn("[gbp-description] generation failed:", e?.message);
    return { draft: fallback, source: "template", issues: validateDescription(fallback).issues };
  }
}
