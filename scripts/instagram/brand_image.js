#!/usr/bin/env node
/**
 * Stamp the ShearQuery wordmark onto a still image.
 *
 *   node scripts/instagram/brand_image.js --in=photo.jpg --out=branded.jpg
 *   node scripts/instagram/brand_image.js --in=... --corner=br --scrim=1
 *
 * PROPORTIONS COME FROM reel_hairstyles.html, NOT FROM TASTE. The wordmark on
 * every Reel this channel has published sits at 3.2% of the short side, 7.0%
 * in from the edge and 4.2% up from the bottom. Reusing those numbers is what
 * makes a still look like it came from the same brand as the video, and it is
 * why this file has no "size" preference to argue about.
 *
 * THE SPLIT IS THE MARK: "Shear" in the foreground colour, "Query" in the
 * accent. components/landing/hero-section.tsx and components/layout/navbar.tsx
 * both render it that way, and the reel template hard-codes the same two
 * values — #fff and #00b2de. A single-colour "ShearQuery" is not the logo.
 *
 * WHY PUPPETEER AND NOT AN SVG COMPOSITE. sharp renders SVG text through
 * resvg, which substitutes silently when a family is missing — the output is
 * an image with the wrong typeface and no error anywhere. Chrome has the
 * system fonts, and this is a wordmark: the letterforms ARE the asset.
 *
 * IT NEVER OVERWRITES THE SOURCE. --out is required to be a different path.
 * The input here is generally the only copy of something a model produced and
 * cannot reproduce, and a branding pass is not worth risking it.
 */
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const sharp = require("sharp");

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const IN = arg("in");
const OUT = arg("out");
const CORNER = arg("corner", "bl");            // bl | br | tl | tr
const SCRIM = arg("scrim", "0") !== "0";       // soft gradient behind the mark
const QUALITY = Number(arg("quality", 95));

/** The two brand values, from reel_hairstyles.html. Not configurable. */
const FG = "#ffffff";
const ACCENT = "#00b2de";

async function main() {
  if (!IN || !OUT) throw new Error("--in and --out are both required");
  if (path.resolve(IN) === path.resolve(OUT)) throw new Error("--out must differ from --in; refusing to overwrite the source");
  if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  const page = await browser.newPage();

  /*
   * Size comes from sharp, and the image goes in as a data URI — no file://
   * anywhere. The first version navigated to the source path and hung until
   * the 30s timeout, because these filenames come off image tools with spaces
   * and commas in them and an unencoded file URL simply never resolves. The
   * failure says "Navigation timeout", which points at the network rather than
   * at the one character that broke it.
   */
  const meta = await sharp(IN).metadata();
  const w = meta.width, h = meta.height;
  const S = Math.min(w, h);
  const dataUri = `data:${meta.format === "png" ? "image/png" : "image/jpeg"};base64,${fs.readFileSync(IN).toString("base64")}`;
  const pad = S * 0.070, font = S * 0.032, edge = S * 0.042;

  const vertical = CORNER.startsWith("t") ? `top:${edge}px` : `bottom:${edge}px`;
  const horizontal = CORNER.endsWith("r") ? `right:${pad}px` : `left:${pad}px`;
  const scrimCss = SCRIM
    ? `<div style="position:absolute;inset:auto 0 0 0;height:${S * 0.18}px;
         background:linear-gradient(to top, rgba(0,0,0,.32), rgba(0,0,0,0))"></div>`
    : "";

  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#000}
  .f{position:relative;width:${w}px;height:${h}px;overflow:hidden}
  .f img{display:block;width:${w}px;height:${h}px}
  /*
   * The shadow is the whole reason this reads on a photograph. The wordmark
   * sits over skin, hair and background in the same 150 pixels, and white on
   * a light patch disappears without it — a watermark nobody can see is worse
   * than none, because it looks like the job was done.
   */
  .brand{position:absolute;${vertical};${horizontal};
    font-family:"Helvetica Neue",Inter,system-ui,sans-serif;
    font-size:${font}px;font-weight:700;letter-spacing:-0.02em;line-height:1;
    color:${FG};text-shadow:0 ${font * 0.035}px ${font * 0.14}px rgba(0,0,0,.55)}
  .brand .q{color:${ACCENT}}
</style>
<div class="f"><img src="${dataUri}">${scrimCss}
  <div class="brand">Shear<span class="q">Query</span></div>
</div>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  await page.screenshot({ path: path.resolve(OUT), type: "jpeg", quality: QUALITY, clip: { x: 0, y: 0, width: w, height: h } });
  await browser.close();
  console.log(`  ${w}x${h}  mark ${Math.round(font)}px at ${CORNER}${SCRIM ? " + scrim" : ""}  ->  ${OUT}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
