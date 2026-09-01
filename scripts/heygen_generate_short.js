#!/usr/bin/env node
/**
 * Generate a 60-second vertical avatar video with HeyGen, and keep the result.
 *
 * A SCRIPT, DELIBERATELY, NOT A ROUTE. Nothing in the app calls this. Avatar
 * videos are made a few times a week by a person who has just written and read
 * the words; there is no automation worth building around that, and a route
 * would put a paid, slow, credit-consuming API behind an HTTP handler for no
 * reason. Output lands in reference/, which is gitignored, so a 20MB MP4 never
 * reaches the repository.
 *
 * V3, NOT V2. HeyGen's own docs say "The HeyGen API V2 corresponds to the
 * Legacy AI Studio and will be deprecated soon." Every blog post and half the
 * examples online still show the v2 `video_inputs` / `character` / `voice`
 * nesting, which is a completely different body shape from what is written
 * here. If this file stops working, check whether v3 moved before assuming the
 * key is wrong.
 *
 *   POST https://api.heygen.com/v3/videos      -> { data: { video_id, status } }
 *   GET  https://api.heygen.com/v3/videos/{id} -> { data: { status, video_url, ... } }
 *
 * Auth is the `x-api-key` header. Not Bearer, though the docs say a Bearer
 * token is also accepted — one header, chosen and stuck to.
 *
 * DRY BY DEFAULT, AND THAT IS THE POINT. Generation costs credits and cannot be
 * undone. Running with no flags validates the key, resolves the avatar and
 * voice, counts the words and estimates the runtime, and spends nothing. Pass
 * --go when the estimate looks right. The failure this prevents is burning a
 * credit on a script that was always going to run 78 seconds.
 *
 * Usage:
 *   node scripts/heygen_generate_short.js --list-voices
 *   node scripts/heygen_generate_short.js --list-avatars
 *   node scripts/heygen_generate_short.js --script reference/heygen/video3.txt
 *   node scripts/heygen_generate_short.js --script reference/heygen/video3.txt --go
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const API = "https://api.heygen.com";
const OUT_DIR = path.join(__dirname, "..", "reference", "heygen");

/**
 * Speaking rate used to estimate runtime.
 *
 * 150 wpm is a measured conversational pace for this format, not a guess pulled
 * from nowhere: the three scripts written for this series ran 130-138 words and
 * landed between 52 and 56 seconds. Faster reads exist, but an avatar delivers
 * evenly and does not speed up on a list, so the estimate holds better here
 * than it would for a human read.
 */
const WORDS_PER_MINUTE = 150;
const HARD_CAP_SECONDS = 60;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}
const has = (name) => process.argv.includes(`--${name}`);

function key() {
  const k = process.env.HEYGEN_API_KEY;
  if (!k) {
    console.error("HEYGEN_API_KEY is not set in .env.local. See the header of this file.");
    process.exit(1);
  }
  return k;
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { "x-api-key": key(), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    /*
     * HeyGen returns its errors inside the envelope rather than only as a
     * status, so the message is dug out here. A bare "HTTP 400" from this API
     * tells you nothing about which of avatar_id, voice_id or script it
     * disliked.
     */
    const msg = body?.error?.message || body?.message || body?.raw || `HTTP ${res.status}`;
    throw new Error(`${pathname} -> ${res.status}: ${msg}`);
  }
  return body;
}

/* ------------------------------------------------------------------ listing */

/**
 * Walk every page of a v3 list endpoint.
 *
 * THE ENVELOPE IS NOT WHAT THE EXAMPLES SHOW. `data` is a BARE ARRAY, not an
 * object with a `.looks` or `.items` key, and the paging cursor lives at the
 * TOP level as `has_more` / `next_token` — passed back as `token`, not
 * `cursor`. An extractor written for the nested shape returns an empty array
 * and reads as "this account has no avatars".
 *
 * Paging is not optional here. `limit` caps at 50 (the API rejects 100 with
 * "Input should be less than or equal to 50" rather than clamping), and this
 * account resolves 1,550 avatar looks across 31 pages. A single unpaged call
 * shows the first 50 stock avatars and confidently omits the one you are
 * actually looking for.
 */
