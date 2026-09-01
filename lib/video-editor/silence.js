/**
 * Finding the dead air in a talking head, and deciding what to actually remove.
 *
 * ffmpeg's silencedetect does the listening. Everything here is the judgement
 * on top of it, kept pure and separate because this is where a silence cutter
 * goes wrong: it clips the front of words, it removes the breath that made the
 * delivery sound human, or it stacks up dozens of 40ms snips that add nothing
 * but re-encode time and a stuttery edit.
 *
 * WHY IT IS PLAIN JAVASCRIPT: scripts/cut_silence.js is CommonJS and cannot
 * import TypeScript. Same reason as ranges-core.js and lib/video-type.js.
 */

/**
 * ffmpeg writes silencedetect results to STDERR, interleaved with everything
 * else it says, in this shape:
 *
 *   [silencedetect @ 0x14f] silence_start: 1.234
 *   [silencedetect @ 0x14f] silence_end: 2.345 | silence_duration: 1.111
 *
 * A TRAILING silence_start WITH NO silence_end is normal and must be handled:
 * when a clip ends in silence there is nothing to close the pair, and a parser
 * that only reads matched pairs silently drops the most worthwhile cut in the
 * file — the dead tail after the last word, which is where an avatar render
 * routinely leaves a second or more of nothing.
 *
 * @param {string} stderr Raw ffmpeg output.
 * @param {number} duration Clip length, used to close an unterminated silence.
 * @returns {{start:number,end:number}[]} Silent spans, in order.
 */
function parseSilence(stderr, duration) {
  const out = [];
  let open = null;
  for (const line of String(stderr ?? "").split("\n")) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) { open = Math.max(0, Number(s[1])); continue; }
    const e = line.match(/silence_end:\s*(-?[\d.]+)/);
    if (e && open !== null) {
      const end = Number(e[1]);
      if (end > open) out.push({ start: open, end });
      open = null;
    }
  }
  if (open !== null && Number.isFinite(duration) && duration > open) {
    out.push({ start: open, end: duration });
  }
  return out;
}

/**
 * Turn silent spans into the spans worth cutting.
 *
 * PADDING IS THE WHOLE POINT. Cutting a silence at its exact detected edges
 * clips the attack of the next word — the consonant that starts it is quieter
 * than the threshold, so silencedetect counts it as part of the silence. Giving
 * back `pad` at each end keeps the breath and the consonant, and is the
 * difference between "tightened" and "chopped".
 *
 * DO NOT CUT WHAT IS NOT WORTH CUTTING. After padding, a span shorter than
 * `minCut` is dropped: removing 80ms is imperceptible as a saving and very
 * perceptible as a jump, and each one adds a segment to the select filter.
 *
 * @param {{start:number,end:number}[]} silences
 * @param {{pad?:number,minCut?:number,duration?:number,keepTailSilence?:boolean}} [opts]
 * @returns {{start:number,end:number}[]} Spans to REMOVE.
 */
const ms = (n) => Math.round(n * 1000) / 1000;

function silenceCuts(silences, opts = {}) {
  const pad = opts.pad ?? 0.15;
  const minCut = opts.minCut ?? 0.2;
  const cuts = [];
  for (const s of silences ?? []) {
    /*
     * The head and tail get no padding on the outside edge. There is no word to
     * protect before the first sound or after the last one, and padding there
     * just leaves dead air at exactly the two places it is most obvious.
     */
    const atHead = s.start <= 0.001;
    const atTail = opts.duration != null && s.end >= opts.duration - 0.001;
    /*
     * ROUNDED TO THE MILLISECOND, because that is the precision that survives.
     * selectFilter formats every boundary with toFixed(3), so a cut carrying
     * 3.0500000000000003 renders as 3.050 regardless — the extra digits are
     * fiction, and they leak into logs and comparisons where they read as real.
     */
    const start = ms(atHead ? s.start : s.start + pad);
    const end = ms(atTail ? s.end : s.end - pad);
    if (end - start >= minCut) cuts.push({ start, end });
  }
  return cuts;
}

/** How much a set of spans adds up to. */
function span(ranges) {
  return (ranges ?? []).reduce((t, r) => t + (r.end - r.start), 0);
}

module.exports = { parseSilence, silenceCuts, span };
