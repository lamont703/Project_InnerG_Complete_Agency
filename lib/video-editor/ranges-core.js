/**
 * Turning "cut these bits out" into "keep these bits". THE one implementation.
 *
 * WHY PLAIN JAVASCRIPT. Three callers need this and they cannot share a
 * language: the Video Cutter UI and its route are TypeScript, while
 * scripts/cut_video.js and scripts/cut_silence.js are CommonJS and cannot
 * import a .ts file. So cut_video.js had already grown its own copy, with a
 * comment admitting it — "Same rules as lib/video-editor/ranges.ts" — and the
 * silence cutter would have been the third. Same reasoning as lib/video-type.js.
 *
 * lib/video-editor/ranges.ts is now a typed re-export of this file, so every
 * TypeScript caller and the existing test suite are unchanged.
 *
 * Pure, and separated from the ffmpeg call because this is where the bugs
 * actually are. Overlapping cuts, cuts that run past the end of the video, cuts
 * entered out of order and cuts that touch end to end all produce a filter
 * expression that ffmpeg accepts and silently renders wrong — a video one frame
 * long, or one with the wrong piece missing. None of that is visible until
 * somebody watches the output.
 */

const EPSILON = 0.001;

/** Sort, clamp to the clip, drop empties, and merge anything touching. */
function normaliseCuts(cuts, duration) {
  const clean = cuts
    .map((c) => ({ start: Math.max(0, Math.min(c.start, c.end)), end: Math.min(duration, Math.max(c.start, c.end)) }))
    .filter((c) => c.end - c.start > EPSILON)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const c of clean) {
    const last = merged[merged.length - 1];
    // Touching counts as overlapping. Two cuts that meet exactly would
    // otherwise leave a zero-length keep range between them, which becomes an
    // empty segment in the filter and a stutter in the output.
    if (last && c.start <= last.end + EPSILON) last.end = Math.max(last.end, c.end);
    else merged.push({ ...c });
  }
  return merged;
}

/** What survives. The inverse of the cuts, across the whole clip. */
function keepRanges(cuts, duration) {
  if (!(duration > 0)) return [];
  const merged = normaliseCuts(cuts, duration);
  const keep = [];
  let cursor = 0;
  for (const c of merged) {
    if (c.start - cursor > EPSILON) keep.push({ start: cursor, end: c.start });
    cursor = Math.max(cursor, c.end);
  }
  if (duration - cursor > EPSILON) keep.push({ start: cursor, end: duration });
  return keep;
}

function totalDuration(ranges) {
  return ranges.reduce((s, r) => s + (r.end - r.start), 0);
}

/**
 * The ffmpeg select expression for the surviving ranges.
 *
 * ONE PASS, FRAME ACCURATE. The obvious alternative — cut each keep range to a
 * temp file with -ss/-to and concat them — is faster with stream copy but lands
 * every cut on the nearest keyframe, so the edit drifts by up to a couple of
 * seconds from where it was placed. select+setpts re-encodes once and cuts
 * exactly where asked, which is the right trade for an editing tool: being
 * approximately where you clicked is the one thing it must not be.
 *
 * setpts/asetpts restamp what survives so the removed gaps close up instead of
 * leaving frozen frames and silence where the cuts were.
 *
 * The audio expression is N/SR/TB. It is NOT N/SR/STB — "STB" is not an ffmpeg
 * constant, and the whole render dies with "Undefined constant or missing '('".
 * Written the wrong way here first, and only found by running the real binary:
 * the string looks entirely plausible and no amount of reading it catches this.
 */
function selectFilter(keep) {
  if (!keep.length) return null;
  const expr = keep.map((r) => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`).join("+");
  return {
    video: `select='${expr}',setpts=N/FRAME_RATE/TB`,
    audio: `aselect='${expr}',asetpts=N/SR/TB`,
  };
}

/** "00:01:23.4" for the UI, and for talking about a cut out loud. */
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.0";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(1).padStart(4, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Parse "1:23.5", "83.5" or "00:01:23.5". Returns null on anything else. */
function parseTime(input) {
  const v = input.trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const parts = v.split(":");
  if (parts.length > 3 || parts.some((p) => p === "" || !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

module.exports = { EPSILON, normaliseCuts, keepRanges, totalDuration, selectFilter, formatTime, parseTime };
