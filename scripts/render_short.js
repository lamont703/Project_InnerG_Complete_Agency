#!/usr/bin/env node
/**
 * Renders a 9:16 news card for YouTube Shorts.
 *
 * WHY THIS RATHER THAN A DESIGN TOOL'S API. Canva's autofill path needs an
 * Enterprise plan, pre-built Brand Templates with data fields, and app review
 * before a public integration works — and autofilling a VIDEO is documented as
 * a preview feature. All of that to get something render_thumbnail.js already
 * does: parameters in, branded frame out, no per-render cost, template owned
 * here. Checked 2026-08-17; re-check before reversing this decision.
 *
 * TWO OUTPUTS, and the second is the one people forget:
 *   1080x1920  the Short itself
 *   1080x1080  the same card square, for Instagram and X, where a 9:16 crop
 *              gets centre-cut into something nobody composed
 *
 * The square drops the bottom safe reserve, because the UI it was avoiding is
 * YouTube's and is not there. Same content, correctly composed for each place,
 * rather than one export cropped twice.
 *
 * Usage:
 *   node scripts/render_short.js
 *   node scripts/render_short.js --stat "4 of 6" --label "Texas barber metros sit below the accreditation monitoring line." --tone bad
 *   node scripts/render_short.js --name metros --chip "Texas · Schools" --punch "Houston is one of them."
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const PAGE = path.join(__dirname, "podcast-visuals", "shorts-news.html");
const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Shorts");

/** YouTube's mobile thumbnail ceiling. Cards are flat colour, so PNG normally fits. */
const MOBILE_LIMIT = 2 * 1024 * 1024;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

/**
 * VERTICAL ONLY. A Short is a 9:16 surface; a square or landscape export gets
 * letterboxed or centre-cropped into something nobody composed. The square
 * variant this file used to emit was removed for that reason — if a square is
 * ever wanted for another network it should be composed for that network, not
 * cropped out of this one.
 */
const SIZES = [
  { key: "9x16", w: 1080, h: 1920, note: "YouTube Short" },
];

/** Every field the template reads. Nothing is required — the file has defaults. */
const FIELDS = ["chip", "date", "stat", "label", "punch", "source", "brand", "tone", "question"];

async function main() {
  const params = new URLSearchParams();
  for (const k of FIELDS) {
    const v = arg(k, null);
    if (v) params.set(k, v);
  }
  const name = arg("name", "short");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });

  try {
    for (const s of SIZES) {
      const page = await browser.newPage();
      await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 2 });
      const q = new URLSearchParams(params);
      q.set("w", String(s.w));
      q.set("h", String(s.h));
      await page.goto(`file://${PAGE}?${q}`, { waitUntil: "load" });
      await page.waitForFunction("window.__ready === true", { timeout: 15000 });

      let out = path.join(OUT_DIR, `${name}.${s.key}.png`);
      let buf = await page.screenshot({ type: "png" });
      if (buf.length > MOBILE_LIMIT) {
        out = out.replace(/\.png$/, ".jpg");
        buf = await page.screenshot({ type: "jpeg", quality: 92 });
      }
      fs.writeFileSync(out, buf);

      const kb = (buf.length / 1024).toFixed(0);
      console.log(`  ${path.basename(out).padEnd(34)} ${s.w}x${s.h} @2x  ${kb} KB  (${s.note})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\nWritten to reference/Podcast Visuals/Shorts/`);
  console.log(`Safe area is a DESIGN ASSUMPTION (22% bottom, 14% right) — check one real upload before trusting it.`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
