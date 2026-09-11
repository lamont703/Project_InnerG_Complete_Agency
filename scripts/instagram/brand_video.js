#!/usr/bin/env node
/**
 * Stamp a translucent @shearquery watermark onto a finished video.
 *
 *   node scripts/instagram/brand_video.js --in=cut.mp4 --out=branded.mp4
 *   node scripts/instagram/brand_video.js --in=... --opacity=0.12 --size=0.055
 *   node scripts/instagram/brand_video.js --in=... --sample=12.5   (one frame, no encode)
 *
 * SAME MARK AS THE STILLS, DIFFERENT JOB. brand_image.js puts the wordmark in a
 * corner at 3.2% of the short side, because on a still it is a signature. A
 * centre watermark is a different thing — it exists to survive a re-upload by
 * somebody else — so it is bigger and much fainter, and it carries the @ so it
 * reads as the handle to go follow rather than as a logo bug.
 *
 * THE SPLIT IS STILL THE MARK. "@shear" in the foreground colour, "query" in
 * the accent, the same #fff / #00b2de as reel_hairstyles.html and
 * brand_image.js. Dropping to one colour to "keep it subtle" is not a subtler
 * logo, it is a different logo.
 *
 * WHY A PNG OVERLAY AND NOT drawtext. Two colours in one line means two
 * drawtext filters and hand-computed x offsets that have to be re-derived every
 * time the text or the font size changes. Rendering the mark once in Chrome
 * gives real kerning and the exact letterforms, and the overlay filter then has
 * one job. It is the same reasoning as brand_image.js preferring Chrome over
 * resvg: the letterforms ARE the asset.
 *
 * OPACITY IS THE ONE NUMBER WORTH ARGUING ABOUT, so it is a flag rather than a
 * constant, and --sample renders a single frame in about a second so it can be
 * judged before committing to a full encode. On the sage stick-figure film,
 * white at 0.18 sits about eight points above the background — present when you
 * look for it, gone when you are watching the film.
 *
 * IT NEVER OVERWRITES THE SOURCE, for the same reason brand_image.js doesn't:
 * the input is usually the only copy of a cut somebody assembled by hand.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const IN = arg("in");
const OUT = arg("out");
const OPACITY = Number(arg("opacity", 0.18));
const SIZE = Number(arg("size", 0.065));      // fraction of the SHORT side
const TEXT = arg("text", "@shearquery");
const SAMPLE = arg("sample", "");             // seconds; render one frame instead
const CRF = Number(arg("crf", 18));

/** The two brand values, from reel_hairstyles.html. Not configurable. */
const FG = "#ffffff";
const ACCENT = "#00b2de";

/** Read width and height off the container. ffprobe is not vendored here. */
function probe(file) {
  const out = execFileSync(FF, ["-hide_banner", "-i", file], {
    stdio: ["ignore", "ignore", "pipe"],
  }).toString?.() ?? "";
  return out;
}

function dimensions(file) {
  let stderr = "";
  try {
    execFileSync(FF, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    stderr = (e.stderr || "").toString();
  }
  const m = stderr.match(/Video:.*?,\s*(\d+)x(\d+)/);
  if (!m) throw new Error(`could not read the video size out of ${file}`);
  return { w: Number(m[1]), h: Number(m[2]), hasAudio: /Stream #\d+:\d+.*: Audio:/.test(stderr) };
}

async function renderMark(w, h, file) {
  const S = Math.min(w, h);
  const font = S * SIZE;
  /*
   * The shadow does the same work it does on a still: this mark sits over a
   * flat mid-tone sage for the whole film, and white on a light ground with no
   * edge is a watermark nobody can see — which is worse than none, because it
   * looks like the job was done.
   */
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  .f{position:relative;width:${w}px;height:${h}px}
  .brand{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    white-space:nowrap;
    font-family:"Helvetica Neue",Inter,system-ui,sans-serif;
    font-size:${font}px;font-weight:700;letter-spacing:-0.02em;line-height:1;
    color:${FG};text-shadow:0 ${font * 0.030}px ${font * 0.13}px rgba(0,0,0,.72),
                            0 0 ${font * 0.05}px rgba(0,0,0,.45)}
  .brand .q{color:${ACCENT}}
</style>
<div class="f"><div class="brand">@shear<span class="q">query</span></div></div>`,
    { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: "png", omitBackground: true });
  await browser.close();
  return Math.round(font);
}

async function main() {
  if (!IN) throw new Error("--in is required");
  if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);
  if (!SAMPLE && !OUT) throw new Error("--out is required (or use --sample=<seconds>)");
  if (OUT && path.resolve(IN) === path.resolve(OUT)) {
    throw new Error("--out must differ from --in; refusing to overwrite the source");
  }
  if (!(OPACITY > 0 && OPACITY <= 1)) throw new Error("--opacity must be between 0 and 1");

  const { w, h, hasAudio } = dimensions(IN);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqbrand-"));
  const markFile = path.join(tmp, "mark.png");
  const px = await renderMark(w, h, markFile);

  /*
   * colorchannelmixer=aa scales the overlay's existing alpha rather than
   * replacing it, so the antialiasing on the letter edges is preserved. Setting
   * a flat alpha instead gives the mark hard, aliased edges at low opacity.
   */
  const filter = `[1:v]format=rgba,colorchannelmixer=aa=${OPACITY}[m];[0:v][m]overlay=0:0:format=auto`;

  if (SAMPLE) {
    const out = OUT || path.join(tmp, "sample.png");
    execFileSync(FF, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", String(SAMPLE), "-i", IN, "-i", markFile,
      "-filter_complex", filter, "-frames:v", "1", out,
    ], { stdio: "inherit" });
    console.log(`  sample at ${SAMPLE}s  mark ${px}px @ ${OPACITY}  ->  ${out}`);
    return;
  }

  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", IN, "-i", markFile,
    "-filter_complex", filter,
    "-c:v", "libx264", "-preset", "medium", "-crf", String(CRF),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  ];
  /* Audio is stream-copied. Re-encoding it would be a second generation loss
   * for no gain — nothing in this pass touches the sound. */
  if (hasAudio) args.push("-c:a", "copy");
  args.push(path.resolve(OUT));
  execFileSync(FF, args, { stdio: "inherit" });

  const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);
  console.log(`  ${w}x${h}  @shearquery ${px}px centred @ ${OPACITY}  ->  ${OUT}  ${mb}MB`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
