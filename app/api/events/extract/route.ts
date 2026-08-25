import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Tier 3 (headless browser) can take a while on a cold Chromium launch —
// give this route real headroom instead of the platform default.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ExtractedEvent {
  title: string | null;
  description: string | null;
  eventDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  organizerName: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  priceInfo: string | null;
}

const EMPTY_EVENT: ExtractedEvent = {
  title: null, description: null, eventDate: null, endDate: null,
  startTime: null, endTime: null, venueName: null, address: null,
  city: null, category: null, organizerName: null, ticketUrl: null,
  imageUrl: null, priceInfo: null,
};

// Strips <script>/<style> CONTENT (not just the tags) before measuring
// visible text — a barely-hydrated SPA shell can have thousands of
// characters of bundled JS, which would otherwise look like "real page
// content" to a naive tag-strip and wrongly skip the Tier 3 fallback.
function stripToVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&#x27;|&quot;|&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Schema.org Event dates are ISO 8601, often with a timezone offset
// ("2026-06-06T18:00:00-04:00"). Deliberately NOT parsed through Date/
// toISOString() — that converts to UTC and can shift the calendar date
// across midnight depending on the offset. An event listed as "6pm" is
// 6pm local wall-clock time at the venue; slicing the string directly
// preserves that instead of silently reinterpreting it.
function parseLocalDateTime(iso: string | undefined | null): { date: string | null; time: string | null } {
  if (!iso) return { date: null, time: null };
  const match = String(iso).match(/^(\d{4}-\d{2}-\d{2})T?(\d{2}:\d{2})?/);
  if (!match) return { date: null, time: null };
  return { date: match[1], time: match[2] || null };
}

// Schema.org's Event type has many subtypes (BusinessEvent, MusicEvent,
// SportsEvent, EducationEvent, SocialEvent, etc. — confirmed live:
// Eventbrite tags its own pages "BusinessEvent", not plain "Event") — an
// exact-match check on "Event" misses essentially all real-world event
// pages. Matching anything ending in "Event" catches the vast majority;
// a couple of real subtypes don't follow that suffix convention.
function isEventType(type: string): boolean {
  return type === 'Event' || type.endsWith('Event') || type === 'Festival' || type === 'Hackathon';
}

function extractJsonLdEvent(html: string): any | null {
  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
      for (const candidate of candidates) {
        const types = Array.isArray(candidate['@type']) ? candidate['@type'] : [candidate['@type']];
        if (types.some((t: string) => typeof t === 'string' && isEventType(t))) return candidate;
      }
    } catch {
      // Malformed JSON-LD on this particular block — skip it, keep checking others.
    }
  }
  return null;
}

function mapJsonLdToEvent(ld: any, sourceUrl: string): ExtractedEvent {
  const location = ld.location;
  const address = location?.address;
  const addressStr = typeof address === 'string'
    ? address
    : [address?.streetAddress, address?.addressLocality, address?.addressRegion, address?.postalCode].filter(Boolean).join(', ') || null;
  const start = parseLocalDateTime(ld.startDate);
  const end = parseLocalDateTime(ld.endDate);
  const image = Array.isArray(ld.image) ? ld.image[0] : (ld.image?.url || ld.image);
  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const priceInfo = offers?.price
    ? `${offers.price} ${offers.priceCurrency || ''}`.trim()
    : (offers?.lowPrice
        ? (offers.lowPrice === offers.highPrice
            ? `${offers.lowPrice} ${offers.priceCurrency || ''}`.trim()
            : `${offers.lowPrice}-${offers.highPrice || ''} ${offers.priceCurrency || ''}`.trim())
        : null);

  return {
    title: ld.name || null,
    description: ld.description || null,
    eventDate: start.date,
    endDate: end.date,
    startTime: start.time,
    endTime: end.time,
    venueName: location?.name || null,
    address: addressStr,
    city: address?.addressLocality || null,
    category: null, // JSON-LD Event has no standard category field worth trusting
    organizerName: ld.organizer?.name || null,
    ticketUrl: offers?.url || sourceUrl,
    imageUrl: typeof image === 'string' ? image : null,
    priceInfo,
  };
}

async function extractWithGemini(text: string, sourceUrl: string): Promise<ExtractedEvent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You are extracting structured event details from the text content of a webpage about a barber/beauty/wellness industry event. Return ONLY a JSON object with exactly these fields, no other text:

