/**
 * Deciding WHERE cutaways go and whether a plan is coherent. No ffmpeg here.
 *
 * B-ROLL ON A TALKING HEAD IS NOT DECORATION — IT IS THE FIX FOR THE EDIT.
 * Silence cutting leaves a jump cut at every join: the head snaps to a slightly
 * different position with no motion between. Covering that instant with other
 * footage is how every edited interview in the world hides the same seam, and
 * it is why cutaways belong ON the joins rather than wherever a topic sounds
 * illustratable.
 *
 * Pure and separate for the usual reason: the overlap and clamping rules are
 * where a plan silently becomes nonsense — two cutaways that overlap render as
 * one on top of the other, and one running past the end renders as a freeze.
 */

const ms = (n) => Math.round(n * 1000) / 1000;

/**
 * Put a cutaway slightly BEFORE the join it is hiding.
 *
 * Landing exactly on the cut still shows one frame of the snap, because the
 * overlay switches on at the same instant the head moves. A small lead-in means
 * the cut happens while the viewer is already looking at something else, which
 * is the entire trick.
 */
const LEAD_IN = 0.25;

/**
 * @typedef {Object} Cutaway
 * @property {number} at      When the cutaway starts, seconds into the edit.
 * @property {number} seconds How long it covers.
 * @property {string} query   What to search for.
 */

/**
 * Anchor cutaways to the joins they are hiding, then make the plan legal.
 *
 * @param {Cutaway[]} plan
 * @param {{duration:number, joins?:number[], minGap?:number, snap?:number}} opts
 * @returns {{cutaways:Cutaway[], dropped:{cutaway:Cutaway,why:string}[]}}
 */
function planCutaways(plan, opts) {
  const duration = opts.duration;
  const joins = opts.joins ?? [];
  const minGap = opts.minGap ?? 0.5;
  const snap = opts.snap ?? 1.0;

  const dropped = [];
  const staged = [];

  for (const c of plan ?? []) {
    if (!c || !(c.seconds > 0)) { dropped.push({ cutaway: c, why: "no duration" }); continue; }
    if (!c.query) { dropped.push({ cutaway: c, why: "no search query" }); continue; }

    /*
     * SNAP TO THE NEAREST JOIN if there is one close by. The caller names a
     * moment in the script; the joins are where the edit actually needs
     * covering. When they nearly agree, the join wins — being a few frames off
     * the word is invisible, and being a few frames off the cut is the whole
     * artefact we are hiding.
     */
    let at = c.at;
    let nearest = null;
    for (const j of joins) {
      if (Math.abs(j - at) <= snap && (nearest === null || Math.abs(j - at) < Math.abs(nearest - at))) nearest = j;
    }
    if (nearest !== null) at = nearest;

    at = ms(Math.max(0, at - LEAD_IN));
    const end = ms(Math.min(duration, at + c.seconds));
    if (end - at < 0.4) { dropped.push({ cutaway: c, why: "runs past the end of the clip" }); continue; }
    staged.push({ ...c, at, seconds: ms(end - at) });
  }

  staged.sort((a, b) => a.at - b.at);

  /*
   * OVERLAPPING CUTAWAYS ARE NOT A STYLE, THEY ARE A BUG. Two overlays live at
   * once and the second draws on top of the first, so the earlier clip is
   * partly invisible and its duration is a lie. Drop rather than trim: a
   * silently shortened cutaway is how a plan stops matching what was rendered.
   */
  const out = [];
  for (const c of staged) {
    const last = out[out.length - 1];
    if (last && c.at < last.at + last.seconds + minGap) {
      dropped.push({ cutaway: c, why: `overlaps the cutaway at ${last.at}s` });
      continue;
    }
    out.push(c);
  }
  return { cutaways: out, dropped };
}

/** How much of the edit is covered by other footage. */
function coverage(cutaways, duration) {
  const total = (cutaways ?? []).reduce((t, c) => t + c.seconds, 0);
  return duration > 0 ? total / duration : 0;
}

module.exports = { planCutaways, coverage, LEAD_IN };
