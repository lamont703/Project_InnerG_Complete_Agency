#!/usr/bin/env node
/**
 * Burn captions into a video from its word-level transcript.
 *
 *   node scripts/add_captions.js in.mp4                        # <in>.words.json
 *   node scripts/add_captions.js in.mp4 --size 100 --margin 380
 *   node scripts/add_captions.js in.mp4 --no-upper --keep-ass
 *
 * WHITE LETTERS, BLACK OUTLINE, NO BOX. That is BorderStyle=1 in the generated
 * ASS; BorderStyle=3 would paint the box we are avoiding. See
 * lib/video-editor/captions.js for the rest of the reasoning.
 *
 * RUN THIS LAST. Captions belong on top of the b-roll, so this goes after
 * add_broll.js — otherwise a cutaway covers the words. It costs a second video
 * encode, which is the price of keeping each tool doing one thing; the audio is
 * copied through untouched, so the stings and the mix are not re-encoded.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");
const { chunkWords, buildAss } = require("../lib/video-editor/captions.js");

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

const input = process.argv[2];
if (!input || input.startsWith("--")) {
  console.error("Usage: node scripts/add_captions.js <in.mp4> [--words f.json] [--out out.mp4]");
  process.exit(1);
}
const FF = ffmpegPath();
const wordsFile = arg("words", input.replace(/\.mp4$/i, "") + ".words.json");
if (!fs.existsSync(wordsFile)) {
  console.error(`\nNo transcript at ${wordsFile}`);
  console.error(`Run: ~/.venvs/shearquery-whisper/bin/python scripts/transcribe_video.py ${input}\n`);
  process.exit(1);
}
const out = arg("out", input.replace(/\.mp4$/i, "") + ".captioned.mp4");

const words = JSON.parse(fs.readFileSync(wordsFile, "utf8")).words ?? [];
const probe = spawnSync(FF, ["-hide_banner", "-i", input], { encoding: "utf8" }).stderr || "";
const sm = probe.match(/,\s*(\d{2,5})x(\d{2,5})[^,]*,/);
const W = sm ? Number(sm[1]) : 1080, H = sm ? Number(sm[2]) : 1920;

const cues = chunkWords(words, {
  maxWords: Number(arg("max-words", 4)),
  maxChars: Number(arg("max-chars", 22)),
  maxSecs: Number(arg("max-secs", 1.4)),
});
const ass = buildAss(cues, {
  fontName: arg("font", "Arial Black"),
  fontSize: Number(arg("size", 92)),
  outline: Number(arg("outline", 6)),
  marginV: Number(arg("margin", 420)),
  upper: !has("no-upper"),
  playResX: W, playResY: H,
});

/*
 * The .ass path goes INTO a filter-graph string, where ':' separates options
 * and '\' escapes. A temp directory name is chosen by the OS and can contain
 * neither, but the safe move is to keep the path short and plain rather than
 * to escape it — so it is written to a fresh temp dir with an ASCII name.
 */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cap-"));
const assFile = path.join(tmp, "c.ass");
fs.writeFileSync(assFile, ass);

console.log(`\nin       ${input}  ${W}x${H}`);
console.log(`words    ${words.length} -> ${cues.length} cues`);
console.log(`style    white, ${arg("outline", 6)}px black outline, no box, ${arg("size", 92)}px`);
for (const c of cues.slice(0, 4)) console.log(`  ${c.start.toFixed(2)}  ${c.text}`);
if (cues.length > 4) console.log(`  ... ${cues.length - 4} more`);

if (has("dry")) { console.log(`\nDry run. ASS at ${assFile}\n`); process.exit(0); }

/*
 * fontsdir POINTS libass AT THE FONTS. This build has libass and libfreetype
 * but no fontconfig, so libass cannot look a family name up on the system — it
 * silently substitutes a default and the captions render in the wrong face
 * without any warning. Naming the directory is what makes "Arial Black" mean
 * Arial Black.
 */
const fontsdir = arg("fontsdir", "/System/Library/Fonts/Supplemental");
execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error", "-i", input,
  "-vf", `subtitles=${assFile}:fontsdir=${fontsdir}`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
  // Audio is copied: the stings and the limiter are not re-encoded.
  "-c:a", "copy", "-movflags", "+faststart", out,
], { stdio: "inherit" });

if (has("keep-ass")) fs.copyFileSync(assFile, out.replace(/\.mp4$/i, "") + ".ass");
else fs.rmSync(tmp, { recursive: true, force: true });

const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
console.log(`\nout      ${out}  ${mb(input)}MB -> ${mb(out)}MB\n`);
