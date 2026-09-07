#!/usr/bin/env node
/**
 * Cut the ranking short: six animated stills, counted down, overlays burned in.
 *
 *   node scripts/ranking/assemble.js --clips <dir> --overlays <dir> --out final.mp4
 *
 * ORDER IS THE FORMAT. The countdown runs 6 -> 1 and the payoff sits last, so
 * the file order is the retention structure — not an implementation detail. The
 * numbered filenames are read, not globbed, so a missing clip fails loudly
 * instead of silently shortening the video.
 *
 * EVERY CLIP IS RE-ENCODED TO ONE LADDER FIRST. Kling returned 1076x1928 and
 * 1088x1920 for the same request, and concat demuxing mismatched streams
 * produces a file that plays for one segment and then stalls.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const W = 1080, H = 1920, FPS = 30;

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const clipsDir = arg("clips", "experiments/ranking-fades/clips");
const ovDir = arg("overlays", "experiments/ranking-fades/overlays");
const out = arg("out", "experiments/ranking-fades/ranking-top-6-fades.mp4");
const work = arg("work", ".cache/ranking-fades");
fs.mkdirSync(work, { recursive: true });

const ORDER = [6, 5, 4, 3, 2, 1];

const pieces = [];
for (const n of ORDER) {
  const clip = path.join(clipsDir, `rank-${n}.mp4`);
  const ov = path.join(ovDir, `rank-${n}.png`);
  for (const f of [clip, ov]) {
    if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  }
  const piece = path.join(work, `piece-${n}.mp4`);
  /*
   * The overlay is composited BEFORE concat, not after, so each segment carries
   * its own rank number. Doing it after would need timed enable= expressions
   * that drift the moment one clip's duration differs by a frame.
   */
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", clip, "-i", ov,
    "-filter_complex",
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1[v];` +
    `[v][1:v]overlay=0:0:format=auto[o]`,
    "-map", "[o]", "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    piece,
  ], { stdio: "inherit" });
  pieces.push(piece);
  console.log(`  #${n} composited`);
}

const list = path.join(work, "concat.txt");
fs.writeFileSync(list, pieces.map((p) => `file '${path.resolve(p)}'`).join("\n") + "\n");
execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", out,
], { stdio: "inherit" });

const err = require("child_process").spawnSync(FF, ["-hide_banner", "-i", out], { encoding: "utf8" }).stderr || "";
const m = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
const secs = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
console.log(`\ndone  ${out}  ${secs.toFixed(1)}s  ${(fs.statSync(out).size / 1e6).toFixed(2)}MB`);
