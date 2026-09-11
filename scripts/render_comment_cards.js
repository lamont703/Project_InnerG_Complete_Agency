#!/usr/bin/env node
/**
 * COMMENT CARDS — the reacted-to comments as 1920x1080 PNGs.
 *
 *   node scripts/render_comment_cards.js
 *
 * WHY NOT SCREENSHOT YOUTUBE. That was the first approach and it does not
 * survive contact with a 1080p landscape timeline. Browser capture in this
 * setup is locked at 840px wide whatever the window is resized to, so a real
 * screenshot arrives at 44% of the width it needs and every upscale is visibly
 * soft. YouTube's own comment layout is also built for a scrolling column, not
 * for being legible at arm's length on a 16:9 frame.
 *
 * SO THE TEXT IS REAL AND THE PIXELS ARE OURS. Every string below was pulled
 * verbatim from the YouTube Data API (commentThreads.list on LVAHYV4Xrto), like
 * counts included. Nothing is paraphrased and nothing is invented — the card is
 * a typographic setting of a real comment, which is both more readable and more
 * honest than a blurry crop of someone's UI.
 *
 * IT RENDERS WITH THE OLD CHROME ON PURPOSE. Same macOS 12 constraint as
 * scripts/hyperframes.js: the current headless shell needs macOS 13+ and dies
 * with a dyld VideoToolbox symbol error. v149 is already cached and launches.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const OUT = path.join("reference", "reaction-one-person-ai", "cards");
const SHELL = path.join(process.env.HOME, ".cache", "puppeteer",
  "chrome-headless-shell", "mac-149.0.7827.22", "chrome-headless-shell-mac-x64", "chrome-headless-shell");

/** Verbatim from the API. `beat` maps to the storyboard. */
const CARDS = [
  { id: "beat3-fourkinds", beat: 3, likes: 4,
    text: "What you guys call discovery, we call workforce anthropology. Work has four categories: SOP, Human Talent, Heroics, and Duct-tape. If you automate the SOP without a full understanding of the other areas, heroics and duct-tape tasks will fill the 20 hours you just freed, and they will not feel the benefit of AI." },
  { id: "beat4-measure", beat: 4, likes: 0,
    text: "The strongest point is building the system around a real constraint instead of collecting tools. A useful next step is to measure one workflow before automation — time, errors, and handoffs — then compare it after the build." },
  { id: "beat5-buildbuy", beat: 5, likes: 1,
    text: "How do you factor in existing software or solutions that already address the problem you've identified during the audit? It doesn't necessarily mean the answer is a custom solution. It could be a workflow that includes other tools or software." },
  { id: "beat6-delivery", beat: 6, likes: 0,
    text: "Let's suppose you built an automation to sell it to a company. After the sale, how do you make the company use your automation: Is it through an installed software, web link?" },
  { id: "beat6-answer", beat: 6, likes: 0, reply: true,
    text: "Depends if it's node based or script based. If it's n8n you send the json file so they can host it by themselves and connect their own api keys. You can host it yourself and charge them but you need their api keys. If it's script based you send the source code or deploy it in aws." },
  { id: "beat7-reprice", beat: 7, likes: 0, reply: true,
    text: "The jump usually is not more clients, it is repricing the ones you have. First clients anchor low because you were unproven, and three months of real results changes that. More cheap clients just locks the cheap rate in." },
  { id: "beat8-saturation", beat: 8, likes: 2,
    text: "Everyone is becoming an AI consultant, even the Janitor next door" },
  { id: "beat8-outreach", beat: 8, likes: 1, reply: true,
    text: "Exactly. And everyone is selling you, “Ohhh, just go to an XYZ business and offer them automation; they will buy it in NO TIME!!” Please … nonsense." },
  { id: "beat8-boring", beat: 8, likes: 1,
    text: "Don't any of you want actual passive income, or is it only fun if you have an agency that requires hands-on work every job? Make a directory site, or a rank & rent income, and see it through to a paycheck. Something boring and dirty like roofing or radon services." },
  { id: "beat9-ending", beat: 9, likes: 8,
    text: "The ending where you asked people why they're actually chasing this was my favourite part. Telling someone they might just want to be the AI person inside a company is not the usual close, and it made the whole thing feel honest." },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1920px;height:1080px}
  body{background:#12171A;display:flex;align-items:center;justify-content:center;padding:120px}
  .card{width:100%;max-width:1440px;background:#1A2126;border:1px solid #2E393F;
        border-left:8px solid ${c.reply ? "#57B6CE" : "#E0A552"};padding:64px 72px;
        display:flex;flex-direction:column;gap:32px}
  .meta{display:flex;align-items:center;gap:20px}
  .tag{font-family:"IBM Plex Mono",monospace;font-size:20px;letter-spacing:.14em;text-transform:uppercase;
       color:${c.reply ? "#57B6CE" : "#E0A552"}}
  .likes{font-family:"IBM Plex Mono",monospace;font-size:20px;color:#6D7C85;font-variant-numeric:tabular-nums}
  .rule{flex:1;height:1px;background:#2E393F}
  p{font-family:"Source Serif 4",Georgia,serif;font-size:${c.text.length > 240 ? 44 : c.text.length > 120 ? 52 : 64}px;
    line-height:1.42;color:#E4EBEF;text-wrap:pretty}
  .src{font-family:"IBM Plex Mono",monospace;font-size:18px;color:#4A565E;letter-spacing:.06em}
</style></head><body>
  <div class="card">
    <div class="meta">
      <span class="tag">${c.reply ? "Reply" : "Comment"}</span>
      <span class="likes">${c.likes} ${c.likes === 1 ? "like" : "likes"}</span>
      <span class="rule"></span>
    </div>
    <p>${c.text}</p>
    <div class="src">YouTube · How to Build a One Person AI Business · verbatim</div>
  </div>
</body></html>`;

(async () => {
  if (!fs.existsSync(SHELL)) throw new Error(`chrome-headless-shell not found at ${SHELL}`);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: SHELL, headless: "shell", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  for (const c of CARDS) {
    await page.setContent(html(c), { waitUntil: "domcontentloaded" });
    /*
     * NOT networkidle0. It timed out after the first card — the Google Fonts
     * stylesheet keeps a connection warm and the network never goes idle, so
     * the wait sat until the 30s ceiling. document.fonts.ready is the actual
     * condition we care about: without it the card renders in Times and
     * nothing errors.
     */
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 250));
    const file = path.join(OUT, `${c.id}.png`);
    await page.screenshot({ path: file, type: "png" });
    console.log(`${c.id.padEnd(20)} beat ${c.beat}  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
  }
  await browser.close();
  console.log(`\n${CARDS.length} cards at 1920x1080 -> ${OUT}`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
