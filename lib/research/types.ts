/**
 * Shared shapes for the two research agents.
 *
 * Deliberately no I/O here so the validator can be tested without a database or
 * a model call — the validator is where most of the value sits, because it is
 * the thing that stops an unfalsifiable suggestion reaching the operator.
 */

import { isListicleTitle, VIDEO_TYPE_IDS } from "@/lib/video-type";

export type VideoTypeId = "grid" | "data" | "avatar";

export type ResearchAgent = "content" | "crm";
export type Confidence = "high" | "medium" | "low";
export type FindingStatus = "new" | "actioned" | "dismissed";

export interface ResearchFinding {
  id: string;
  agent: ResearchAgent;
  runId: string;
  title: string;
  suggestion: string;
  rationale: string | null;
  category: string | null;
  /** The numbers the finding was reasoned from. Never empty — see validate(). */
  evidence: Record<string, unknown>;
  confidence: Confidence;
  status: FindingStatus;
  operatorNote: string | null;
  createdAt: string;
}

/** What a run produced, before anything is written down. */
export interface DraftFinding {
  title: string;
  suggestion: string;
  rationale: string;
  category: string;
  evidence: Record<string, unknown>;
  confidence: Confidence;
  /**
   * Which pipeline this idea is for. Chosen deliberately rather than inferred
   * from the headline — see the note on validateFindings.
   */
  videoType: VideoTypeId;
  /** Data reels only: the figure and the line under it. */
  stat: string | null;
  label: string | null;
}

const CONFIDENCES: Confidence[] = ["high", "medium", "low"];

/**
 * Turn raw model output into findings worth showing a person.
 *
 * EVERY RULE HERE IS A REJECTION, NOT A REPAIR. A suggestion the model could
 * not ground in numbers is not improved by inventing numbers for it, and a
 * title it did not write is not improved by generating one. The failure mode
 * this guards against is a page full of confident, unfalsifiable advice —
 * "post more about barbering", "follow up with leads faster" — which reads like
 * research and cannot be acted on or checked.
 *
 * `allowedEvidenceKeys` is the key rule: the agent may only cite numbers that
 * were actually put in front of it. Without that check a model will happily
 * write {"searches": 1200} for a query that was run twice, and the finding
 * becomes a lie with a citation attached.
 */

/**
 * Does this title use the shape that actually earns attention on this channel?
 *
 * A SMALL LEADING COUNT, and the boundary is not arbitrary. Measured across the
 * channel's own 2026 output:
 *
 *   "N ___" listicle   15 videos   median 392   RETENTION 154.6%
 *   everything else     7 videos   median 183   RETENTION  90.6%
 *
 * Retention above 100% means viewers loop, which is what Shorts distributes on,
 * so the gap compounds instead of staying at 2x.
 *
 * A LEADING DIGIT IS NOT ENOUGH, and this is the case that defines the rule.
 * "569 Texas Barbershops Have a Perfect 5.0" starts with a number and died at
 * 123 views. So it is not the number that works — it is the promise of THINGS
 * TO LOOK AT. Six is a count of items the viewer will see. 569 is a statistic,
 * which is a conclusion, and a conclusion gives nobody a reason to keep
 * watching.
 *
 * Hence 2 to 12: large enough to be a list, small enough that it cannot be a
 * population count. Above that it is a statistic wearing a listicle's clothes.
 */
/*
 * ONE DEFINITION, shared with the renderer. This used to be the rule's third
 * copy — here, and again in scripts/render_queued.js, which could not import
 * TypeScript. The copies decided the same thing in two places, and the
 * publisher board now PRICES a card from that decision, so a drift between
 * them would misquote what a click costs. lib/video-type.js is plain
 * JavaScript for exactly that reason: Node requires it, Next bundles it.
 */
export const isWinningTitleShape: (title: string) => boolean = isListicleTitle;

