import {
  deriveFadePlan,
  fadeName,
  guardById,
  HEIGHT_LABEL,
  BOTTOM_LABEL,
  type FadeSpec,
  type FadePlan,
} from "@/lib/fade-geometry";

/**
 * Turning a picked style into something a barber can act on — or argue with.
 *
 * THIS IS THE POINT OF THE WHOLE TOOL. A picture makes a barber guess. The
 * gap between what a client asks for and what the barber hears is the real,
 * expensive problem in this trade: "number two on the sides" means different
 * things to different people, and the cost of the mismatch is a bad cut and
 * sometimes a lost client.
 *
 * So the artifact that reaches the barber is INSTRUCTIONS, with the photos as
 * supporting evidence rather than the message. Instructions can be disagreed
 * with in advance — "that line's too high for your crown" is a conversation
 * worth having before the clippers start, and it cannot happen at all if all
 * the barber received was a picture.
 *
 * The fade vocabulary is not invented here. lib/fade-geometry.ts already models
 * the parameter space — height, bottom, guard ladder, placement relative to the
 * parietal ridge — and derives the pass order from it. This file only phrases
 * what that produces.
 *
 * NOT REGULATOR CLAIMS. Same standing rule as fade-geometry: TDLR does not
 * specify guard ladders and PSI does not grade a fade against a protractor.
 * These are craft conventions, and anything shown to a client says so.
 */

export interface LengthEstimate {
  /** Roughly how long the hair is now, in inches. */
  currentInches: number;
  /** How confident the person was. Self-reported, so never treated as measured. */
  source: "self_reported";
}

export interface Feasibility {
  achievable: boolean;
  /** Weeks until it would be, when it isn't yet. */
  weeksToWait: number | null;
  message: string;
}

/** Widely used rule of thumb for scalp hair growth. */
const GROWTH_INCHES_PER_MONTH = 0.5;

/**
 * Can this be cut today?
 *
 * WHY THIS EXISTS AT ALL. A style picker without it manufactures
 * disappointment: someone chooses a look that needs three inches on top,
 * arrives with one, and either leaves unhappy or the barber has to deliver the
 * bad news in the chair. Saying it up front costs nothing and turns a refusal
 * into a plan.
 *
 * The estimate is self-reported and the copy never pretends otherwise —
 * "about" and "roughly", never a measurement.
 */
export function assessFeasibility(
  spec: FadeSpec,
  length: LengthEstimate | null,
): Feasibility {
  const top = guardById(spec.topGuard);

  /*
   * An unknown guard is a bug, not a zero.
   *
   * GUARDS runs bald → #4 and nothing further. Treating a missing guard as
   * `?? 0` meant an invalid preset produced needed = 0, which made every style
   * look achievable at any length — a confident yes derived from a typo. Two
   * presets shipped with guards "5" and "8" and this is how they got through.
   */
  if (!top) {
    return {
      achievable: false,
      weeksToWait: null,
      message: `Unknown guard "${spec.topGuard}" — this style is misconfigured.`,
    };
  }
  const needed = top.inches;

  if (!length) {
    return {
      achievable: true,
      weeksToWait: null,
      message: "No length noted, so this assumes there's enough to work with.",
    };
  }

  // A fade needs meaningfully more length than the guard it finishes at —
  // the top has to be long enough to blend into rather than sit flush with it.
  const workable = needed * 1.5;
  if (length.currentInches >= workable) {
    return { achievable: true, weeksToWait: null, message: "Long enough to cut this now." };
  }

  const short = workable - length.currentInches;
  const weeks = Math.ceil((short / GROWTH_INCHES_PER_MONTH) * 4.3);
  return {
    achievable: false,
    weeksToWait: weeks,
    message:
      `That's about ${length.currentInches}" now and this wants roughly ${workable.toFixed(2)}" ` +
      `on top to blend into. Hair grows about half an inch a month, so give it ${weeks} ` +
      `week${weeks === 1 ? "" : "s"} — or ask your barber what works today.`,
  };
}

