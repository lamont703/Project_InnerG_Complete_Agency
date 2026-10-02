#!/usr/bin/env node
/**
 * RENDER AN OVERLAY COMPOSITION TO A TRANSPARENT ProRes 4444 .mov.
 *
 *   node scripts/render_overlay_frames.js --comp=reference/google-traffic-overlay \
 *     --out=reference/google-traffic-overlay/renders/gtraffic.mov --dur=7.5
 *
 * WHY NOT HyperFrames, WHICH THE OTHER FOUR CARDS USE. Those compositions are
 * GSAP timelines rendered by `npx hyperframes render`, which pulls a toolchain
 * over the network on every run. This card's animation is a pure function of
 * `t` — setT(t) is called once per frame — so it needs nothing but Chrome,
 * which is already here for the wordmark. The OUTPUT is byte-compatible:
 * 1920x1080 prores_ks 4444, yuva444p10le, 30fps, exactly what datacard.mov is
 * and what reaction_swipe_cut.js overlays.
 *
 * DETERMINISTIC BY CONSTRUCTION. A wall-clock animation renders whatever the
 * page happened to be showing when the screenshot returned, so a slow frame
 * silently shifts everything after it — and the sound cues in the spec are
 * declared against the composition's own clock, so a drift there lands every
 * pop on the wrong beat. Driving setT(t) explicitly means frame n IS t=n/fps.
 *
 * ALPHA COMES FROM omitBackground, AND THE CODEC HAS TO CARRY IT. A PNG
 * sequence keeps alpha; most video codecs throw it away without complaint, and
 * the overlay then arrives as a black rectangle over the picture. prores_ks at
 * profile 4444 with yuva444p10le is the combination that survives.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const FF = require("ffmpeg-static");

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const COMP = arg("comp", "reference/google-traffic-overlay");
const OUT = arg("out", path.join(COMP, "renders", "overlay.mov"));
const DUR = Number(arg("dur", 7.5));
const FPS = Number(arg("fps", 30));
const W = Number(arg("w", 1920)), H = Number(arg("h", 1080));
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };

const html = path.resolve(COMP, "index.html");
if (!fs.existsSync(html)) die(`no index.html in ${COMP}`);
const frames = Math.round(DUR * FPS);
const tmp = path.join(path.dirname(path.resolve(OUT)), ".frames");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb", "--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto("file://" + html, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  /* The screenshot is a real file on disk; if it has not decoded before frame
     one is taken the card renders empty and nothing says so. */
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));

  for (let n = 0; n < frames; n++) {
    await page.evaluate((t) => window.setT(t), n / FPS);
    await page.screenshot({ path: path.join(tmp, `f${String(n).padStart(5, "0")}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(`  ${frames} frames rendered`);

  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  execFileSync(FF, ["-nostdin", "-y", "-framerate", String(FPS), "-i", path.join(tmp, "f%05d.png"),
    "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-alpha_bits", "8",
    "-r", String(FPS), path.resolve(OUT)], { stdio: ["ignore", "ignore", "pipe"] });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  wrote ${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB  ${DUR}s @ ${FPS}fps\n`);
})().catch((e) => die(e.message));
