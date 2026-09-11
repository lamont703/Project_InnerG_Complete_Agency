#!/usr/bin/env node
/**
 * Render the ranking overlays as transparent PNGs.
 *
 *   node scripts/ranking/overlay.js --out experiments/ranking-fades/overlays
 *
 * WHY PNGs AND NOT drawtext. The heading colours TWO WORDS inside an otherwise
 * white line, and ffmpeg's drawtext paints one colour per call — doing it in
 * ffmpeg means splitting the line and hand-computing the x offset of the second
 * half from a guessed glyph width, which breaks the moment the text or the font
 * changes. Rendering the real type in a browser and compositing keeps the
 * kerning correct and makes the colour split a CSS span.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const W = 1080, H = 1920;
const ORANGE = "#FF7A1A";
const PURPLE = "#A45BFF";

/* Ordered as the video plays: the countdown runs 6 down to 1. */
const RANKS = [
  { n: 6, name: "Low Taper Fade" },
  { n: 5, name: "Mid Fade" },
  { n: 4, name: "Temple Fade + Hard Part" },
  { n: 3, name: "Drop Fade" },
  { n: 2, name: "High Skin Fade" },
  { n: 1, name: "Burst Fade" },
];

const page = (rank) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  /* LOCAL FONTS ONLY. A Google Fonts @import made setContent hang on
     networkidle0 with no network, and scripts/instagram/reel_hairstyles.html
     already renders on the system stack for the same reason. */
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;background:transparent;overflow:hidden}
  body{font-family:"Arial Black","Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .head{
    position:absolute;top:96px;left:0;right:0;text-align:center;
    font-weight:900;font-size:88px;line-height:.98;letter-spacing:-.02em;
    color:#fff;text-transform:uppercase;
    /* A hard shadow rather than a box: the plate under it is a light grey
       studio backdrop, and a filled box would cover the thing being ranked. */
    text-shadow:0 6px 26px rgba(0,0,0,.55), 0 2px 0 rgba(0,0,0,.35);
  }
  .head .hot{color:${ORANGE}}
  /* KEPT ABOVE 420px FROM THE BOTTOM. YouTube's Shorts player lays its own
     title, channel name and description over the lower band of the frame, so
     anything below that is covered on the surface this is made for. */
  .rank{
    position:absolute;left:0;right:0;bottom:520px;text-align:center;
    font-weight:900;font-size:250px;line-height:1;letter-spacing:-.05em;
    color:${PURPLE};
    text-shadow:0 10px 40px rgba(0,0,0,.75), 0 3px 0 rgba(0,0,0,.5);
  }
  .rank .hash{font-size:130px;vertical-align:super;color:#fff;opacity:.9}
  /* White, not orange. Orange type on a mid-grey studio backdrop measured too
     close in value to read at phone size; the orange stays on the heading where
     it sits against a dark shadow. */
  .name{
    position:absolute;left:0;right:0;bottom:430px;text-align:center;
    font-weight:900;font-size:62px;letter-spacing:.02em;color:#fff;
    text-transform:uppercase;
    text-shadow:0 6px 24px rgba(0,0,0,.85), 0 2px 0 rgba(0,0,0,.6);
  }
</style></head><body>
  <div class="head">Ranking The <span class="hot">Top 6</span><br>Fade Haircuts</div>
  <div class="rank"><span class="hash">#</span>${rank.n}</div>
  <div class="name">${rank.name}</div>
</body></html>`;

(async () => {
  const out = arg("out", "experiments/ranking-fades/overlays");
  fs.mkdirSync(out, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const p = await browser.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  for (const r of RANKS) {
    await p.setContent(page(r), { waitUntil: "domcontentloaded" });
    await p.evaluate(() => document.fonts.ready);
    const file = path.join(out, `rank-${r.n}.png`);
    await p.screenshot({ path: file, omitBackground: true });
    console.log(`  #${r.n}  ${r.name}  -> ${file}`);
  }
  await browser.close();
})();
