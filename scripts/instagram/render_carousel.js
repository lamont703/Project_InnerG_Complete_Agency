/**
 * Render a comic carousel to branded JPEGs, upload them, and queue the deck.
 *
 *   node --experimental-strip-types scripts/instagram/render_carousel.js --story=dead-in-here
 *   node --experimental-strip-types scripts/instagram/render_carousel.js --all
 *   node --experimental-strip-types scripts/instagram/render_carousel.js --all --dry
 *
 * WHY --experimental-strip-types. The copy lives in lib/carousel/stories.ts and
 * this script imports it directly rather than keeping a second copy in JS. Two
 * copies of the words is how a caption ends up disagreeing with the artwork,
 * which is the exact drift publisher_queue's own comments were written about.
 *
 * JPEG, NOT PNG. Instagram's image containers want JPEG; PNG support is
 * inconsistent enough that it is not worth discovering at publish time on the
 * last of eleven uploads.
 *
 * THE DECK IS VALIDATED BEFORE A BROWSER STARTS. A story that ends on its
 * punchline instead of a lesson, or has no ask, is refused here — cheaply —
 * rather than after eleven renders and eleven uploads.
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { createClient } = require("@supabase/supabase-js");

const arg = (n, d) => {
  const m = process.argv.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (!m) return d;
  return m.includes("=") ? m.split("=").slice(1).join("=") : true;
};

const W = Number(arg("w", 1080));
const H = Number(arg("h", 1350)); // 4:5 — the tallest ratio Instagram allows in feed
const DRY = Boolean(arg("dry", false));
const OUTDIR = String(arg("outdir", "experiments/carousels"));
const BUCKET = "entity-photos";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function renderStory(browser, story) {
  const dir = path.join(OUTDIR, story.id);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const files = [];
  for (let i = 0; i < story.cards.length; i++) {
    const card = story.cards[i];
    const params = new URLSearchParams({
      w: String(W),
      h: String(H),
      chip: story.chip,
      counter: `${String(i + 1).padStart(2, "0")} / ${String(story.cards.length).padStart(2, "0")}`,
      kind: card.kind,
      lines: JSON.stringify(card.lines),
    });
    if (i === 0) params.set("first", "1");
    if (card.beat === "ASK") params.set("ask", "1");

    await page.goto(`file://${path.join(__dirname, "carousel_card.html")}?${params}`, {
      waitUntil: "networkidle0",
    });
    // Web fonts and the injected copy both settle a beat after load; screenshotting
    // immediately catches a frame with the fallback face in it.
    await new Promise((r) => setTimeout(r, 250));

    const out = path.join(dir, `${String(i + 1).padStart(2, "0")}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 92 });
    files.push(out);
  }
  await page.close();
  return files;
}

async function upload(admin, story, files) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "") +
    `/storage/v1/object/public/${BUCKET}/`;
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const key = `instagram/carousel/${story.id}/${String(i + 1).padStart(2, "0")}.jpg`;
    const { error } = await admin.storage.from(BUCKET).upload(key, fs.readFileSync(files[i]), {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(`upload ${key}: ${error.message}`);
    // Cache-bust: upsert keeps the path, so a re-render would otherwise be
    // invisible behind the CDN and the board would show yesterday's cards.
    urls.push(base + key + `?v=${Date.now()}`);
  }
  return urls;
}

(async () => {
  loadEnv();
  const { STORIES, findStory, validateStory } = await import("../../lib/carousel/stories.ts");

  const wanted = arg("all", false)
    ? STORIES
    : [findStory(String(arg("story", "")))].filter(Boolean);
  if (wanted.length === 0) {
    console.error("pass --story=<id> or --all. ids: " + STORIES.map((s) => s.id).join(", "));
    process.exit(1);
  }

  for (const s of wanted) {
    const problems = validateStory(s);
    if (problems.length) {
      console.error(`REFUSED ${s.id}:`);
      problems.forEach((p) => console.error("  - " + p));
      process.exit(1);
    }
  }

  const admin = DRY
    ? null
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  try {
    for (const story of wanted) {
      process.stdout.write(`${story.id}: rendering ${story.cards.length} cards ... `);
      const files = await renderStory(browser, story);
      console.log("done");

      if (DRY) {
        console.log(`  local: ${path.join(OUTDIR, story.id)}`);
        continue;
      }

      process.stdout.write("  uploading ... ");
      const urls = await upload(admin, story, files);
      console.log(`${urls.length} images`);

      const { error } = await admin.from("carousel_queue").upsert(
        {
          item_key: story.id,
          title: story.title,
          engine: story.engine,
          image_urls: urls,
          caption: story.caption,
          hashtags: story.hashtags,
          source_credit: story.sourceCredit,
          card_count: story.cards.length,
          status: "draft",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "item_key" },
      );
      if (error) throw new Error(`queue ${story.id}: ${error.message}`);
      console.log(`  queued as draft — review at /admin/instagram-carousels`);
    }
  } finally {
    await browser.close();
  }
})();
