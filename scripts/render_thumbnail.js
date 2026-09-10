#!/usr/bin/env node
/**
 * YOUTUBE THUMBNAIL — 1280x720, rendered from markup.
 *
 *   node scripts/render_thumbnail.js
 *   node scripts/render_thumbnail.js --variant b
 *
 * WHY MARKUP AND NOT A GENERATED IMAGE. The type IS the thumbnail — the
 * competitive read below is that every top performer leads with three or four
 * enormous words. Image models still mangle legible text, which is already
 * written down as a rule for b-roll prompts in CLAUDE.md, and a thumbnail is
 * the worst possible place to discover it. Higgsfield did the one job it is
 * better at: cutting the subject out of its background.
 *
 * WHAT THE COMPETITIVE SET ACTUALLY DOES. Measured off the first page of
 * "build one person ai business" on 2026-09-10, with vidIQ's views-per-hour
 * as the performance signal rather than raw view counts:
 *
 *   87 VPH  Dan Martell      $830,000/mo   face left, huge white number
 *   83 VPH  Shane Hummus     2 HOUR COURSE face right, orange arrow, Claude mark
 *   79 VPH  Albert Olgaard   4 HOUR COURSE no face, dark warm room, Claude mark
 *   60 VPH  Nate Herk        1 PERSON BUSINESS  face right, orange diagram
 *   40 VPH  Sandeep Swadia   REPLACE YOUR JOB   face left, magenta accent
 *
 * Four things every one of them does: a DARK ground, ONE warm accent, THREE OR
 * FOUR words at enormous size, and a NUMBER leading. Nothing on that page is
 * subtle and nothing has a sentence on it.
 *
 * WHERE WE DELIBERATELY DIVERGE. Every thumbnail in that set promises a gain —
 * dollars earned, hours of course, a job replaced. Ours promises a loss. In a
 * row of six thumbnails all selling the same upside, the one that says nothing
 * changed is the only one making a different claim, and the expression is level
 * rather than delighted for the same reason. That is the whole bet.
 *
 * SAFE AREAS. The duration badge sits bottom-right and the progress bar covers
 * the bottom ~6%; nothing that has to be read goes there. Checked at 360px
 * wide, which is what a phone actually shows.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* Same macOS 12 constraint as scripts/hyperframes.js — the current headless
   shell needs macOS 13+ and dies with a dyld VideoToolbox symbol error. */
const SHELL = path.join(process.env.HOME, ".cache", "puppeteer",
  "chrome-headless-shell", "mac-149.0.7827.22", "chrome-headless-shell-mac-x64", "chrome-headless-shell");

const DIR = "reference/reaction-one-person-ai/thumbnail";
const CUTOUT = path.join(DIR, "avatar-cutout.png");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const variant = arg("variant", "a");

const VARIANTS = {
  a: { kicker: "I saved a client",  hero: "20 HOURS",   heroSub: "A MONTH",      punch: "NOTHING CHANGED" },
  b: { kicker: "Month three",       hero: "NOTHING",    heroSub: "FELT DIFFERENT", punch: "HERE'S WHY" },
  c: { kicker: "They paid for",     hero: "20 HOURS",   heroSub: "",             punch: "THEY NEVER GOT THEM" },
};
const V = VARIANTS[variant];
if (!V) { console.error(`unknown variant "${variant}". Use: ${Object.keys(VARIANTS).join(", ")}`); process.exit(1); }

const cutout = `data:image/png;base64,${fs.readFileSync(CUTOUT).toString("base64")}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1280px;height:720px;overflow:hidden}
  body{background:#12171A;position:relative;font-family:"Barlow Condensed","Helvetica Neue",Arial,sans-serif}

  /* Warm key light behind the subject — the one thing borrowed from the
     highest-multiplier thumbnail in the set, which lit a dark room amber. */
  .glow{position:absolute;right:-120px;top:-160px;width:900px;height:900px;
        background:radial-gradient(circle,rgba(224,165,82,.30) 0%,rgba(224,165,82,.10) 42%,rgba(224,165,82,0) 68%)}

  /* Floor shadow so the cutout sits on the frame instead of floating. */
  .floor{position:absolute;right:0;bottom:0;width:640px;height:220px;
         background:linear-gradient(to top,rgba(0,0,0,.75),rgba(0,0,0,0))}

  .subject{position:absolute;right:-40px;bottom:0;height:730px;
           filter:drop-shadow(-18px 0 34px rgba(0,0,0,.55))}

  .type{position:absolute;left:64px;top:0;height:720px;width:700px;
        display:flex;flex-direction:column;justify-content:center;gap:0}

  .kicker{font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:26px;
          letter-spacing:.20em;text-transform:uppercase;color:#AEBAC1;margin-bottom:14px}

  .hero{font-weight:700;font-size:172px;line-height:.86;letter-spacing:-.022em;color:#fff;
        text-shadow:0 6px 30px rgba(0,0,0,.65)}
  .hero-sub{font-weight:600;font-size:88px;line-height:.94;letter-spacing:-.012em;color:#fff;opacity:.92;
            text-shadow:0 4px 22px rgba(0,0,0,.6)}

  .rule{width:132px;height:7px;background:#E0A552;margin:26px 0 22px}

  .punch{font-weight:700;font-size:${V.punch.length > 16 ? 74 : 88}px;line-height:.94;
         letter-spacing:-.014em;color:#E0A552;text-shadow:0 4px 22px rgba(0,0,0,.6)}
</style></head><body>
  <div class="glow"></div>
  <div class="floor"></div>
  <img class="subject" src="${cutout}" alt="">
  <div class="type">
    <div class="kicker">${V.kicker}</div>
    <div class="hero">${V.hero}</div>
    ${V.heroSub ? `<div class="hero-sub">${V.heroSub}</div>` : ""}
    <div class="rule"></div>
    <div class="punch">${V.punch}</div>
  </div>
</body></html>`;

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(SHELL) ? SHELL : undefined,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const out = path.join(DIR, `thumbnail-${variant}.png`);
  await page.screenshot({ path: out });

  /* What a phone actually shows. If it does not read here it does not read. */
  await page.setViewport({ width: 360, height: 203, deviceScaleFactor: 1 });
  await page.evaluate(() => { document.documentElement.style.zoom = 360 / 1280; });
  await page.screenshot({ path: path.join(DIR, `thumbnail-${variant}-360.png`) });

  await browser.close();
  console.log(`  ${out} (${(fs.statSync(out).size / 1024).toFixed(0)}KB)`);
})().catch((e) => { console.error(e.message); process.exit(1); });
