#!/usr/bin/env node
/**
 * Wrap any image in a ShearQuery frame, ready to post.
 *
 *   node scripts/instagram/brand_image.js --in="public/manequin for ig posting.jpg" \
 *     --headline="Six cuts to ask for." --prompt="Comment the number you want." \
 *     --chip="Texas · Barber Cuts" --out=experiments/haircut-variations/03-branded.png
 *
 * A FRAME, NOT A WATERMARK. A logo in a corner reads as an afterthought, gets
 * cropped by the UI, and is ignored. Putting the image inside the furniture the
 * data cards already use - dashed rules, the amber shears mark, the letterspaced
 * wordmark - is what makes a photo post and a statistic post look like the same
 * publication. The consistency is the brand; the mark alone is not.
 *
 * THE PALETTE IS LIFTED FROM shorts-news.html rather than re-picked, because
 * "roughly that gold" is how two surfaces drift apart over a few months.
 *
 * CONTAINED, NOT CROPPED. A grid of six haircuts cannot afford a crop that eats
 * two of them, so the image is fitted whole inside the frame.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const IN = arg("in");
/*
 * TWO TREATMENTS, ONE TOOL.
 *   card  - the data-post frame: rules, chip, amber mark, image contained.
 *   photo - the picture runs full bleed with a gradient scrim, and the
 *           branding is a small site-style wordmark that gets out of its way.
 * A photo post wearing the card frame becomes a thumbnail inside a box, which
 * is the wrong emphasis when the picture is the product.
 */
const STYLE = arg("style", "card");
const OUT = arg("out", "branded.png");
const W = Number(arg("w", 1080)), H = Number(arg("h", 1350));

(async () => {
  if (!IN || !fs.existsSync(IN)) throw new Error("--in must point at an existing image");

  const params = new URLSearchParams({ w: String(W), h: String(H) });
  for (const k of ["chip", "date", "headline", "prompt", "brand"]) {
    const v = arg(k, null);
    if (v) params.set(k, v);
  }
  if (!params.get("date")) {
    params.set("date", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase());
  }

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    const template = STYLE === "photo" ? "brand_photo.html" : "brand_image.html";
    await page.goto(`file://${path.join(__dirname, template)}?${params}`, { waitUntil: "networkidle0" });

    // Inlined as a data URI: a file:// page cannot reliably fetch a sibling, and
    // an image that silently fails to load renders an empty frame that looks
    // deliberate.
    const ext = path.extname(IN).toLowerCase() === ".png" ? "png" : "jpeg";
    const data = `data:image/${ext};base64,${fs.readFileSync(IN).toString("base64")}`;
    await page.evaluate((src) => window.__setImage(src), data);
    await new Promise((r) => setTimeout(r, 400));

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT });
  } finally {
    await browser.close();
  }
  console.log(`  ${OUT}  ${W}x${H}  style=${STYLE}  ${Math.round(fs.statSync(OUT).size / 1024)}KB`);
})();
