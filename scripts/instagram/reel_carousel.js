/**
 * Re-cut a comic carousel as a 9:16 Reel.
 *
 *   node --experimental-strip-types scripts/instagram/reel_carousel.js --story=dead-in-here
 *   node --experimental-strip-types scripts/instagram/reel_carousel.js --story=rell --upload
 *
 * SAME COPY, DIFFERENT MEDIUM. The words come from lib/carousel/stories.ts —
 * the same file the carousel renders from — so a story cannot say one thing in
 * the grid and another in the Reel.
 *
 * THE ONE NUMBER THAT DECIDES WHETHER ANYONE WATCHES: how long each card is on
 * screen. A carousel is PULLED, so a slow reader sets their own pace and a
 * static card is fine. A Reel is PUSHED — it plays whether they are reading or
 * not — and the two ways to lose someone are opposite:
 *
 *   too long  -> dead air. Four words held for three seconds is an invitation
 *                to swipe, and it arrives at about second three.
 *   too short -> the line is gone before it is read, which reads as sloppy and
 *                is just as fatal because there is no way to go back.
 *
 * So duration is computed per card from WORD COUNT rather than fixed. Large,
 * bold, high-contrast text reads fast; READ_RATE is the words-per-second that
 * assumes, and BEAT is the pause after the last word so a cut never lands on a
 * half-read line.
 *
 * WHAT IS DELIBERATELY DROPPED FROM THE CAROUSEL: the "03 / 10" counter. In the
 * grid it tells a swiper how much is left, which helps. In a Reel it tells a
 * viewer there are seven more cards, which is seven reasons to leave. It is the
 * one element that has to be deleted rather than restyled.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const { createClient } = require("@supabase/supabase-js");

const arg = (n, d) => {
  const m = process.argv.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (!m) return d;
  return m.includes("=") ? m.split("=").slice(1).join("=") : true;
};

const W = 1080, H = 1920;
const FPS = Number(arg("fps", 30));
const HERE = __dirname;
const AUDIO = String(arg("audio", path.join("reference", "Podcast Visuals", "Shorts", "news-bed.m4a")));
const UPLOAD = Boolean(arg("upload", false));
const BUCKET = "entity-photos";

/*
 * Pacing lives in lib/carousel/timing.ts, shared with the stickman renderer.
 * Two copies of the read rate is two edits of the same story.
 */

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

(async () => {
  loadEnv();
  const { findStory, validateStory, STORIES } = await import("../../lib/carousel/stories.ts");
  const { cardSeconds } = await import("../../lib/carousel/timing.ts");
  const story = findStory(String(arg("story", "")));
  if (!story) {
    console.error("pass --story=<id>. ids: " + STORIES.map((s) => s.id).join(", "));
    process.exit(1);
  }
  const problems = validateStory(story);
  if (problems.length) {
    console.error(`REFUSED ${story.id}:`);
    problems.forEach((p) => console.error("  - " + p));
    process.exit(1);
  }

  const deck = story.cards.map((c) => ({
    kind: c.kind,
    lines: c.lines,
    ask: c.beat === "ASK",
    secs: cardSeconds(c),
  }));
  const SECONDS = deck.reduce((a, c) => a + c.secs, 0);

  console.log(`${story.title} — ${deck.length} cards, ${SECONDS.toFixed(1)}s`);
  deck.forEach((c, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${c.secs.toFixed(2)}s  ${c.lines[0].slice(0, 52)}`),
  );

  const OUT = String(arg("out", path.join("experiments", "reels", `${story.id}.mp4`)));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("  page error:", String(e).slice(0, 180)));
  await page.setViewport({ width: W, height: H });

  const qp = new URLSearchParams({
    w: String(W),
    h: String(H),
    chip: story.chip,
    deck: JSON.stringify(deck),
  });
  await page.goto(`file://${path.join(HERE, "reel_carousel.html")}?${qp}`, { waitUntil: "networkidle0" });

  const total = Math.round(SECONDS * FPS);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelcar-"));
  process.stdout.write(`  rendering ${total} frames `);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__setT(t), i / total);
    await page.screenshot({ path: path.join(tmp, String(i).padStart(5, "0") + ".png") });
    if ((i + 1) % 120 === 0) process.stdout.write(".");
  }
  console.log(" done");
  await browser.close();

  const silent = OUT.replace(/\.mp4$/, "") + "._silent.mp4";
  execFileSync(ffmpeg, [
    "-y", "-framerate", String(FPS), "-i", path.join(tmp, "%05d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-movflags", "+faststart", silent,
  ], { stdio: "pipe" });
  fs.rmSync(tmp, { recursive: true, force: true });

  if (AUDIO && fs.existsSync(AUDIO)) {
    /*
     * The bed is LOOPED rather than trimmed. The existing shorts bed is nine
     * seconds and these run past twenty; without -stream_loop the audio simply
     * stops two thirds of the way through, which sounds like the video broke.
     */
    execFileSync(ffmpeg, [
      "-y", "-i", silent, "-stream_loop", "-1", "-i", AUDIO,
      "-filter_complex",
      `[1:a]atrim=0:${SECONDS.toFixed(2)},asetpts=N/SR/TB,afade=t=in:st=0:d=0.4,afade=t=out:st=${(SECONDS - 0.8).toFixed(2)}:d=0.8[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-movflags", "+faststart", OUT,
    ], { stdio: "pipe" });
    console.log(`  audio: ${path.basename(AUDIO)} (looped to ${SECONDS.toFixed(1)}s)`);
  } else {
    fs.copyFileSync(silent, OUT);
    console.log("  no audio bed found — silent");
  }
  fs.rmSync(silent, { force: true });
  console.log(`  ${OUT}  ${Math.round(fs.statSync(OUT).size / 1024)}KB`);

  if (UPLOAD) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const key = `instagram/carousel-reel/${story.id}.mp4`;
    const { error } = await admin.storage.from(BUCKET).upload(key, fs.readFileSync(OUT), {
      contentType: "video/mp4", upsert: true,
    });
    if (error) throw new Error(`upload: ${error.message}`);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "") +
      `/storage/v1/object/public/${BUCKET}/${key}?v=${Date.now()}`;
    console.log(`  uploaded: ${url}`);
  }
})();