async function listAll(pathname, cap = 40) {
  const out = [];
  let token = null;
  for (let page = 0; page < cap; page++) {
    const sep = pathname.includes("?") ? "&" : "?";
    const url = `${pathname}${sep}limit=50${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    const j = await api(url);
    const items = Array.isArray(j.data) ? j.data : j?.data?.items ?? [];
    out.push(...items);
    if (!j.has_more || !j.next_token || j.next_token === token) break;
    token = j.next_token;
  }
  return out;
}

async function listVoices() {
  const voices = await listAll("/v3/voices");
  const want = process.env.HEYGEN_VOICE_ID;
  console.log(`\n${voices.length} voices\n`);
  for (const v of voices) {
    const id = String(v.voice_id || v.id);
    console.log(
      `  ${id === want ? ">" : " "} ${id.padEnd(36)} ${String(v.name || "").padEnd(28)} ` +
      `${String(v.language || "").padEnd(12)} ${v.gender || ""}`
    );
  }
  console.log("\nPut the one you use in .env.local as HEYGEN_VOICE_ID. '>' marks the current one.\n");
}

/**
 * Avatar LOOKS, not avatar groups.
 *
 * The distinction matters and is easy to get wrong: a group is the character,
 * a look is an outfit or pose of that character, and HeyGen's docs are explicit
 * that "The look id is the avatar_id to pass when creating a video". Listing
 * groups gives you ids that look plausible and fail at generation.
 */
async function listAvatars() {
  const looks = await listAll("/v3/avatars/looks");
  const want = process.env.HEYGEN_AVATAR_ID;
  console.log(`\n${looks.length} avatar looks\n`);
  const mine = looks.filter((a) => (a.id || a.avatar_id) === want);
  for (const a of mine.length ? mine : looks.slice(0, 50)) {
    const id = String(a.id || a.avatar_id);
    console.log(
      `  ${id === want ? ">" : " "} ${id.padEnd(36)} ${String(a.name || "").padEnd(34)} ` +
      `${String(a.avatar_type || "").padEnd(14)} ${a.preferred_orientation || ""}`
    );
  }
  if (mine.length) {
    console.log(`\nHEYGEN_AVATAR_ID resolves. Its default voice is ${mine[0].default_voice_id || "(none)"}.`);
  } else if (want) {
    console.log(`\nHEYGEN_AVATAR_ID ${want} was NOT found in ${looks.length} looks — showing the first 50 instead.`);
  }
  console.log("\nThe look id is what goes in HEYGEN_AVATAR_ID.\n");
}

/* --------------------------------------------------------------- generation */

function readScript() {
  const p = arg("script");
  if (!p) {
    console.error("Pass --script <file>. Plain text; blank lines are fine and are read as pauses.");
    process.exit(1);
  }
  const raw = fs.readFileSync(p, "utf8");

  /*
   * Blank lines are kept. They are how the script signals a beat, and HeyGen
   * respects paragraph breaks in delivery — collapsing the file to one line
   * produces a flat, breathless read of copy that was written with pauses.
   */
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    console.error(`${p} is empty.`);
    process.exit(1);
  }
  return text;
}

function estimate(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const seconds = (words / WORDS_PER_MINUTE) * 60;
  return { words, seconds };
}

async function poll(videoId) {
  /*
   * Polls rather than using callback_url. A webhook needs a public endpoint,
   * and this runs on a laptop. Generation of a one-minute clip has been taking
   * a couple of minutes, so the ceiling is generous and the interval is slow
   * enough not to hammer a paid API.
   */
  const started = Date.now();
  const LIMIT_MS = 15 * 60 * 1000;
  process.stdout.write("waiting");
  for (;;) {
    await new Promise((r) => setTimeout(r, 10000));
    const j = await api(`/v3/videos/${videoId}`);
    const d = j?.data ?? {};
    if (d.status === "completed") {
      console.log(` done in ${Math.round((Date.now() - started) / 1000)}s`);
      return d;
    }
    if (d.status === "failed") {
      console.log("");
      throw new Error(`generation failed: ${d.failure_code || "?"} — ${d.failure_message || "no message"}`);
    }
    if (Date.now() - started > LIMIT_MS) {
      console.log("");
      throw new Error(`still ${d.status} after 15 minutes; video_id ${videoId} — check the HeyGen dashboard`);
    }
    process.stdout.write(".");
  }
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return fs.statSync(dest).size;
}

async function main() {
  if (has("list-voices")) return listVoices();
  if (has("list-avatars")) return listAvatars();

  const avatarId = arg("avatar") || process.env.HEYGEN_AVATAR_ID;
  const voiceId = arg("voice") || process.env.HEYGEN_VOICE_ID;
  if (!avatarId) {
    console.error("No avatar. Set HEYGEN_AVATAR_ID in .env.local or pass --avatar.");
    process.exit(1);
  }

  const text = readScript();
  const { words, seconds } = estimate(text);
  const title = arg("title") || path.basename(arg("script")).replace(/\.[^.]+$/, "");

  console.log(`\nscript      ${arg("script")}`);
  console.log(`title       ${title}`);
  console.log(`avatar      ${avatarId}`);
  console.log(`voice       ${voiceId || "(avatar default)"}`);
  console.log(`words       ${words}`);
  console.log(`estimate    ~${seconds.toFixed(0)}s at ${WORDS_PER_MINUTE} wpm`);

  if (seconds > HARD_CAP_SECONDS) {
    /*
     * Refuses rather than warns. The whole format is a 60-second cap, and an
     * over-length generation is a spent credit plus a re-edit — the two things
     * this pre-flight exists to avoid. --force is there for the case where the
     * estimate is wrong and the operator knows it.
     */
    const over = seconds - HARD_CAP_SECONDS;
    if (!has("force")) {
      console.error(
        `\nREFUSING: estimated ${seconds.toFixed(0)}s is ${over.toFixed(0)}s over the ${HARD_CAP_SECONDS}s cap.\n` +
        `Cut roughly ${Math.ceil((over / 60) * WORDS_PER_MINUTE)} words, or pass --force.\n`
      );
      process.exit(1);
    }
    console.log(`\nover cap by ${over.toFixed(0)}s — proceeding because --force was passed`);
  }

  if (!has("go")) {
    console.log(`\nDry run. Nothing generated and no credit spent.`);
    console.log(`Add --go to generate.\n`);
    return;
  }

  const body = {
    type: "avatar",
    avatar_id: avatarId,
    script: text,
    title,
    // Vertical, full resolution. Shorts and Reels are both 9:16; anything else
    // gets letterboxed by the platform and looks like a repost.
    aspect_ratio: "9:16",
    resolution: "1080p",
    ...(voiceId ? { voice_id: voiceId } : {}),
  };

  console.log("\nsubmitting…");
  const created = await api("/v3/videos", { method: "POST", body: JSON.stringify(body) });
  const videoId = created?.data?.video_id;
  if (!videoId) throw new Error(`no video_id in response: ${JSON.stringify(created).slice(0, 300)}`);
  console.log(`video_id    ${videoId}`);

  const done = await poll(videoId);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stem = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${videoId.slice(-8)}`;
  const mp4 = path.join(OUT_DIR, `${stem}.mp4`);

  const bytes = await download(done.video_url, mp4);

  /*
   * The sidecar keeps what the MP4 cannot: which avatar and voice made it, the
   * exact words spoken, and the real duration against the estimate. Without it,
   * a folder of MP4s six weeks from now is unattributable — and the
   * estimate-vs-actual is the only way WORDS_PER_MINUTE above ever gets
   * corrected from evidence.
   */
  fs.writeFileSync(
    path.join(OUT_DIR, `${stem}.json`),
    JSON.stringify(
      {
        video_id: videoId,
        title,
        avatar_id: avatarId,
        voice_id: voiceId ?? null,
        words,
        estimated_seconds: Number(seconds.toFixed(1)),
        actual_seconds: done.duration ?? null,
        aspect_ratio: "9:16",
        resolution: "1080p",
        script: text,
        thumbnail_url: done.thumbnail_url ?? null,
        generated_at: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`\nsaved       ${mp4}  (${(bytes / 1048576).toFixed(1)} MB)`);
  if (done.duration) {
    const drift = done.duration - seconds;
    console.log(`actual      ${done.duration}s  (estimate was off by ${drift > 0 ? "+" : ""}${drift.toFixed(1)}s)`);
    if (done.duration > HARD_CAP_SECONDS) console.log(`OVER CAP by ${(done.duration - HARD_CAP_SECONDS).toFixed(1)}s — trim before publishing.`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
