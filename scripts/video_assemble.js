#!/usr/bin/env node
/**
 * Cut the generated assets into one finished landscape video. Free to re-run.
 *
 * NOTHING HERE COSTS MONEY, which is the reason it is a separate script from
 * video_build_assets.js. Timing, slide order and the picture-in-picture
 * position are all things you want to try three times; buying the footage
 * again each time would be absurd.
 *
 * ONE NORMALISATION SPEC FOR EVERY PART. HeyGen's MP4s and the slide segments
 * built here do not agree on frame rate, pixel format or audio layout, and the
 * concat demuxer does not reconcile them — it produces a file that plays until
 * the first mismatch and then goes black or silent. So every part is re-encoded
 * to the same spec BEFORE concatenation rather than after something breaks.
 *
 * NO ffprobe ON THIS MACHINE. @ffmpeg-installer ships ffmpeg alone, so
 * durations are parsed out of ffmpeg's own stderr banner. Narration durations
 * come from the sidecar HeyGen returned, which is exact.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG = require("@ffmpeg-installer/ffmpeg").path;
const ROOT = path.join("reference", "heygen", "gbp-vs-social");
const A = path.join(ROOT, "assets");
const S = path.join(ROOT, "slides");
const WORK = path.join(ROOT, "work");
const OUT = path.join(ROOT, "gbp-vs-social-FINAL.mp4");

// Shared spec. Every part is forced to this before concat.
const V = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-s", "1920x1080"];
const AU = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"];

const run = (args) => execFileSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: ["ignore", "pipe", "pipe"] });

/** Duration in seconds, read from ffmpeg's banner because ffprobe is absent. */
function duration(file) {
  try {
    execFileSync(FFMPEG, ["-i", file], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  }
  throw new Error(`could not read duration of ${file}`);
}

const narrationDuration = (id) =>
  JSON.parse(fs.readFileSync(path.join(A, `${id}.words.json`), "utf8")).duration;

/** The cut, in order. */
const PARTS = [
  { kind: "avatar", id: "s1" },
  { kind: "slides", id: "s2", slides: ["01-reach-intent", "02-fills-chair", "03-search-name"] },
  { kind: "slides", id: "s3", slides: ["04-they-ask", "05-crawlers", "06-no-page"] },
  { kind: "slides", id: "s4a", slides: ["07-rented"] },
  { kind: "pip", id: "s4b", bg: path.join(ROOT, "slide-chart.png") },
  { kind: "avatar", id: "s5" },
];

fs.mkdirSync(WORK, { recursive: true });
const built = [];

for (const p of PARTS) {
  const out = path.join(WORK, `${p.id}.mp4`);

  if (p.kind === "avatar") {
    /*
     * THE AVATAR FOOTAGE IS PORTRAIT AND CANNOT BE MADE OTHERWISE. The look is
     * preferred_orientation: portrait, and asking /v3/videos for aspect_ratio
     * 16:9 does not reframe it — HeyGen renders the portrait and pillarboxes it
     * inside a landscape canvas with wide near-white bars. Scaling that to fill
     * 1920x1080 just makes the bars bigger; cropping a 16:9 band out of 9:16
     * content means a 3x upscale of a face, which is worse.
     *
     * So the bars are cropped away and the real 610x1080 render is seated in a
     * right-hand column beside a designed panel. Two columns is a layout; white
     * bars are a defect. The crop box is the centred content area measured off a
     * frame — cropdetect cannot find it, because it only detects DARK borders
     * and these are white.
     */
    run([
      "-i", path.join(A, `${p.id}.mp4`),
      "-i", path.join(S, `panel-${p.id}.png`),
      "-filter_complex",
      "[0:v]crop=610:1080:655:0,scale=610:1080[av];" +
      "[1:v][av]overlay=1310:0[v]",
      "-map", "[v]", "-map", "0:a", ...V, ...AU, "-shortest", out,
    ]);
  }

  if (p.kind === "slides") {
    /*
     * Slide time is split evenly across the narration. Even splits, not word
     * timestamps: the sentences per slide are close enough in length that the
     * difference is under a second, and a wrong timestamp mapping would land a
     * slide change mid-clause, which reads as a mistake in a way a slightly
     * early change does not.
     */
    const total = narrationDuration(p.id);
    const each = total / p.slides.length;
    const inputs = [];
    p.slides.forEach((s) => inputs.push("-loop", "1", "-t", each.toFixed(3), "-i", path.join(S, `${s}.png`)));
    inputs.push("-i", path.join(A, `${p.id}.wav`));
    const chain = p.slides.map((_, i) => `[${i}:v]`).join("") + `concat=n=${p.slides.length}:v=1:a=0[v]`;
    run([...inputs, "-filter_complex", chain, "-map", "[v]", "-map", `${p.slides.length}:a`, ...V, ...AU, "-shortest", out]);
  }

  if (p.kind === "pip") {
    /*
     * The avatar sits over the real Search Console chart rather than cutting to
     * a talking head. The claim being made is about that graph, and taking it
     * off screen to say it would be strange.
     *
     * BOTTOM-LEFT, NOT BOTTOM-RIGHT. The first attempt put it bottom-right and
     * it covered the cliff and the "219" endpoint — the two marks the whole
     * slide exists to show. Bottom-left is the only region of the plot with no
     * data in it, because the line is at its highest there.
     *
     * The accent border is not decoration. The avatar footage has a bright
     * white background and this chart is near-black; without a frame the pane
     * reads as a rendering fault rather than a deliberate inset.
     */
    const d = duration(path.join(A, `${p.id}.mp4`));
    run([
      "-loop", "1", "-t", d.toFixed(3), "-i", p.bg,
      "-i", path.join(A, `${p.id}.mp4`),
      "-filter_complex",
      "[1:v]scale=520:-2,pad=iw+10:ih+10:5:5:0x38bdf8[pip];[0:v][pip]overlay=70:H-h-70[v]",
      "-map", "[v]", "-map", "1:a", ...V, ...AU, "-shortest", out,
    ]);
  }

  built.push(out);
  console.log(`  ${p.id.padEnd(5)} ${duration(out).toFixed(1)}s`);
}

const list = path.join(WORK, "concat.txt");
fs.writeFileSync(list, built.map((f) => `file '${path.resolve(f)}'`).join("\n"));
run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", OUT]);

const secs = duration(OUT);
console.log(`\n  FINAL  ${OUT}`);
console.log(`         ${Math.floor(secs / 60)}m ${(secs % 60).toFixed(0)}s   ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB   1920x1080\n`);
