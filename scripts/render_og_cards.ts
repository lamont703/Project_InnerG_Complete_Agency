#!/usr/bin/env npx tsx
/**
 * Renders the share card for every page in lib/og-cards.ts into public/og/.
 *
 * WHY THE REGISTRY IS THE SOURCE AND THIS IS JUST A RENDERER: the numbers on a
 * card must be the numbers on the page, and the only way to guarantee that is
 * for both to read the same module. So this script holds no content — change a
 * figure in lib/texas-exam-stats.ts, re-run, and every card citing it updates.
 * A card showing a stale percentage is uniquely hard to catch, because it is
 * only ever seen off-site.
 *
 * TypeScript rather than JS purely so it can import the registry directly.
 *
 * Usage: npx tsx scripts/render_og_cards.ts
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { OG_CARDS } from "../lib/og-cards";

const TEMPLATE = path.join(__dirname, "og-cards", "card.html");
const OUT_DIR = path.join(__dirname, "..", "public", "og");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });

  try {
    for (const c of OG_CARDS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
      const q = new URLSearchParams({
        eyebrow: c.eyebrow, stat: c.stat, statLabel: c.statLabel, title: c.title,
        ...(c.stat2 ? { stat2: c.stat2, stat2Label: c.stat2Label || "" } : {}),
      });
      await page.goto(`file://${TEMPLATE}?${q}`, { waitUntil: "load" });
      await page.waitForFunction("window.__ready === true", { timeout: 15000 });
      const buf = await page.screenshot({ type: "png" });
      fs.writeFileSync(path.join(OUT_DIR, `${c.slug}.png`), buf);
      console.log(`  ${(buf.length / 1024).toFixed(0).padStart(4)} KB  og/${c.slug}.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${OG_CARDS.length} cards -> public/og/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
