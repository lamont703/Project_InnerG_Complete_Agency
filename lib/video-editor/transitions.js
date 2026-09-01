/**
 * How a cutaway ARRIVES and LEAVES. The difference between footage appearing
 * and footage cutting in.
 *
 * WHY THIS IS ITS OWN MODULE AND WHY IT IS TESTED. It builds ffmpeg filter
 * strings, which is the single most bug-prone thing in this pipeline and the
 * least visible: an expression ffmpeg accepts but reads differently renders a
 * video that is wrong rather than a video that errors. This repo has already
 * paid for that lesson once — `asetpts=N/SR/STB` looked entirely plausible,
 * is not a real constant, and killed a render with a message about nothing.
 * Asserting the built string is the only cheap way to catch that class.
 *
 * NOT xfade, AND THE REASON MATTERS. xfade dissolves two whole streams into one
 * and is the obvious reach now that the modern binary has it — but it consumes
 * both inputs end to end and returns a single timeline, which is wrong for a
 * cutaway: the speaker has to keep running UNDERNEATH so the audio and the
 * performance are untouched. So cutaways stay overlays, and the animation is
 * done on the overlay's alpha and position instead.
 */

/** How long the animation takes at each end. Short: this is a Short. */
const DEFAULT_DUR = 0.35;

const TRANSITIONS = [
  "cut", "dissolve",
  "slide-left", "slide-right", "slide-up", "slide-down",
  // A whip is the same geometry moving roughly three times as fast. At 0.12s
  // the eye reads a snap rather than a slide, which is what makes it feel
  // energetic instead of smooth — and it is the transition a whoosh is scored
  // to, because there is a single obvious instant to hit.
  "whip-left", "whip-right", "whip-up", "whip-down",
];

/** A whip is fast by definition; anything slower is just a slide. */
const WHIP_DUR = 0.12;

const n = (v) => Number(v).toFixed(3);

/**
 * How long this cutaway's transition takes at each end.
 *
 * EXPORTED BECAUSE TWO PLACES NEED THE SAME ANSWER. expandHold() adds the
 * transitions around a hold, and this module carves them into the filter — and
 * they disagreed: expandHold assumed 0.35s for everything, so a whip was padded
 * by 0.7s while the render only used 0.24s. The cutaway came out 0.46s longer
 * than intended, which was enough to collide with its neighbour and get one
 * dropped. Two functions deciding the same number is the bug; one is the fix.
 */
function transitionSecsFor(c, fallback) {
  const kind = TRANSITIONS.includes(c && c.transition) ? c.transition : "dissolve";
  if (kind === "cut") return 0;
  if (c && c.transitionSecs != null) return c.transitionSecs;
  return kind.startsWith("whip-") ? WHIP_DUR : (fallback ?? DEFAULT_DUR);
}

/**
 * The filter chain for one cutaway.
 *
 * @param {number} i Index of the cutaway; input stream is i+1.
 * @param {{at:number,seconds:number,transition?:string,transitionSecs?:number}} c
 * @param {{W:number,H:number,FPS:number,prevLabel:string}} o
 * @returns {{chain:string[], label:string}}
 */
function cutawayFilters(i, c, o) {
  const { W, H, FPS, prevLabel } = o;
  const at = c.at;
  const end = c.at + c.seconds;
  const kind = TRANSITIONS.includes(c.transition) ? c.transition : "dissolve";
  /*
   * The animation cannot be longer than half the cutaway, or the incoming and
   * outgoing halves overlap and the clip never fully arrives — it fades up and
   * straight back down, which looks like a glitch rather than a transition.
   */
  const isWhip = kind.startsWith("whip-");
  const d = Math.min(transitionSecsFor(c), c.seconds / 2 - 0.01);
  const dir = isWhip ? kind.replace("whip-", "slide-") : kind;

  const base =
    `[${i + 1}:v]trim=start=0:duration=${n(c.seconds)},setpts=PTS-STARTPTS+${n(at)}/TB,` +
    `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;

  const chain = [];
  let xExpr = "0";
  let yExpr = "0";

  if (kind === "dissolve" || d <= 0) {
    /*
     * format=yuva420p FIRST. fade's alpha option needs an alpha channel to
     * write into; on a yuv420p stream the option is accepted and does nothing,
     * so the transition silently becomes a hard cut. Nothing warns.
     */
    chain.push(
      `${base},format=yuva420p,` +
      `fade=t=in:st=${n(at)}:d=${n(d)}:alpha=1,` +
      `fade=t=out:st=${n(end - d)}:d=${n(d)}:alpha=1[b${i}]`
    );
  } else {
    chain.push(`${base}[b${i}]`);
    // Slide in from off-frame, hold, then slide back out the same way.
    const p = `(t-${n(at)})/${n(d)}`;                 // 0 -> 1 across the entry
    const q = `(t-${n(end - d)})/${n(d)}`;            // 0 -> 1 across the exit
    if (dir === "slide-left" || dir === "slide-right") {
      const sign = dir === "slide-left" ? "" : "-";
      xExpr = `if(lt(t,${n(at + d)}), ${sign}${W}*(1-${p}), if(gt(t,${n(end - d)}), ${sign}${W}*${q}, 0))`;
    } else {
      const sign = dir === "slide-up" ? "" : "-";
      yExpr = `if(lt(t,${n(at + d)}), ${sign}${H}*(1-${p}), if(gt(t,${n(end - d)}), ${sign}${H}*${q}, 0))`;
    }
  }

  const label = `v${i}`;
  chain.push(
    `[${prevLabel}][b${i}]overlay=x='${xExpr}':y='${yExpr}':` +
    `enable='between(t,${n(at)},${n(end)})'[${label}]`
  );
  return { chain, label };
}

module.exports = { cutawayFilters, transitionSecsFor, TRANSITIONS, DEFAULT_DUR, WHIP_DUR };
