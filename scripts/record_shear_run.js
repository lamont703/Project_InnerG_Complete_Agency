#!/usr/bin/env node
/**
 * Records Shear Run to MP4, faster than real time.
 *
 * WHY NOT MediaRecorder. The obvious approach — captureStream() on the canvas
 * into a MediaRecorder — encodes in REAL TIME, because frame timestamps come
 * from the wall clock. Sixteen minutes of footage costs sixteen minutes, and
 * pushing frames faster just produces a sped-up video. Fine once; miserable
 * when you want to re-cut it.
 *
 * So the game exposes window.__step(), which advances the simulation by exactly
 * one frame and draws it. The recorder steps it, grabs the canvas as a PNG, and
 * pipes the stream straight into ffmpeg's stdin. The sim is deterministic and
 * clock-free, so the result is identical to what you would have watched live —
 * just produced as fast as the machine can manage.
 *
 * PIPED, NOT WRITTEN TO DISK. 30fps x 4 minutes is 7,200 PNGs; writing them out
 * and reading them back costs gigabytes of I/O for nothing. ffmpeg consumes the
 * frames as they arrive and only the MP4 lands.
 *
 * Usage:
 *   node scripts/record_shear_run.js                    # 4 clips x 4 min
 *   node scripts/record_shear_run.js --minutes 2        # shorter, for a look
 *   node scripts/record_shear_run.js --clips 6
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const GAME = path.join(__dirname, "podcast-visuals", "shear-run.html");
const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "shear-run");
const FPS = 30;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? Number(process.argv[i + 1]) : fallback;
};

async function recordClip(browser, seed, minutes) {
  const frames = Math.round(minutes * 60 * FPS);
  const out = path.join(OUT_DIR, `shear-run-${String(seed).padStart(2, "0")}-${minutes}min.mp4`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`file://${GAME}?seed=${seed}&palette=${seed}&manual=1`, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", { timeout: 20000 });

  // -crf 20 and yuv420p: this content is mostly flat black with hard neon
  // edges, which h264 handles well — but 4:2:0 chroma subsampling smears
  // saturated thin lines badly at low bitrate, and every wall here is a
  // saturated thin line. 20 is where that stops being visible.
  const ff = spawn(ffmpegPath, [
    "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "ignore", "pipe"] });

  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d.toString(); });
  const done = new Promise((res, rej) => {
    ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}\n${ffErr.slice(-800)}`))));
  });

  const canvas = await page.$("#c");
  process.stdout.write(`  seed ${seed}: `);
  for (let i = 0; i < frames; i++) {
    await page.evaluate("window.__step()");
    const buf = await canvas.screenshot({ type: "png", optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % Math.round(frames / 20) === 0) process.stdout.write("·");
  }
  ff.stdin.end();
  await done;
  await page.close();

  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(` ${path.basename(out)}  ${mb} MB`);
  return out;
}

async function main() {
  const minutes = arg("minutes", 4);
  const clips = arg("clips", 4);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Recording ${clips} clips x ${minutes} min at ${FPS}fps (${clips * minutes} min total)\n`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
  });

  const made = [];
  try {
    for (let seed = 1; seed <= clips; seed++) made.push(await recordClip(browser, seed, minutes));
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, "_about.json"), JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "scripts/podcast-visuals/shear-run.html — original work, no third-party IP",
    fps: FPS, resolution: "1920x1080", minutesEach: minutes,
    clips: made.map((f) => path.basename(f)),
    note: "Each clip is a different maze seed and palette. Deterministic: the same seed reproduces the same footage frame for frame, so a clip can be re-rendered longer or at a different resolution without redesigning it.",
    loopNote: "There is no score or HUD, so clips can be concatenated or shuffled without a visible reset. They do NOT loop seamlessly within themselves — the maze state differs at the cut. Crossfade ~0.5s between clips if the join shows.",
  }, null, 2) + "\n");

  console.log(`\n${made.length} clips in reference/Podcast Visuals/shear-run/`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
