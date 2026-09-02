import "server-only";
import { randomUUID } from "crypto";
import { gatherContentEvidence, gatherCrmEvidence, evidenceKeys } from "./evidence";
import { validateFindings, type DraftFinding, type ResearchAgent } from "./types";
import { saveFindings } from "./store";

/**
 * The two research agents.
 *
 * BOTH ARE GROUNDED THE SAME WAY: real counts are gathered first, handed to the
 * model, and every returned finding must cite a key from that evidence or be
 * discarded. The model is not asked what it knows about barbering — it is asked
 * what these particular numbers imply.
 *
 * gemini-3.5-flash, not 2.5. The free tier's quota is per project PER MODEL and
 * 2.5-flash is spent by the older features in this repo; a research run would
 * 429 for reasons unrelated to itself.
 */

const MODEL = "gemini-3.5-flash";

const SHARED_RULES = `
RULES, all of which are rejections rather than preferences:

1. EVERY finding must include an "evidence" object whose keys are copied from
   the evidence you were given. A finding you cannot ground in those numbers is
   not a finding — drop it. Do not invent a number, and do not cite a key that
   was not provided.
2. Weight confidence by SAMPLE SIZE, not by how good the idea sounds. A pattern
   in 41 searches is "medium" at best. A pattern in 3 is "low" and should
   usually be left out.
3. Say what to DO, concretely. "Improve engagement" is not a suggestion.
   "Make a Short answering the query 'Houston' — it was searched 41 times and
   nothing in the queue covers it" is.
4. Prefer few strong findings to many weak ones. Five is plenty. Zero is a
   valid answer if the evidence does not support anything.
5. Do not repeat a suggestion that the "already_published" list shows has been
   covered.

Return a JSON array. Each item:
{"title": string, "suggestion": string, "rationale": string,
 "category": string, "evidence": object, "confidence": "high"|"medium"|"low",
 "videoType": "lookbook"|"figure"|"hottake", "stat": string|null, "label": string|null}

PICK THE FORMAT DELIBERATELY. There are three rendering pipelines and they make
completely different videos at completely different costs. Choosing is part of
the idea, not an afterthought — say in the rationale why this idea suits the
format you picked.

  "lookbook"  Lookbook. FREE. Six looks walked through in nine seconds with the
              number on screen, and the caption asks the viewer to comment one.
              Only for ideas that ARE six visual things: cuts, styles, fades,
              braids. The title must say how many, because the video counts them.

  "figure"    Data Reel. FREE. One figure from our own data, animated. The
              number IS the content. Use it when the finding IS a number — a
              count, a share, a rate. You MUST supply "stat" (the figure exactly
              as it should appear on screen, e.g. "47,674" or "68%") and "label"
              (the one line underneath saying what it counts). Without both it
              cannot be rendered.

  "hottake"   Hot Take. A talking head, ~$1.16 a video and the only one of these
              three that costs money. It is the only format that can say
              ANYTHING, so it carries advice, explanation and argument — the
              ideas the other two cannot show. Worth the money when there is
              something to explain; wasteful when the idea is really just a
              number or a list of looks.

THE TITLE IS NOT A LABEL, IT IS THE PACKAGING, and it decides whether anything
you suggest gets watched at all. On this channel, titles opening with a small
count of things the viewer will SEE hold 154.6% retention against 90.6% for
everything else:

    "6 Fades, Explained — Low to Drop"
    "6 Questions to Ask Before You Rent a Booth"

NOT a claim, a promise or a call to action — "The Truth About X", "Claim Your
Free Y", "How Z Works" all measured at roughly half the retention.

A LEADING NUMBER ALONE IS NOT ENOUGH: "569 Texas Barbershops Have a Perfect 5.0"
starts with a number and failed, because 569 is a statistic and a statistic is a
conclusion. Six is a count of things to look at, which is a reason to keep
watching. Use 2 to 12 for a "lookbook".

For "figure" the title carries the figure itself, and that is correct — the number
is the whole point of the card. For "hottake" a number-first reshape is usually
still worth it; if the idea genuinely cannot be expressed as a small list, say so
in the rationale.
`.trim();

