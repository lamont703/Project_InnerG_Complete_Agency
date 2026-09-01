#!/usr/bin/env node
/**
 * Render the queued cards that have no video yet, using the avatar.
 *
 * THE SEAM THIS CLOSES. Every other renderer in this repo works backwards from
 * what the publisher needs: queue_entity_cards.js and the hairstyle batch
 * GENERATE content, render it, upload it, and only then insert a queue row. The
 * card is a by-product of rendering. The "Queue it" button on Content Research
 * reverses that — it creates the card first, from a decision, and nothing
 * existed to fill it in. This is that missing half.
 *
 * WHY THE AVATAR IS THE RIGHT RENDERER HERE. The other two paths generate their
 * own subject matter: a hairstyle grid or a stat card. A research finding is a
 * TOPIC, and the only renderer that can turn an arbitrary topic into a video is
 * the one that can say anything — the clone.
 *
 * PORTRAIT IS AN ADVANTAGE HERE, WHICH IT WAS NOT FOR LONG-FORM. The avatar look
 * is preferred_orientation: portrait, and that cost real work on the landscape
 * video — HeyGen pillarboxes it into 16:9 with wide near-white bars and the fix
 * was a two-column layout. A Short is 9:16, so the native orientation fills the
 * frame with nothing to correct.
 *
 * IT COSTS MONEY, so it is DRY BY DEFAULT and does ONE card unless told
 * otherwise. Avatar video is $0.0386/sec, so a 30-second Short is about $1.16.
 * A mistake with --limit 20 is a mistake worth twenty dollars.
 *
 *   node scripts/render_queued.js                 # what it would do, spends nothing
 *   node scripts/render_queued.js --go            # render one
 *   node scripts/render_queued.js --go --limit 3  # render three
 *
 * NOT SAFE TO RUN TWICE AT ONCE. The row is claimed by writing video_url at the
 * END, so two concurrent runs would both see the same empty row and both pay.
 * It is a hand-run script; run it once.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const FFMPEG = require("@ffmpeg-installer/ffmpeg").path;
const HEYGEN = "https://api.heygen.com";

/*
 * THE ROUTING RULE IS NOT IN THIS FILE. lib/video-type.js decides which video a
 * card becomes, and the publisher board's Render button reads the SAME call to
 * print the type and price before anyone clicks. It is plain JavaScript so both
 * a CommonJS script and a React component can require it; if this script grew
 * its own copy again, the board could promise "free" and this could bill $1.16.
 */
const { AVATAR_PER_SEC, SEED_GRID, VIDEO_TYPES, videoTypeFor } = require("../lib/video-type");

/** Measured on this channel: the avatar reads at ~165 wpm. */
const WPM = 165;
const TARGET_SECONDS = VIDEO_TYPES.avatar.seconds;
/** social-assets refuses anything larger. Checked, not assumed. */
const BUCKET_LIMIT_MB = 5;

/**
 * Accepts BOTH --name value and --name=value.
 *
 * It used to accept only the first, while the server action spawns
 * `--id=<uuid>` and every other script in this repo uses the equals form. So
 * arg("id") returned null, the filter was never applied, and a click on the
 * Render button would have rendered whatever sat at the front of the line
 * rather than the card that was clicked — paying $1.16 for the wrong video and
 * marking the wrong card done. Caught by passing a UUID that does not exist and
 * getting a card back anyway.
 */
const arg = (n) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? null : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);

/**
 * Voice and packaging, read out of the TypeScript rather than duplicated.
 *
 * This is a plain Node script and cannot import lib/voice-dna.ts, but copying
 * the rules here would guarantee they drift from the file the app uses — and
 * the whole point of that file is that it is the one place the voice lives. So
 * the exported template literals are pulled out as text. Crude, and correct.
 */
function readExport(file, name) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(new RegExp(`export const ${name}\\s*=\\s*(?:String\\.raw)?\`([\\s\\S]*?)\`;`));
  if (!m) throw new Error(`could not read ${name} from ${file}`);
  return m[1];
}

function writingBrief() {
  const voice = readExport("lib/voice-dna.ts", "VOICE_SUMMARY");
  const packaging = readExport("lib/content-strategy.ts", "PACKAGING");
  return { voice, packaging };
}

