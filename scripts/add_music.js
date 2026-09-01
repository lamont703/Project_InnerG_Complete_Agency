#!/usr/bin/env node
/**
 * Lay a ducked music bed under a finished edit.
 *
 *   node scripts/add_music.js in.mp4 --track "reference/YouTube Music Tracks/Intellect - Yung Logos.mp3"
 *   node scripts/add_music.js in.mp4 --track "..." --gain 0.25
 *   node scripts/add_music.js --list
 *
 * THE VIDEO STREAM IS COPIED, NOT RE-ENCODED. Music is an audio change, so
 * there is no reason to pay for another picture encode — this can be run last,
 * or re-run at a different level, without degrading anything.
 *
 * ATTRIBUTION IS THE USER'S TO CHECK. The YouTube Audio Library marks some
 * tracks as requiring credit in the description and some as not, per track, and
 * that flag is not carried in the mp3. This writes the track into a credits
 * file so the question can be answered later; it does not answer it.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { bedGraph } = require("../lib/video-editor/music.js");

const LIBRARY = path.join("reference", "YouTube Music Tracks");

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  for (const mod of ["ffmpeg-static", "@ffmpeg-installer/ffmpeg"]) {
    try {
      const r = require(mod);
      const p = typeof r === "string" ? r : r.path;
      if (p && fs.existsSync(p)) return p;
    } catch { /* next */ }
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
const FF = ffmpegPath();

if (has("list")) {
  for (const f of fs.readdirSync(LIBRARY).filter((f) => /\.(mp3|m4a|wav)$/i.test(f)).sort()) {
    console.log(`  ${f}`);
  }
  process.exit(0);
}

const input = process.argv[2];
if (!input || input.startsWith("--")) {
  console.error("Usage: node scripts/add_music.js <in.mp4> --track <file> [--gain 0.35]");
  console.error("       node scripts/add_music.js --list");
  process.exit(1);
}
let track = arg("track");
if (!track) { console.error(`--track is required. See --list for what is in ${LIBRARY}/`); process.exit(1); }
if (!fs.existsSync(track)) {
  const guess = path.join(LIBRARY, track);
  if (fs.existsSync(guess)) track = guess;
  else { console.error(`No such track: ${track}`); process.exit(1); }
}
const out = arg("out", input.replace(/\.mp4$/i, "") + ".music.mp4");

const probe = spawnSync(FF, ["-hide_banner", "-i", input], { encoding: "utf8" }).stderr || "";
const dm = probe.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
if (!dm) { console.error("Could not read the clip duration."); process.exit(1); }
const duration = Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]);

const { graph, label } = bedGraph({
  duration,
  gain: Number(arg("gain", 0.35)),
  fadeIn: Number(arg("fade-in", 1.5)),
  fadeOut: Number(arg("fade-out", 2.5)),
  ratio: Number(arg("ratio", 12)),
  release: Number(arg("release", 350)),
});

console.log(`\nin       ${input}  ${duration.toFixed(2)}s`);
console.log(`track    ${path.basename(track)}`);
console.log(`bed      gain ${arg("gain", 0.35)}, ducked under the voice (ratio ${arg("ratio", 12)})`);

if (has("dry")) { console.log(`\nDry run.\n${graph}\n`); process.exit(0); }

execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error", "-i", input, "-i", track,
  "-filter_complex", graph,
  "-map", "0:v", "-map", `[${label}]`,
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
  "-movflags", "+faststart", out,
], { stdio: "inherit" });

const credits = out.replace(/\.mp4$/i, "") + ".music.json";
fs.writeFileSync(credits, JSON.stringify({
  video: path.basename(out),
  track: path.basename(track),
  source: "YouTube Audio Library (downloaded by hand)",
  note: "Check whether this track requires attribution in the video description — " +
        "the Audio Library marks that per track and the flag is not stored in the mp3.",
}, null, 2));

const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
console.log(`\nout      ${out}  ${mb(input)}MB -> ${mb(out)}MB`);
console.log(`credits  ${credits}\n`);