import { identityForChannel } from "@/lib/agent-identity";

const CONTENT_BRIEF = `
You are the Content Research Agent for ShearQuery, a directory and toolset for
the barber, beauty and wellness industry. Your job is to find subjects worth
making social media posts about — short vertical video and Instagram Reels —
based on what people on this site actually search for, read, and ignore.

YOU CAN NOW SEE DEMAND FROM OUTSIDE THIS SITE. youtube_search_terms are the
words strangers typed into YouTube to reach this channel — people who had never
heard of ShearQuery. Weight those differently from on-site searches, which only
tell you what people who already found you wanted. A term with real volume that
nothing in the queue answers is the strongest kind of finding available here.

Read youtube_data_freshness_note before judging any recent post. Analytics lags
24-72 hours; youtube_recent_videos carries the live counts. A new Short showing
zero in Analytics has not failed.

What makes a good finding here:
- a search query with real volume that no published post covers
- a page getting views but no clicks, where a post could do the explaining
- a slice of the directory large enough to be interesting on its own
  (a city with hundreds of shops, a licence type with thousands of holders)
- a traffic source worth making content specifically for
- a YouTube search term with volume that the queue does not answer
- a mismatch between what the channel ranks for and what it now publishes

${identityForChannel("research")}
`.trim();

const CRM_BRIEF = `
You are the CRM Research Agent for ShearQuery. Your job is to find the best
next actions for moving a lead one step further along this pipeline:

  search / social / LLM traffic
    -> website pages
      -> AI Chat Mode on the site
        -> membership creation
          -> product usage

You can see three systems: the site's own analytics, the GoHighLevel CRM, and
the Shopify store.

READ THE FUNNEL COUNTS BEFORE YOU CONCLUDE ANYTHING. Traffic is measured in
thousands and everything below it in single digits. That asymmetry is itself
the most important fact available to you, and a finding that ignores it — that
computes a conversion rate from eight people and recommends optimising it — is
worse than no finding. Where the data is too thin to support a conclusion, say
what would need to be instrumented or collected first, and mark it low
confidence.

CONSENT IS A CONSTRAINT ON EVERY SUGGESTION, and the CRM's size is misleading
about it. Of the 9,715 GoHighLevel contacts, 6,794 are business listings
scraped from Google Maps that never opted in to anything, and roughly 2,119 are
inbound noise — cold vendors and newsletters that landed in the CRM by
accident. Neither group is a marketing list. You may propose reaching a scraped
BUSINESS about its own listing, because that is a different thing from
marketing to a consumer, but say plainly that consent is absent and what the
compliant route is. Never propose bulk messaging the untagged noise, and never
propose SMS to anyone whose consent state is not known to be subscribed.

Findings that would be genuinely useful:
- a step of the pipeline with traffic arriving and no instrumentation to see
  what happens next
- a page with real views and zero clicks, sitting on the path to a conversion
- a CRM segment large enough to act on, with a specific next action
- a mismatch between where traffic comes from and what the site asks it to do
`.trim();

async function run(
  agent: ResearchAgent,
  brief: string,
  evidence: object,
): Promise<{ runId: string; findings: DraftFinding[]; error?: string }> {
  const runId = randomUUID();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { runId, findings: [], error: "GEMINI_API_KEY is not set." };

  const prompt = `${brief}\n\n${SHARED_RULES}\n\nEVIDENCE:\n${JSON.stringify(evidence, null, 2)}`;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = (res.text || "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) return { runId, findings: [], error: "Model did not return JSON." };
      parsed = JSON.parse(m[0]);
    }

    const findings = validateFindings(parsed, evidenceKeys(evidence));
    if (findings.length > 0) await saveFindings(agent, runId, findings);
    return { runId, findings };
  } catch (e) {
    return { runId, findings: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runContentResearch() {
  const evidence = await gatherContentEvidence();
  const r = await run("content", CONTENT_BRIEF, evidence);
  return { ...r, evidence };
}

export async function runCrmResearch() {
  const evidence = await gatherCrmEvidence();
  const r = await run("crm", CRM_BRIEF, evidence);
  return { ...r, evidence };
}