{
  "title": string or null,
  "description": string or null (1-2 sentence summary),
  "eventDate": string or null (the event's START date, format YYYY-MM-DD),
  "endDate": string or null (if a multi-day event, else null),
  "startTime": string or null (format HH:MM, 24-hour, local time — omit if not stated),
  "endTime": string or null,
  "venueName": string or null,
  "address": string or null (street address if stated),
  "city": string or null,
  "category": string or null (one of: "Trade Show", "Competition", "Education/CEU", "Networking", "Charity", "Other" — pick the closest fit),
  "organizerName": string or null,
  "priceInfo": string or null (e.g. "$25-$150", "Free")
}

CRITICAL: If a field is not clearly stated in the text, return null for it. Do NOT guess, infer, or invent a value — an invented date or address is worse than a missing one.

Page URL: ${sourceUrl}

Page text content:
${text.slice(0, 12000)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 800,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let raw = response.text || '{}';
  raw = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return {
    ...EMPTY_EVENT,
    ...parsed,
    ticketUrl: parsed.ticketUrl || sourceUrl,
  };
}

// Tier 3 only. Full `puppeteer` (with its bundled Chromium) works fine
// locally but is far too large to bundle into a normal Vercel serverless
// function — puppeteer-core + @sparticuz/chromium is the standard pairing
// for that environment, but its Lambda-optimized binary doesn't resolve
// correctly outside it. Branch on VERCEL so local testing still works.
async function renderWithHeadlessBrowser(url: string): Promise<string> {
  let browser: any;
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = await import('puppeteer-core');
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.launch({ headless: true });
  }
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'A url is required.' }, { status: 400 });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'That doesn\'t look like a valid URL.' }, { status: 400 });
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Could not fetch that URL (HTTP ${res.status}).` }, { status: 400 });
    }
    let html = await res.text();

    // Tier 1: JSON-LD Event schema, if present.
    let ld = extractJsonLdEvent(html);
    let tier = 1;
    let visibleText = stripToVisibleText(html);

    // If no JSON-LD and the page looks like a client-rendered shell (very
    // little real text once script/style content is stripped out), render
    // it with a headless browser before giving up.
    if (!ld && visibleText.length < 300) {
      tier = 3;
      html = await renderWithHeadlessBrowser(parsedUrl.toString());
      ld = extractJsonLdEvent(html);
      visibleText = stripToVisibleText(html);
    }

    if (visibleText.length < 50 && !ld) {
      return NextResponse.json({
        success: false,
        error: 'Could not find enough content on that page to extract event details. You can still fill the form in manually.',
      }, { status: 200 });
    }

    const ldEvent = ld ? mapJsonLdToEvent(ld, parsedUrl.toString()) : null;

    // JSON-LD is reliable when present but confirmed live (Eventbrite's own
    // BusinessEvent markup) to sometimes omit fields Google's own Event
    // guidelines call required — startDate wasn't in the block at all for
    // a real Eventbrite listing, despite the title literally containing the
    // date in prose. Rather than treat tiers as mutually exclusive, always
    // fill genuinely missing fields (especially eventDate, which the DB
    // requires) from a Gemini pass over the visible text, merging rather
    // than replacing — JSON-LD values win whenever they're actually present.
    const REQUIRED_FOR_MERGE: (keyof ExtractedEvent)[] = ['eventDate', 'venueName', 'address', 'category'];
    const needsSupplement = !ldEvent || REQUIRED_FOR_MERGE.some((f) => !ldEvent[f]);

    let geminiEvent: ExtractedEvent | null = null;
    const supplementedFields: string[] = [];
    if (needsSupplement && visibleText.length >= 50) {
      geminiEvent = await extractWithGemini(visibleText, parsedUrl.toString());
    }

    let merged: ExtractedEvent;
    if (ldEvent && geminiEvent) {
      merged = { ...EMPTY_EVENT };
      for (const key of Object.keys(EMPTY_EVENT) as (keyof ExtractedEvent)[]) {
        if (ldEvent[key]) {
          merged[key] = ldEvent[key];
        } else if (geminiEvent[key]) {
          merged[key] = geminiEvent[key];
          supplementedFields.push(key);
        }
      }
    } else {
      merged = ldEvent || geminiEvent || EMPTY_EVENT;
    }

    return NextResponse.json({
      success: true,
      extractionTier: ldEvent && !geminiEvent ? 1 : (tier === 3 ? 3 : (ldEvent ? '1+2' : 2)),
      supplementedFields,
      event: merged,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Extraction failed.' }, { status: 500 });
  }
}