/** Turn a card into spoken words. Gemini writes it; the voice file governs it. */
async function writeScript(card) {
  const { voice, packaging } = writingBrief();
  const words = Math.round((TARGET_SECONDS / 60) * WPM);

  const prompt = `Write the spoken script for a ${TARGET_SECONDS}-second vertical short.

THE CARD
Title: ${card.title}
What it should cover: ${card.caption ?? "(no further direction)"}

HOW HE SOUNDS — follow this exactly. It was derived from recordings of him and
corrected by him line by line.
${voice}

WHAT WORKS ON THIS CHANNEL
${packaging}

RULES
- About ${words} words. Never more than ${words + 15}.
- Spoken words only. No headings, no stage directions, no emoji, no hashtags.
- Do NOT compress into punchy fragments. He writes complete sentences. This is
  the single most reliable way to stop sounding like him.
- Open the way he opens and close on a short instruction, the way he closes.
- Never quote a price. Never claim we report to a credit bureau.

Output only the script.`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  const j = await r.json();
  if (j.error) throw new Error(`gemini: ${j.error.message.slice(0, 160)}`);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("").trim();
  if (!text) throw new Error("gemini returned no script");
  return text;
}

async function heygen(pathname, init = {}) {
  const res = await fetch(`${HEYGEN}${pathname}`, {
    ...init,
    headers: { "x-api-key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 160)}`);
  return body;
}

/** 9:16, because this is a Short and the avatar is natively portrait. */
async function renderAvatar(script, title) {
  const created = await heygen("/v3/videos", {
    method: "POST",
    body: JSON.stringify({
      type: "avatar",
      avatar_id: process.env.HEYGEN_AVATAR_ID,
      voice_id: process.env.HEYGEN_VOICE_ID,
      script,
      title: title.slice(0, 100),
      aspect_ratio: "9:16",
      resolution: "1080p",
    }),
  });
  const id = created?.data?.video_id;
  if (!id) throw new Error("no video_id returned");
  process.stdout.write(`    ${id} `);
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 10000));
    const d = (await heygen(`/v3/videos/${id}`)).data ?? {};
    if (d.status === "completed") { console.log(`done ${Math.round((Date.now() - started) / 1000)}s`); return d; }
    if (d.status === "failed") throw new Error(`render failed: ${d.failure_message || d.failure_code}`);
    if (Date.now() - started > 15 * 60 * 1000) throw new Error(`stuck at ${d.status}`);
    process.stdout.write(".");
  }
}


/**
 * WHY THERE IS ONE SEED GRID AND NOT A DROP FOLDER.
 *
 * This used to look for experiments/grids/<item_key>.jpg and render a card as a
 * grid only if that file existed. Two things were wrong with it. The folder was
 * never filled — it is still empty — so every listicle sat permanently blocked
 * while the only format proven to work on this channel was unreachable. And a
 * MISSING FILE decided the renderer, which meant an absent image quietly became
 * "bill for the avatar instead": a fallback dressed up as routing.
 *
 * Now the seed is committed and shared, so the grid path is always available and
 * the type is a property of the CARD. Nothing on disk changes what a click buys.
 */

/**
 * The six names the reel walks through, pulled out of the card.
 *
 * reel_hairstyles.js puts a number on screen while each cut is held, because
 * the caption asks the viewer to comment a number. So the names are not
 * decoration — they are what the motion is counting. A title alone does not
 * carry them, so they are derived from the title and caption. Text generation,
 * which is not the quota that is capped.
 */
async function gridNames(card) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text:
`Title: ${card.title}
Direction: ${card.caption ?? ""}

Return JSON only: {"headline": string, "names": [six short strings]}

headline: three or four words, what the grid is showing.
names: exactly six, each one to three words, the specific styles in order.
No numbering, no punctuation at the end, no hashtags.` }] }],
        generationConfig: { responseMimeType: "application/json" } }) }
  );
  const j = await r.json();
  if (j.error) throw new Error(`gemini: ${j.error.message.slice(0, 140)}`);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("");
  const out = JSON.parse(text);
  if (!Array.isArray(out.names) || out.names.length !== 6) throw new Error("did not get six names");
  return out;
}

