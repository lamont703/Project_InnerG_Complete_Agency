#!/usr/bin/env node
/**
 * Renders episode thumbnails at YouTube's current recommended sizes.
 *
 * SPECS CHECKED, NOT REMEMBERED (support.google.com/youtube/answer/72431,
 * read 2026-08-15). The recommendation is 3840x2160 — not the 1280x720 that
 * everyone, including me, still assumes. Minimum width 640. And podcast
 * PLAYLISTS want 1:1 rather than 16:9, which is easy to miss and means a
 * 16:9-only export gets centre-cropped by YouTube into something nobody
 * composed.
 *
 * So both are produced: 16:9 for the video, 1:1 for the podcast playlist.
 *
 * PNG FIRST, JPEG IF IT HAS TO BE. The mobile limit is 2 MB. Flat colour on
 * near-black compresses well enough that PNG usually fits, and PNG keeps the
 * numbers razor-edged; if a design ever pushes past the limit this falls back
 * to high-quality JPEG rather than silently shipping a file YouTube will
 * reject on a phone.
 *
 * Usage:
 *   node scripts/render_thumbnail.js
 *   node scripts/render_thumbnail.js --a 92% --b 57% --p "Same students." --name episode-2
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const PAGE = path.join(__dirname, "podcast-visuals", "thumbnail.html");
const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Episodes Rendered");
const MOBILE_LIMIT = 2 * 1024 * 1024;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const SIZES = [
  { key: "16x9", w: 3840, h: 2160, note: "video thumbnail" },
  { key: "1x1", w: 2160, h: 2160, note: "podcast playlist" },
];

async function main() {
  const params = new URLSearchParams();
  for (const k of ["a", "b", "al", "bl", "p", "brand"]) {
    const v = arg(k, null);
    if (v) params.set(k, v);
  }
  const name = arg("name", "Why_barbers_and_cosmetologists_fail_written_exams");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });

  try {
    for (const s of SIZES) {
      const page = await browser.newPage();
      await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
      const q = new URLSearchParams(params);
      q.set("w", String(s.w));
      q.set("h", String(s.h));
      await page.goto(`file://${PAGE}?${q}`, { waitUntil: "load" });
      await page.waitForFunction("window.__ready === true", { timeout: 15000 });

      let out = path.join(OUT_DIR, `${name}.thumbnail.${s.key}.png`);
      let buf = await page.screenshot({ type: "png" });

      if (buf.length > MOBILE_LIMIT) {
        out = out.replace(/\.png$/, ".jpg");
        buf = await page.screenshot({ type: "jpeg", quality: 92 });
      }
      fs.writeFileSync(out, buf);

      const kb = (buf.length / 1024).toFixed(0);
      const warn = buf.length > MOBILE_LIMIT ? "  OVER 2 MB — too large for mobile" : "";
      console.log(`  ${path.basename(out).padEnd(58)} ${s.w}x${s.h}  ${kb} KB  (${s.note})${warn}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
