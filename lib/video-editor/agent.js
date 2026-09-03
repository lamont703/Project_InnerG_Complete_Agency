/**
 * The agent that writes the edit plan — and, more importantly, the rules that
 * decide whether to believe it.
 *
 * WHAT THE MODEL IS ACTUALLY FOR. It is not editing. It reads what was said and
 * decides which moments want a picture and what that picture should be. Every
 * mechanical decision downstream — where the cut lands, how long the clip
 * holds, whether two collide — is arithmetic that already works and must not be
 * delegated to a language model.
 *
 * SO THE VALIDATOR IS THE REAL PRODUCT. Each rule below cost a bad render to
 * learn, and a plan that violates one is rejected rather than repaired: a
 * silently corrected plan is a plan nobody reviewed.
 */

const { findPhrase } = require("./align.js");
const { TRANSITIONS } = require("./transitions.js");

/** Whips carry the energy; dissolves carry the calm ones. */
const AGENT_TRANSITIONS = ["dissolve", "whip-left", "whip-right", "whip-up", "whip-down", "slide-up"];

const RULES = {
  /* The face IS the hook. Cutting away from it in the first seconds throws away
   * the only moment a viewer decides with. */
  earliestCutaway: 5,
  /* Two anchors closer than this cannot both hold; the planner drops one and
   * the edit silently loses a beat. Learned when "receipts" and "the lender"
   * landed 3.4s apart. */
  minSpacingSecs: 4,
  minCutaways: 3,
  maxCutaways: 6,
  /* Past roughly this the speaker stops being present in their own video. */
  maxCoverage: 0.45,
  minHold: 1.8,
  maxHold: 3.2,
};

/**
 * ANCHORS MUST COME FROM THE TRANSCRIPT, NOT THE SCRIPT, and this is the single
 * instruction that matters most. The transcript is what the model HEARD —
 * "your businesses", "your first share", "and ein is free". An anchor copied
 * from the written script may not exist in the audio, and an anchor that does
 * not resolve is a cutaway that never renders.
 */
function buildPrompt({ script, words, joins, duration, tracks }) {
  const transcript = (words ?? []).map((w) => w.word).join(" ");
  return `You are the editor for a vertical short. Decide where b-roll should cover the speaker.

WHAT HE SAYS (the written script, for meaning):
${script}

WHAT THE AUDIO ACTUALLY CONTAINS (${duration.toFixed(1)}s — copy anchors from HERE, exactly):
${transcript}

The video is ${duration.toFixed(1)}s. Silence cutting left joins at: ${(joins ?? []).map((j) => j.toFixed(1)).join(", ")}

RULES — a plan breaking any of these is thrown away, not fixed:
1. "anchor" must be a phrase of 3-6 words copied EXACTLY from the audio text above.
   Not from the script. The two differ: the transcript is what was heard.
2. Between ${RULES.minCutaways} and ${RULES.maxCutaways} cutaways.
3. Anchors at least ${RULES.minSpacingSecs}s apart in the audio. Two close together collide and one is dropped.
4. Nothing before ${RULES.earliestCutaway}s. The face is the hook.
5. "query" must name a PHYSICAL, FILMABLE thing: "barber cutting hair", "counting money",
   "signing documents". Stock search cannot film an abstraction — "opportunity", "trust"
   and "business growth" return charts, cartoons and gold bars. Two or three words.
6. "hold" between ${RULES.minHold} and ${RULES.maxHold} seconds.
7. "transition": one of ${AGENT_TRANSITIONS.join(", ")}. Whips are energetic; use them on
   the punchy beats and a dissolve on the reflective ones.
8. "sfx": "whoosh" on whips, omit it on dissolves.
9. "alternates": two more queries for the same moment, in case the first finds nothing.
   The stock library is strict — EVERY word of a two-word query must appear in a clip's
   tags — so make them ordinary stock vocabulary, not vivid writing. "barber haircut"
   and "counting money" find footage; "messy desk receipts" and "bank loan manager"
   find nothing at all. Simple beats descriptive here.

Also pick ONE music track for the whole video from this list, by exact filename:
${(tracks ?? []).map((t) => `  ${t}`).join("\n")}

Return JSON only:
{"cutaways":[{"anchor":"...","query":"...","alternates":["...","..."],"hold":2.8,"transition":"whip-up","sfx":"whoosh"}],
 "music":"exact filename.mp3","why":"one sentence on the visual thread"}`;
}

/**
 * Believe the plan only where it checks out.
 *
 * @returns {{cutaways:Array, music:string|null, rejected:{cutaway:any,why:string}[]}}
 */
function validatePlan(raw, { words, duration, tracks }) {
  const rejected = [];
  const out = [];
  const parsed = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(parsed.cutaways) ? parsed.cutaways : [];

  for (const c of list) {
    if (!c || typeof c !== "object") { rejected.push({ cutaway: c, why: "not an object" }); continue; }
    const anchor = typeof c.anchor === "string" ? c.anchor.trim() : "";
    const query = typeof c.query === "string" ? c.query.trim() : "";
    if (!anchor) { rejected.push({ cutaway: c, why: "no anchor" }); continue; }
    if (!query) { rejected.push({ cutaway: c, why: "no query" }); continue; }

    /*
     * THE CHECK THAT CATCHES A HALLUCINATED ANCHOR. The model may quote the
     * script instead of the transcript, or invent a phrase outright. Either way
     * findPhrase returns null and the cutaway is refused here rather than
     * vanishing silently at render time.
     */
    const hit = findPhrase(words, anchor, { minScore: 0.7 });
    if (!hit) { rejected.push({ cutaway: c, why: `anchor is not in the audio: "${anchor}"` }); continue; }
    if (hit.start < RULES.earliestCutaway) {
      rejected.push({ cutaway: c, why: `at ${hit.start.toFixed(1)}s — inside the hook` });
      continue;
    }

    const hold = Math.min(RULES.maxHold, Math.max(RULES.minHold, Number(c.hold) || 2.6));
    const transition = AGENT_TRANSITIONS.includes(c.transition) ? c.transition : "dissolve";
    const sfx = transition.startsWith("whip-") ? (c.sfx || "whoosh") : undefined;

    const alternates = Array.isArray(c.alternates)
      ? c.alternates.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim()).slice(0, 3)
      : [];
    out.push({ anchor, query, alternates, hold, transition, ...(sfx ? { sfx } : {}), _at: hit.start });
  }

  out.sort((a, b) => a._at - b._at);

  // Spacing: keep the earlier of any pair too close to both survive.
  const spaced = [];
  for (const c of out) {
    const last = spaced[spaced.length - 1];
    if (last && c._at - last._at < RULES.minSpacingSecs) {
      rejected.push({ cutaway: c, why: `${(c._at - last._at).toFixed(1)}s after "${last.anchor}" — too close` });
      continue;
    }
    spaced.push(c);
  }

  // Coverage: past this the speaker stops being present in their own video.
  const kept = [];
  let covered = 0;
  for (const c of spaced) {
    if (duration > 0 && (covered + c.hold) / duration > RULES.maxCoverage) {
      rejected.push({ cutaway: c, why: "would push b-roll past the coverage limit" });
      continue;
    }
    covered += c.hold;
    kept.push(c);
  }

  const music = (tracks ?? []).includes(parsed.music) ? parsed.music : null;
  return {
    cutaways: kept.slice(0, RULES.maxCutaways).map(({ _at, ...c }) => c),
    music,
    why: typeof parsed.why === "string" ? parsed.why : null,
    rejected,
  };
}

module.exports = { buildPrompt, validatePlan, RULES, AGENT_TRANSITIONS };
