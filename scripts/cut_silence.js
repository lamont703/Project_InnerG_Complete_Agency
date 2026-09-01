#!/usr/bin/env node
/**
 * Remove the dead air from a talking head. Free, deterministic, no API keys.
 *
 *   node scripts/cut_silence.js in.mp4
 *   node scripts/cut_silence.js in.mp4 --dry
 *   node scripts/cut_silence.js in.mp4 --out tight.mp4 --threshold=-32 --pad=0.12
 *
 * THE FIRST EDIT WORTH MAKING, and the reason it comes before b-roll or music:
 * it needs nothing licensed, nothing generated and nothing paid for. An avatar
 * render pauses where a human would not — HeyGen renders the punctuation — so
 * there is usually real time to reclaim before anything creative happens.
 *
 * IT IS A TOOL, NOT A PIPELINE. The judgement lives in lib/video-editor/
 * silence.js and the cut maths in ranges-core.js, both pure and both tested.
 * This file is the ffmpeg plumbing around them, which is the part that cannot
 * be unit tested and therefore should contain as little thinking as possible.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseSilence, silenceCuts, span } = require("../lib/video-editor/silence.js");
const { keepRanges, selectFilter, totalDuration } = require("../lib/video-editor/ranges-core.js");

/**
 * PREFER THE MODERN BINARY. @ffmpeg-installer ships a 2018 build that has no
 * xfade and is missing a lot besides; ffmpeg-static is 6.x. The package version
 * is no guide here — @ffmpeg-installer is at its own latest and still ships
 * 2018 — so this picks by what is present, newest first.
 */
function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  for (const mod of ["ffmpeg-static", "@ffmpeg-installer/ffmpeg"]) {
    try {
      const r = require(mod);
      const p = typeof r === "string" ? r : r.path;
      if (p && fs.existsSync(p)) return p;
    } catch { /* try the next one */ }
  }
  return "ffmpeg";
}

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);

/**
 * Duration, read out of ffmpeg's own banner rather than with ffprobe.
 *
 * ffmpeg-static ships ONLY ffmpeg — there is no ffprobe in the package — so
 * reaching for one is how this breaks on a machine that has no system ffmpeg.
 * The analysis pass prints "Duration: 00:00:32.10" anyway, so it costs nothing.
 */
function durationFrom(stderr) {
  const m = String(stderr).match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const input = process.argv[2];
if (!input || input.startsWith("--")) {
  console.error("Usage: node scripts/cut_silence.js <input.mp4> [--out out.mp4] [--dry]");
  process.exit(1);
}
if (!fs.existsSync(input)) { console.error(`No such file: ${input}`); process.exit(1); }

const FF = ffmpegPath();
const threshold = Number(arg("threshold", -30));   // dBFS below which it counts as silence
const minSilence = Number(arg("min-silence", 0.35)); // shorter gaps are just speech rhythm
const pad = Number(arg("pad", 0.15));
const minCut = Number(arg("min-cut", 0.2));
const out = arg("out", input.replace(/\.mp4$/i, "") + ".tight.mp4");

console.log(`\nffmpeg  ${execFileSync(FF, ["-version"], { encoding: "utf8" }).split("\n")[0].replace("ffmpeg version ", "")}`);
console.log(`in      ${input}`);

// One analysis pass: no output file, just the detector's report on stderr.
let report = "";
try {
  execFileSync(FF, ["-hide_banner", "-i", input,
    "-af", `silencedetect=noise=${threshold}dB:d=${minSilence}`,
    "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
} catch (e) {
  report = String(e.stderr ?? "");           // ffmpeg exits non-zero writing to null on some builds
}
if (!report) {
  // Some builds exit 0; re-run capturing stderr properly.
  const r = require("child_process").spawnSync(FF, ["-hide_banner", "-i", input,
    "-af", `silencedetect=noise=${threshold}dB:d=${minSilence}`, "-f", "null", "-"], { encoding: "utf8" });
  report = String(r.stderr ?? "");
}

const duration = durationFrom(report);
if (!Number.isFinite(duration)) { console.error("Could not read the clip duration from ffmpeg."); process.exit(1); }

const silences = parseSilence(report, duration);
const cuts = silenceCuts(silences, { pad, minCut, duration });
const keep = keepRanges(cuts, duration);
const kept = totalDuration(keep);

console.log(`length  ${duration.toFixed(2)}s`);
console.log(`silence ${silences.length} span(s), ${span(silences).toFixed(2)}s total (at ${threshold}dB, min ${minSilence}s)`);
console.log(`cutting ${cuts.length} span(s), ${span(cuts).toFixed(2)}s  (${pad}s padding kept either side)`);
for (const c of cuts) console.log(`          ${c.start.toFixed(2)} -> ${c.end.toFixed(2)}  (${(c.end - c.start).toFixed(2)}s)`);
console.log(`result  ${kept.toFixed(2)}s in ${keep.length} segment(s) — ${(100 - (kept / duration) * 100).toFixed(1)}% shorter`);

if (!cuts.length) { console.log("\nNothing worth cutting.\n"); process.exit(0); }
if (has("dry")) { console.log("\nDry run — nothing written.\n"); process.exit(0); }

const f = selectFilter(keep);
if (!f) { console.error("Those cuts would remove the whole clip."); process.exit(1); }

execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", input,
  "-vf", f.video, "-af", f.audio,
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], { stdio: "inherit" });

const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
console.log(`\nout     ${out}  ${mb(input)}MB -> ${mb(out)}MB\n`);