export interface BarberRequest {
  /** One line, the way a barber would say it. */
  headline: string;
  /** Where the line sits, in anatomy rather than inches. */
  placement: string;
  /** The guard ladder, shortest to longest. */
  ladder: string;
  /** Ordered passes, straight from deriveFadePlan. */
  steps: string[];
  /** Anything the client typed. */
  clientNote: string | null;
  feasibility: Feasibility;
  /** Stated on every request that reaches a person. */
  disclaimer: string;
}

export const CRAFT_DISCLAIMER =
  "This is a starting point, not a prescription — guard ladders are craft convention, " +
  "not a regulated standard. Your barber knows your head better than a web page does.";

export function buildBarberRequest(
  spec: FadeSpec,
  opts: { length?: LengthEstimate | null; clientNote?: string | null } = {},
): { request: BarberRequest; plan: FadePlan } {
  const plan = deriveFadePlan(spec);
  const ladder = plan.ladder.map((r) => r.guard.label).join(" → ");

  return {
    plan,
    request: {
      headline: fadeName(spec),
      placement: plan.placement,
      ladder: ladder || "single length, no ladder",
      steps: plan.steps.map((s) => (s.detail ? `${s.title} — ${s.detail}` : s.title)),
      clientNote: opts.clientNote?.trim() || null,
      feasibility: assessFeasibility(spec, opts.length ?? null),
      disclaimer: CRAFT_DISCLAIMER,
    },
  };
}

/**
 * The request as plain text, for an SMS or an email to the shop.
 *
 * Written to be readable on a phone between clients — the headline and the
 * placement carry the whole thing, and the pass list is there for a barber who
 * wants it rather than demanded of one who doesn't.
 */
export function requestAsText(req: BarberRequest, clientName?: string | null): string {
  const lines: string[] = [];
  lines.push(clientName ? `${clientName} is asking for:` : "Requested cut:");
  lines.push("");
  lines.push(req.headline.toUpperCase());
  lines.push(req.placement);
  lines.push(`Guards: ${req.ladder}`);
  if (req.clientNote) {
    lines.push("");
    lines.push(`They added: "${req.clientNote}"`);
  }
  if (!req.feasibility.achievable) {
    lines.push("");
    lines.push(`Heads up: ${req.feasibility.message}`);
  }
  lines.push("");
  lines.push(req.disclaimer);
  return lines.join("\n");
}

/** The presets the picker offers. Points in a parameter space, not a catalogue. */
export const STYLE_PRESETS: { id: string; label: string; blurb: string; spec: FadeSpec }[] = [
  { id: "taper", label: "Taper", blurb: "Cleans the edges, keeps the shape", spec: { height: "taper", bottom: "one", topGuard: "4" } },
  { id: "low-skin", label: "Low skin fade", blurb: "Skin at the bottom, line stays low", spec: { height: "low", bottom: "skin", topGuard: "4" } },
  { id: "low-shadow", label: "Low shadow fade", blurb: "Softer bottom, low line", spec: { height: "low", bottom: "shadow", topGuard: "4" } },
  { id: "mid-skin", label: "Mid skin fade", blurb: "The default fade, line at the ridge", spec: { height: "mid", bottom: "skin", topGuard: "4" } },
  { id: "mid-shadow", label: "Mid shadow fade", blurb: "Mid line, no bare skin", spec: { height: "mid", bottom: "shadow", topGuard: "4" } },
  { id: "high-skin", label: "High skin fade", blurb: "Line up near the crown, sharp", spec: { height: "high", bottom: "skin", topGuard: "4" } },
  { id: "bald-mid", label: "Bald fade", blurb: "Straight to skin, mid line", spec: { height: "mid", bottom: "skin", topGuard: "2" } },
  { id: "high-shadow", label: "High shadow fade", blurb: "High line, softer bottom", spec: { height: "high", bottom: "shadow", topGuard: "4" } },
];

/*
 * NO "LENGTH ON TOP" PRESET, and the omission is deliberate.
 *
 * GUARDS stops at #4 because it describes the FADE — the ladder from the
 * perimeter up to the line. What happens above that line is scissor work and
 * is not in this parameter space at all. A preset called "fade with length on
 * top" would have to express the top as a guard it cannot, which is how one
 * shipped here with topGuard "8" — a guard that does not exist. The length on
 * top belongs in the client's note until the model covers it.
 */

export { HEIGHT_LABEL, BOTTOM_LABEL };
export type { FadeSpec };
