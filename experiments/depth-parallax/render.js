#!/usr/bin/env node
/**
 * Render a still + its depth map into a 9:16 parallax clip.
 *
 *   node experiments/depth-parallax/render.js
 *   node experiments/depth-parallax/render.js --seconds=6 --move=orbit --strength=0.06
 *
 * EXPERIMENT ONLY. Self-contained in experiments/depth-parallax; delete the
 * directory and nothing in the app notices.
 *
 * Same frame-stepping discipline as scripts/render_short_video.js: the page
 * exposes __setT(t) and never animates itself, so a frame is a deterministic
 * function of its timestamp rather than whatever the browser's clock was doing
 * when the screenshot fired.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=")[1] : d; };
const SECONDS = Number(arg("seconds", 6));
const FPS = Number(arg("fps", 30));
const MOVE = arg("move", "orbit");
const STRENGTH = arg("strength", "0.055");
const W = 1080, H = 1920;

const HERE = __dirname;
const OUT = path.join(HERE, "out");

(async () => {
  const imgs = fs.readdirSync(path.join(HERE, "images")).filter((f) => f.endsWith(".jpg")).sort();
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    // --enable-unsafe-swiftshader is load-bearing: without it headless Chrome
    // hands back a null WebGL context, the shader setup throws, and the page
    // dies before it defines __load. The symptom is "window.__load is not a
    // function", which points at the wrong file entirely.
    args: [
      "--no-sandbox", "--force-color-profile=srgb",
      "--use-gl=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader",
    ],
  });

  for (const img of imgs) {
    const stem = path.basename(img, ".jpg");
    const depth = path.join(HERE, "depth", stem + "-depth.png");
    if (!fs.existsSync(depth)) { console.log(`  skip ${stem} (no depth map)`); continue; }

    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    const url = `file://${path.join(HERE, "parallax.html")}?w=${W}&h=${H}&move=${MOVE}&strength=${STRENGTH}`;
    await page.goto(url, { waitUntil: "networkidle0" });

    // Inlined as data URIs: file:// pages cannot fetch sibling files reliably,
    // and a texture that silently fails to load renders a black clip.
    const b64 = (p) => "data:image/" + (p.endsWith(".png") ? "png" : "jpeg") + ";base64," + fs.readFileSync(p).toString("base64");
    const dims = await page.evaluate((a, b) => window.__load(a, b), b64(path.join(HERE, "images", img)), b64(depth));

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "parallax-"));
    const total = Math.round(SECONDS * FPS);
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.__setT(t), i / total);
      await page.screenshot({ path: path.join(tmp, String(i).padStart(5, "0") + ".png") });
    }
    await page.close();

    const mp4 = path.join(OUT, `${stem}-${MOVE}.mp4`);
    execFileSync(ffmpeg, [
      "-y", "-framerate", String(FPS), "-i", path.join(tmp, "%05d.png"),
      // yuv420p + even dimensions or half the players in the world refuse it.
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
      "-movflags", "+faststart", mp4,
    ], { stdio: "pipe" });
    fs.rmSync(tmp, { recursive: true, force: true });

    console.log(`  ${stem}  ${dims.w}x${dims.h} -> ${W}x${H} ${SECONDS}s ${MOVE}  ${Math.round(fs.statSync(mp4).size / 1024)}KB`);
  }

  await browser.close();
  console.log(`\nclips in ${OUT}`);
})();