(async () => {
  for (const k of ["HEYGEN_API_KEY", "HEYGEN_AVATAR_ID", "HEYGEN_VOICE_ID", "GEMINI_API_KEY"]) {
    if (!process.env[k]) { console.error(`${k} is not set.`); process.exit(1); }
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const limit = Number(arg("limit") ?? 1);

  /*
   * --id renders exactly one card. The publisher board's Render button passes
   * it, so a click renders the card that was clicked rather than whatever
   * happens to sit at the front of the line.
   */
  const only = arg("id");
  let q = db
    .from("publisher_queue")
    .select("id, item_key, title, caption, position")
    .eq("status", "queued")
    .is("video_url", null);
  if (only) q = q.eq("id", only);
  const { data: cards, error } = await q.order("position", { ascending: true }).limit(only ? 1 : limit);

  if (error) { console.error(error.message); process.exit(1); }
  if (!cards?.length) { console.log("\nNothing queued without a video.\n"); return; }

  console.log(`\n${cards.length} card${cards.length > 1 ? "s" : ""} to render\n`);
  let estimate = 0;
  for (const c of cards) {
    // The same call the Render button prints from, so this listing and the
    // button can never quote a different price for the same card.
    const kind = videoTypeFor(c);
    estimate += kind.costUsd;
    console.log(
      `  pos ${String(c.position).padStart(3)}  ${kind.label.padEnd(15)} ${kind.costLabel.padEnd(7)}  ${c.title}`
    );
  }
  console.log(`\n  total ~$${estimate.toFixed(2)}  (grid cards cost nothing)`);
  console.log(`  seed grid: ${SEED_GRID}\n`);

  if (!has("go")) {
    console.log(`\nDry run — nothing generated, no credit spent. Add --go to render.\n`);
    // Show the script it would speak, so the words can be judged before paying.
    const c = cards[0];
    console.log(`--- the script it would use for "${c.title}" ---\n`);
    console.log(await writeScript(c));
    console.log("");
    return;
  }

  let spent = 0;
  let failed = 0;
  for (const c of cards) {
    console.log(`\n${c.title}`);
    /*
     * ONE CARD'S FAILURE IS THAT CARD'S FAILURE. It is caught so a batch does
     * not abort on the first bad row, and it is caught HERE — outside the
     * renderer choice — so nothing downstream can respond to a failure by
     * trying the other video type. The row keeps its null video_url, the board
     * keeps showing a Render button, and the fix is a fix, not a retry with a
     * cheaper renderer.
     */
    try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rq-"));
    const raw = path.join(tmp, "raw.mp4");
    const kind = videoTypeFor(c);
    let captionOut = null;
    let seconds = TARGET_SECONDS;

    if (kind.id === "grid") {
      /* GRID PATH — free, nine seconds, and the format that actually wins. */
      /*
       * NO FALLBACK. If the seed is missing this card fails and stays failed.
       * The tempting alternative — render the avatar instead — is how a
       * listicle becomes a talking head reciting six names: $1.16 for the worst
       * version of the format that works best.
       */
      if (!fs.existsSync(SEED_GRID)) {
        throw new Error(`seed grid missing at ${SEED_GRID} — fix the seed, do not render an avatar instead`);
      }
      console.log(`  grid: ${SEED_GRID}`);
      const { headline, names } = await gridNames(c);
      console.log(`  ${headline} — ${names.join(", ")}`);
      execFileSync("node", [
        "scripts/instagram/reel_hairstyles.js",
        `--in=${SEED_GRID}`, `--out=${raw}`,
        `--names=${JSON.stringify(names)}`,
        `--headline=${headline}`,
        `--cta=Comment the number and I'll send you shops that do it.`,
      ], { stdio: ["ignore", "ignore", "pipe"] });
      seconds = 9;
      captionOut = [
        headline, "",
        names.map((n, i) => `${i + 1}. ${n}`).join("\n"), "",
        "Comment the number you want and I'll send you shops near you that actually do it.",
      ].join("\n");
    } else {
      const script = await writeScript(c);
      console.log(`  avatar: ${script.split(/\s+/).length} words`);
      const done = await renderAvatar(script, c.title);
      spent += (done.duration ?? TARGET_SECONDS) * AVATAR_PER_SEC;
      seconds = Math.round(done.duration ?? TARGET_SECONDS);
      captionOut = script;
      fs.writeFileSync(raw, Buffer.from(await (await fetch(done.video_url)).arrayBuffer()));
    }

    /*
     * COMPRESSED BEFORE UPLOAD, because the bucket refuses anything over 5MB
     * and HeyGen returns far more than that. The first real render came back at
     * 14.5MB for 32 seconds and the upload was rejected AFTER the credit had
     * been spent — the video existed, was paid for, and had nowhere to go.
     *
     * Nobody hit this before because every other short in that bucket is a
     * nine-second data card at about 1MB. A talking head is a different animal.
     *
     * Smaller is better here anyway, and not merely tolerable: the publisher
     * FETCHES this URL and re-uploads the bytes to five platforms on every
     * slot, and every one of them re-encodes on arrival. 1.1 Mbps on a static
     * background with a single speaker is visually indistinguishable from the
     * original and roughly a third of the size.
     */
    const mp4 = path.join(tmp, "v.mp4");
    execFileSync(FFMPEG, [
      "-y", "-hide_banner", "-loglevel", "error", "-i", raw,
      "-c:v", "libx264", "-preset", "slow", "-crf", "26",
      "-maxrate", "1100k", "-bufsize", "2200k", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", mp4,
    ], { stdio: "ignore" });

    const mb = fs.statSync(mp4).size / 1048576;
    console.log(`  ${(fs.statSync(raw).size / 1048576).toFixed(1)}MB -> ${mb.toFixed(2)}MB`);
    if (mb > BUCKET_LIMIT_MB) {
      // Refuse rather than let the upload fail after the credit is gone. The
      // file is left in tmp so a longer script can be re-encoded by hand
      // instead of re-rendered.
      console.log(`  TOO BIG for the ${BUCKET_LIMIT_MB}MB bucket limit — left at ${mp4}`);
      continue;
    }

    const key = c.item_key.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const up = await db.storage.from("social-assets")
      .upload(`shorts/${key}.mp4`, fs.readFileSync(mp4), { contentType: "video/mp4", upsert: true });
    if (up.error) { console.log(`  upload failed: ${up.error.message}`); continue; }
    const videoUrl = db.storage.from("social-assets").getPublicUrl(`shorts/${key}.mp4`).data.publicUrl;

    // A frame from two seconds in — past the first blink, before any gesture.
    let thumbUrl = null;
    try {
      const jpg = path.join(tmp, "c.jpg");
      execFileSync(FFMPEG, ["-y", "-ss", "2", "-i", mp4, "-frames:v", "1", "-q:v", "3", jpg], { stdio: "ignore" });
      const t = await db.storage.from("entity-photos")
        .upload(`shorts/cover-${key}.jpg`, fs.readFileSync(jpg), { contentType: "image/jpeg", upsert: true });
      if (!t.error) thumbUrl = db.storage.from("entity-photos").getPublicUrl(`shorts/cover-${key}.jpg`).data.publicUrl;
    } catch { /* a missing cover is cosmetic; the video still publishes */ }

    // Written LAST. This is what makes the card publishable, so nothing is
    // marked ready until the file is actually in storage and reachable.
    const { error: updErr } = await db.from("publisher_queue").update({
      video_url: videoUrl,
      thumbnail_url: thumbUrl,
      duration_secs: seconds,
      caption: captionOut,
      updated_at: new Date().toISOString(),
    }).eq("id", c.id);

    fs.rmSync(tmp, { recursive: true, force: true });
    if (updErr) { console.log(`  queue update failed: ${updErr.message}`); continue; }
    console.log(`  ready — ${videoUrl}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED — ${e.message}`);
      console.error(`  left unrendered. Fix the cause and click Render again; nothing else was substituted.`);
    }
  }
  console.log(`\nspent ~$${spent.toFixed(2)}${failed ? `  ${failed} failed` : ""}\n`);
  if (failed) process.exit(1);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
