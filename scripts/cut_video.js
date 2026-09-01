#!/usr/bin/env node
/**
 * Cut sections out of a video, locally, with no size ceiling.
 *
 * The browser tool at /admin/video-editor does the same job but cannot take a
 * file over 10MB: the Next runtime truncates a request body at exactly
 * 10,485,760 bytes and does not say so. This reads from disk, so there is no
 * upload and no limit.
 *
 * Usage:
 *   node scripts/cut_video.js input.mp4 10-25 1:40-2:05
 *   node scripts/cut_video.js input.mp4 10-25 --out trimmed.mp4
 *
 * Ranges are the parts to REMOVE. Accepts seconds (90), m:ss (1:30) or
 * h:mm:ss. Overlapping and out-of-order ranges are fine.
 */
const { execFileSync, execFile } = require("child_process");
const { existsSync, statSync } = require("fs");
const path = require("path");
const os = require("os");

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const p = path.join(__dirname, "..", "node_modules", "@ffmpeg-installer", `${process.platform}-${process.arch}`, "ffmpeg");
  return existsSync(p) ? p : "ffmpeg";
}

function parseTime(v) {
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const parts = v.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((a, p) => a * 60 + Number(p), 0);
}

function duration(file) {
  try { execFileSync(ffmpegPath(), ["-i", file], { stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) {
    const m = String(e.stderr).match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return null;
}

/*
 * The cut maths comes from the shared core now. This file used to carry its own
 * copy, with a comment admitting it was "the same rules as
 * lib/video-editor/ranges.ts" — which is a drift warning written down and then
 * left in place. The silence cutter would have been the third copy, so the
 * implementation moved to ranges-core.js and everything reads it: this script,
 * cut_silence.js, and lib/video-editor/ranges.ts for the TypeScript callers.
 */
const { keepRanges } = require("../lib/video-editor/ranges-core.js");

const argv = process.argv.slice(2);
const outIdx = argv.indexOf("--out");
const out = outIdx > -1 ? argv[outIdx + 1] : null;
const rest = outIdx > -1 ? argv.filter((_, i) => i !== outIdx && i !== outIdx + 1) : argv;
const [input, ...rangeArgs] = rest;

if (!input || !rangeArgs.length) {
  console.error("usage: node scripts/cut_video.js <input> <start-end> [start-end ...] [--out file.mp4]");
  console.error("   eg: node scripts/cut_video.js talk.mp4 10-25 1:40-2:05");
  process.exit(1);
}
if (!existsSync(input)) { console.error(`No such file: ${input}`); process.exit(1); }

const cuts = [];
for (const r of rangeArgs) {
  const [a, b] = r.split("-");
  const s = parseTime(a || ""), e = parseTime(b || "");
  if (s === null || e === null) { console.error(`Could not read range "${r}". Use 10-25 or 1:40-2:05.`); process.exit(1); }
  cuts.push({ start: s, end: e });
}

const total = duration(input);
if (!total) { console.error("Could not read that file as a video."); process.exit(1); }

const keep = keepRanges(cuts, total);
if (!keep.length) { console.error("Those cuts remove the whole video — nothing would be left."); process.exit(1); }

const kept = keep.reduce((s, r) => s + (r.end - r.start), 0);
const output = out || input.replace(/(\.[^.]+)?$/, "-edited.mp4");
const expr = keep.map((r) => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`).join("+");

console.log(`in   ${input}  ${total.toFixed(1)}s  ${(statSync(input).size / 1024 / 1024).toFixed(1)}MB`);
console.log(`cut  ${cuts.map((c) => `${c.start}-${c.end}`).join(", ")}`);
console.log(`keep ${keep.length} segment(s), ${kept.toFixed(1)}s`);
console.log(`out  ${output}\nrendering...`);

execFile(ffmpegPath(), [
  "-hide_banner", "-loglevel", "error", "-y", "-i", input,
  "-vf", `select='${expr}',setpts=N/FRAME_RATE/TB`,
  // N/SR/TB. Not STB — that is not an ffmpeg constant and the render dies on it.
  "-af", `aselect='${expr}',asetpts=N/SR/TB`,
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output,
], { maxBuffer: 1 << 26 }, (err) => {
  if (err) { console.error("ffmpeg failed:\n" + String(err.stderr || err.message).slice(0, 800)); process.exit(1); }
  console.log(`done — ${(statSync(output).size / 1024 / 1024).toFixed(1)}MB`);
});
