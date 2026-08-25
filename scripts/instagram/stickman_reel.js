/**
 * Render a comic carousel as a silent stick-figure Reel.
 *
 *   node --experimental-strip-types scripts/instagram/stickman_reel.js --story=dead-in-here
 *
 * NO VOICE, NO MUSIC — and that is a choice, not a gap. Most Reels are watched
 * muted, so a format that needs no sound loses nothing, and speech bubbles let
 * a viewer read at their own glance instead of chasing a voiceover.
 *
 * BUT IT STILL GETS AN AUDIO TRACK. A silent one. A file with no audio stream
 * at all is an odd container for a video platform to receive, and the cost of
 * ruling that out is one ffmpeg flag. Silence is deliberate; a missing stream
 * is ambiguous.
 *
 * PACING COMES FROM lib/carousel/timing.ts, shared with the text reel, plus a
 * small extra beat: here a viewer is watching a figure move AND reading a
 * bubble, and the same words take marginally longer when something else on
 * screen is asking for attention.
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
const UPLOAD = Boolean(arg("upload", false));
const BUCKET = "entity-photos";
/** Watching and reading at once costs a beat the text reel does not pay. */
const EXTRA_BEAT = 0.25;

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
  const { directionsFor, validateStaging } = await import("../../lib/carousel/staging.ts");

  const story = findStory(String(arg("story", "")));
  if (!story) {
    console.error("pass --story=<id>. ids: " + STORIES.map((s) => s.id).join(", "));
    process.exit(1);
  }
  for (const p of validateStory(story)) { console.error(`REFUSED ${story.id}: ${p}`); }
  const stageProblems = validateStaging(story.id, story.cards.length);
  if (stageProblems.length) {
    console.error(`NO STAGING for ${story.id}:`);
    stageProblems.forEach((p) => console.error("  - " + p));
    process.exit(1);
  }
  const dirs = directionsFor(story.id);

  const deck = story.cards.map((c, i) => ({
    lines: c.lines,
    ask: c.beat === "ASK",
    speaker: dirs[i].speaker,
    beat: dirs[i].beat,
    bench: dirs[i].bench ?? 0,
    secs: cardSeconds(c, { extraBeat: EXTRA_BEAT }),
  }));
  const SECONDS = deck.reduce((a, c) => a + c.secs, 0);

  console.log(`${story.title} — stickman, ${deck.length} cards, ${SECONDS.toFixed(1)}s`);
  deck.forEach((c, i) =>
    console.log(
      `  ${String(i + 1).padStart(2)}. ${c.secs.toFixed(2)}s  ${String(c.beat).padEnd(10)}` +
      `${c.speaker ? `${c.speaker} says ` : "narration "}` +
      `"${c.lines[0].slice(0, 38)}"`,
    ),
  );

  const OUT = String(arg("out", path.join("experiments", "reels", `${story.id}-stickman.mp4`)));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("  page error:", String(e).slice(0, 200)));
  await page.setViewport({ width: W, height: H });

  const qp = new URLSearchParams({
    w: String(W), h: String(H), chip: story.chip, deck: JSON.stringify(deck),
  });
  await page.goto(`file://${path.join(HERE, "stickman_reel.html")}?${qp}`, { waitUntil: "networkidle0" });

  const total = Math.round(SECONDS * FPS);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stick-"));
  process.stdout.write(`  rendering ${total} frames `);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__setT(t), i / total);
    await page.screenshot({ path: path.join(tmp, String(i).padStart(5, "0") + ".png") });
    if ((i + 1) % 120 === 0) process.stdout.write(".");
  }
  console.log(" done");
  await browser.close();

  execFileSync(ffmpeg, [
    "-y", "-framerate", String(FPS), "-i", path.join(tmp, "%05d.png"),
    // A generated silent track, so the file carries an audio stream without
    // carrying any sound.
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-c:a", "aac", "-b:a", "64k", "-shortest",
    "-movflags", "+faststart", OUT,
  ], { stdio: "pipe" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${OUT}  ${Math.round(fs.statSync(OUT).size / 1024)}KB  (silent)`);

  if (UPLOAD) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const key = `instagram/stickman-reel/${story.id}.mp4`;
    const { error } = await admin.storage.from(BUCKET).upload(key, fs.readFileSync(OUT), {
      contentType: "video/mp4", upsert: true,
    });
    if (error) throw new Error(`upload: ${error.message}`);
    console.log(`  uploaded: ${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${key}`);
  }
})();
