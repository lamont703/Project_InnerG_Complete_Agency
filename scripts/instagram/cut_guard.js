#!/usr/bin/env node
/**
 * Cut the twelve Kling clips into the film.
 *
 *   node scripts/instagram/cut_guard.js
 *
 * EVERY CLIP IS FIVE SECONDS AND ALMOST NONE OF IT IS USED. Kling's minimum is
 * 5s, the format wants beats of one to two, so the cut is mostly deciding WHERE
 * in each clip the beat lives. The generated motion ramps in over the first
 * second, so most beats start around 0.6s rather than 0 — starting at zero
 * gives a held frame that reads as a freeze.
 *
 * The mirror gets the longest hold. It is the only shot the film is FOR, and a
 * payoff cut at the same rhythm as its setup does not land as a payoff.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const C = "experiments/guard-clips";
const W = 1080, H = 1920, FPS = 30;
const work = ".cache/guard-cut";
fs.mkdirSync(work, { recursive: true });

/* file, in-point, length, note */
const CUT = [
  ["01-cruising", 0.8, 1.5, "cruising, all normal"],
  ["02-arrives",  0.6, 1.2, "the mosquito arrives"],
  ["03-swat",     0.5, 1.8, "he swats — clippers still cutting"],
  ["04-nose",     1.2, 1.6, "it lands on his nose"],
  ["05-macro",    0.6, 1.2, "the guard has walked loose"],
  ["06-drop",     0.4, 0.9, "it falls"],
  ["07-cutting",  0.8, 1.6, "he keeps cutting, oblivious"],
  ["08-clap",     0.6, 1.4, "he kills it, delighted"],
  ["09-sees",     0.9, 1.3, "he sees the guard on the floor"],
  ["10-stripe",   0.8, 1.6, "the stripe"],
  ["11-lifts",    0.7, 1.5, "the client starts to look up"],
  ["12-mirror",   0.9, 2.6, "the mirror. hold."],
];

const pieces = [];
let total = 0;
for (const [name, ss, len, note] of CUT) {
  const src = path.join(C, `${name}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const out = path.join(work, `${name}.mp4`);
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(ss), "-i", src, "-t", String(len),
    /*
     * Re-encoded to one ladder, not stream-copied. Kling returned slightly
     * different frame sizes across the batch, and concat demuxing mismatched
     * streams plays the first segment then stalls.
     */
    "-vf", `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1`,
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", out,
  ], { stdio: "inherit" });
  pieces.push(out);
  total += len;
  console.log(`  ${String(len.toFixed(1)).padStart(4)}s  ${note}`);
}

const list = path.join(work, "concat.txt");
fs.writeFileSync(list, pieces.map((p) => `file '${path.resolve(p)}'`).join("\n") + "\n");
const silent = "experiments/films/the-guard-silent.mp4";
fs.mkdirSync("experiments/films", { recursive: true });
execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", silent,
], { stdio: "inherit" });
console.log(`\ndone  ${silent}  ${total.toFixed(1)}s  ${(fs.statSync(silent).size / 1e6).toFixed(2)}MB`);
