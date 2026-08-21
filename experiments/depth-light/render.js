#!/usr/bin/env node
/**
 * Cut a three-scene clip from ONE still.
 *
 *   node experiments/depth-light/render.js
 *   node experiments/depth-light/render.js --fps=30 --strength=0.05
 *
 * SEPARATE FROM experiments/depth-parallax ON PURPOSE. That one does a single
 * continuous move; this one cuts between three. Keeping both means they can be
 * watched back to back instead of argued about from memory.
 *
 * Both are disposable: nothing in the app imports either directory.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=")[1] : d; };
const FPS = Number(arg("fps", 30));
const STRENGTH = arg("strength", "0.05");
const W = 1080, H = 1920;
const HERE = __dirname;

(async () => {
  const img = path.join(HERE, "source.jpg");
  const dep = path.join(HERE, "source-depth.png");
  for (const f of [img, dep]) if (!fs.existsSync(f)) throw new Error("missing " + f);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb", "--use-gl=swiftshader",
           "--enable-webgl", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("  page error:", String(e).slice(0, 200)));
  await page.setViewport({ width: W, height: H });
  await page.goto(`file://${path.join(HERE, "light.html")}?w=${W}&h=${H}&strength=${STRENGTH}`, { waitUntil: "networkidle0" });

  const b64 = (p) => "data:image/" + (p.endsWith(".png") ? "png" : "jpeg") + ";base64," + fs.readFileSync(p).toString("base64");
  const dims = await page.evaluate((a, b) => window.__load(a, b), b64(img), b64(dep));

  const seconds = 6;
  const total = Math.round(seconds * FPS);
  console.log(`  source ${dims.w}x${dims.h} -> ${W}x${H}`);
  console.log(`    additive layers: haze, directional bloom, 28 depth-occluded motes`);
  console.log(`  ${seconds}s, ${total} frames at ${FPS}fps`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "light-"));
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__setT(t), i / total);
    await page.screenshot({ path: path.join(tmp, String(i).padStart(5, "0") + ".png") });
    if ((i + 1) % 45 === 0) process.stdout.write(`    ${i + 1}/${total}\n`);
  }
  await browser.close();

  const out = path.join(HERE, "light.mp4");
  execFileSync(ffmpeg, [
    "-y", "-framerate", String(FPS), "-i", path.join(tmp, "%05d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-movflags", "+faststart", out,
  ], { stdio: "pipe" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  ${out}  ${Math.round(fs.statSync(out).size / 1024)}KB`);
})();