export function validateFindings(
  raw: unknown,
  allowedEvidenceKeys: Set<string>,
): DraftFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: DraftFinding[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const title = typeof o.title === "string" ? o.title.trim().slice(0, 160) : "";
    const suggestion = typeof o.suggestion === "string" ? o.suggestion.trim().slice(0, 1200) : "";
    const rationale = typeof o.rationale === "string" ? o.rationale.trim().slice(0, 1200) : "";
    if (!title || !suggestion || !rationale) continue;

    const evidence =
      o.evidence && typeof o.evidence === "object" && !Array.isArray(o.evidence)
        ? (o.evidence as Record<string, unknown>)
        : null;
    // A finding with no numbers behind it is an opinion. Opinions are cheap and
    // this page is not for them.
    if (!evidence || Object.keys(evidence).length === 0) continue;

    // Every cited key must be one the agent was actually shown.
    const keys = Object.keys(evidence);
    if (!keys.every((k) => allowedEvidenceKeys.has(k))) continue;

    let confidence = CONFIDENCES.includes(o.confidence as Confidence)
      ? (o.confidence as Confidence)
      : "low";

    /*
     * FLAGGED, NOT DISCARDED — and the asymmetry with the evidence check above
     * is deliberate. A finding with no numbers behind it contains nothing; it
     * is an opinion and it is dropped. A finding with a bad TITLE still
     * contains a real idea that the evidence supports. "The Truth About Rent
     * Credit Reporting" and "6 Questions to Ask Before You Rent a Booth" are
     * the same insight in different packaging, and throwing away the insight
     * to punish the packaging would be the wrong trade.
     *
     * So it survives, sorted down and labelled. The label matters: an operator
     * queued an off-format title straight into the publisher because nothing on
     * the card said it was off-format, and low confidence alone is too quiet to
     * stop that.
     */
    /*
     * THE FORMAT IS CHOSEN, NOT INFERRED. An unrecognised value is ignored and
     * derived instead — a typo must not route a render at a pipeline that does
     * not exist. `stat` marks a data reel; a small leading count marks a grid.
     */
    const askedFor = [o.videoType, o.video_type, o.format].find(
      (v) => typeof v === "string" && VIDEO_TYPE_IDS.includes(v),
    ) as VideoTypeId | undefined;

    const stat = typeof o.stat === "string" && o.stat.trim() ? o.stat.trim().slice(0, 24) : null;
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 120) : null;

    let videoType: VideoTypeId =
      askedFor ?? (stat ? "data" : isWinningTitleShape(title) ? "grid" : "avatar");

    let rationaleOut = rationale;

    /*
     * A DATA REEL WITHOUT A FIGURE CANNOT RENDER. render_short_video.js animates
     * the number; there is nothing to animate without one. Demoted rather than
     * dropped, because the idea survives even when the packaging does not — but
     * loudly, because a silent demotion is a plan nobody reviewed.
     */
    if (videoType === "data" && (!stat || !label)) {
      videoType = "avatar";
      confidence = "low";
      rationaleOut =
        `ASKED FOR A DATA REEL WITH NO FIGURE — a data reel animates a number and a ` +
        `line under it, and this finding supplied ${stat ? "no label" : "no stat"}. ` +
        `Routed to the avatar instead. ` + rationale;
    } else if (videoType === "grid" && !isWinningTitleShape(title)) {
      /*
       * A CONTRADICTION, not a style note. The grid walks six cuts with a number
       * on screen, and the caption asks the viewer to comment one. A title that
       * does not say how many is a title for a different video.
       */
      confidence = "low";
      rationaleOut =
        `GRID WITH NO COUNT — the hairstyle grid shows six items and puts the number ` +
        `on screen, so the title has to say how many. Reshape to "N things..." or ` +
        `pick another format. ` + rationale;
    } else if (videoType === "avatar" && !isWinningTitleShape(title)) {
      /*
       * Still worth saying, but it is a packaging nudge rather than an error:
       * an avatar can carry a title of any shape, it just tends to do worse.
       */
      rationaleOut =
        `OFF-FORMAT TITLE — this channel's listicles hold 154.6% retention against ` +
        `90.6% for everything else. A number-first reshape is usually worth it. ` +
        rationale;
    }

    const category =
      typeof o.category === "string" && o.category.trim()
        ? o.category.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40)
        : "uncategorised";

    out.push({
      title, suggestion, rationale: rationaleOut.slice(0, 1200), category, evidence, confidence,
      videoType, stat: videoType === "data" ? stat : null, label: videoType === "data" ? label : null,
    });
  }

  return out;
}
