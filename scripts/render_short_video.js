#!/usr/bin/env node
/**
 * Renders a 9:16 news card as a YouTube Short — an actual MP4, with motion.
 *
 * VERTICAL ONLY. 1080x1920. Shorts are a vertical surface and nothing else is
 * useful here; a square or landscape export gets letterboxed or centre-cropped
 * into something nobody composed.
 *
 * ============================================================================
 * WHY FRAME-BY-FRAME AND NOT AN FFMPEG FILTER
 * ============================================================================
 * The obvious approach is one still plus `zoompan`, and this ffmpeg does have
 * it. It buys a push-in and nothing else: no counting stat, no staggered
 * reveal, no bar wiping down before its text arrives. Those transitions are the
 * difference between a card that moves and a clip that was directed.
 *
 * So the browser composes every frame. shorts-news.html exposes `__setT(t)`
 * for a normalised time 0..1, this steps t, screenshots, and ffmpeg encodes the
 * sequence.
 *
 * THE TIMELINE IS A PURE FUNCTION OF t, WHICH IS THE LOAD-BEARING PART. If the
 * page animated itself — CSS transitions, requestAnimationFrame — the renderer
 * would be screenshotting an animation running on the browser's clock while it
 * stepped on its own, and frames would land wherever the two happened to meet.
 * Rendering is then non-deterministic and, worse, only subtly wrong.
 *
 * ONE PAGE, REUSED. Reloading per frame would cost seconds each. The page loads
 * once and each frame is a `__setT` call plus a screenshot — roughly 40ms.
 *
 * AUDIO IS OPTIONAL AND TRIMMED TO THE VIDEO. Pass --audio and a start offset;
 * the track is cut to the clip's exact length with a short fade at each end, so
 * it never ends mid-syllable. Without it the Short is silent, which is a real
 * handicap on this surface — a silent Short is usually a skipped Short.
 *
 * Usage:
 *   node scripts/render_short_video.js --name sample
 *   node scripts/render_short_video.js --name sample --seconds 8 --fps 30
 *   node scripts/render_short_video.js --name sample \
 *     --audio "reference/Podcast Visuals/Podcast Episodes/ep01-written-exam-english.m4a" --audioStart 2
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const PAGE = path.join(__dirname, "podcast-visuals", "shorts-news.html");
const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Shorts");

const W = 1080, H = 1920;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const FIELDS = ["chip", "date", "stat", "label", "punch", "source", "brand", "tone", "question"];

async function main() {
  const name = arg("name", "short");
  const seconds = Number(arg("seconds", 8));
  const fps = Number(arg("fps", 30));
  const audio = arg("audio", null);
  const audioStart = Number(arg("audioStart", 0));
  const total = Math.round(seconds * fps);

  const params = new URLSearchParams();
  for (const k of FIELDS) {
    const v = arg(k, null);
    if (v) params.set(k, v);
  }
  params.set("w", String(W));
  params.set("h", String(H));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "short-frames-"));

  console.log(`\n  ${W}x${H} · ${seconds}s · ${fps}fps · ${total} frames`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(`file://${PAGE}?${params}`, { waitUntil: "load" });
    await page.waitForFunction("window.__ready === true", { timeout: 15000 });

    const started = Date.now();
    for (let i = 0; i < total; i++) {
      /**
       * The last 18% of the clip holds on the finished card. A Short loops, so
       * the viewer needs a beat to actually read it before it restarts —
       * animating right up to the loop point makes the card unreadable at the
       * only moment it is complete.
       */
      const raw = i / (total - 1);
      const t = Math.min(1, raw / 0.82);
      await page.evaluate((v) => window.__setT(v), t);
      const file = path.join(tmp, String(i).padStart(5, "0") + ".png");
      fs.writeFileSync(file, await page.screenshot({ type: "png" }));
      if (i % 30 === 0) process.stdout.write(`\r  frame ${i + 1}/${total}`);
    }
    process.stdout.write(`\r  frame ${total}/${total}  (${((Date.now() - started) / 1000).toFixed(1)}s)\n`);
    await page.close();
  } finally {
    await browser.close();
  }

  const out = path.join(OUT_DIR, `${name}.mp4`);
  const args = ["-y", "-framerate", String(fps), "-i", path.join(tmp, "%05d.png")];

  if (audio && fs.existsSync(audio)) {
    // Seek BEFORE -i so ffmpeg jumps rather than decoding to the offset.
    args.push("-ss", String(audioStart), "-i", audio);
  }

  args.push(
    "-c:v", "libx264",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",       // required or QuickTime and some phones show nothing
    "-crf", "18",                 // near-visually-lossless; flat colour compresses well
    "-preset", "slow",
    "-r", String(fps),
    "-movflags", "+faststart"     // metadata first, so it starts playing before it finishes downloading
  );

  if (audio && fs.existsSync(audio)) {
    args.push(
      "-c:a", "aac", "-b:a", "192k",
      "-af", `afade=t=in:st=0:d=0.4,afade=t=out:st=${Math.max(0, seconds - 0.6)}:d=0.6`,
      "-shortest"
    );
  }
  args.push(out);

  execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
  fs.rmSync(tmp, { recursive: true, force: true });

  const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  console.log(`\n  wrote  ${path.relative(process.cwd(), out)}  ${mb} MB${audio ? "  (with audio)" : "  (silent)"}`);
  console.log(`  Safe area is a DESIGN ASSUMPTION (22% bottom, 14% right) — confirm on one real upload.`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
