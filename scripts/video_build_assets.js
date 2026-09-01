#!/usr/bin/env node
/**
 * Generate every paid asset for a long-form video, once.
 *
 * SPLIT FROM ASSEMBLY ON PURPOSE. Avatar generation costs $2.32/min and takes
 * a few minutes per segment; ffmpeg assembly is free and instant. Putting them
 * in one script means every timing tweak re-buys the footage. This produces the
 * MP4s and WAVs; scripts/video_assemble.js turns them into the film and can be
 * run fifty times for nothing.
 *
 * TWO PRICES, AND THAT IS THE WHOLE COST MODEL.
 *   avatar video   POST /v3/videos          $0.0386/sec
 *   speech only    POST /v3/voices/speech   $0.000667/sec   — 58x cheaper
 * Both accept the SAME voice_id, so the narration is the same cloned voice as
 * the on-camera segments. The docs say a voice "must support the starfish
 * engine" and GET /v3/voices?engine=starfish does NOT list this cloned voice —
 * but the speech endpoint accepts it anyway. Verified by calling it. Do not
 * trust that filter to decide what is possible.
 *
 * Skips anything already downloaded, so a re-run after one failed segment costs
 * nothing for the segments that already succeeded.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const API = "https://api.heygen.com";
const DIR = path.join("reference", "heygen", "gbp-vs-social");
const OUT = path.join(DIR, "assets");

/** Order is the cut. mode decides which endpoint and which price. */
const SEGMENTS = [
  { id: "s1", mode: "avatar",    file: "s1-avatar-hook.txt" },
  { id: "s2", mode: "narration", file: "s2-narration-reach-vs-intent.txt" },
  { id: "s3", mode: "narration", file: "s3-narration-llm-layer.txt" },
  { id: "s4a", mode: "narration", file: "s4a-narration-rented.txt" },
  { id: "s4b", mode: "avatar",    file: "s4b-avatar-cameo.txt" },
  { id: "s5", mode: "avatar",    file: "s5-avatar-close.txt" },
];

const AVATAR_PER_SEC = 0.0386;
const SPEECH_PER_SEC = 0.000667;

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { "x-api-key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`${pathname} -> ${res.status}: ${body?.error?.message || body?.message || body?.raw}`);
  return body;
}

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(dest).size;
}

/** Narration: one call, returns a finished WAV. No polling, no wait. */
async function makeNarration(seg, text) {
  const dest = path.join(OUT, `${seg.id}.wav`);
  if (fs.existsSync(dest)) return { skipped: true, dest };
  const j = await api("/v3/voices/speech", {
    method: "POST",
    body: JSON.stringify({ text, voice_id: process.env.HEYGEN_VOICE_ID, input_type: "text", speed: 1 }),
  });
  const d = j.data;
  await download(d.audio_url, dest);
  /*
   * word_timestamps are kept because they are the only way to cut slides to
   * the narration without doing it by ear. Assembly does not use them yet, but
   * they cannot be recovered later without paying for the audio again.
   */
  fs.writeFileSync(path.join(OUT, `${seg.id}.words.json`),
    JSON.stringify({ duration: d.duration, word_timestamps: d.word_timestamps ?? [] }, null, 2));
  return { dest, duration: d.duration, cost: d.duration * SPEECH_PER_SEC };
}

/** Avatar: submit, then poll. 16:9 because this one is for YouTube. */
async function makeAvatar(seg, text) {
  const dest = path.join(OUT, `${seg.id}.mp4`);
  if (fs.existsSync(dest)) return { skipped: true, dest };
  const created = await api("/v3/videos", {
    method: "POST",
    body: JSON.stringify({
      type: "avatar",
      avatar_id: process.env.HEYGEN_AVATAR_ID,
      voice_id: process.env.HEYGEN_VOICE_ID,
      script: text,
      title: `gbp-vs-social ${seg.id}`,
      aspect_ratio: "16:9",
      resolution: "1080p",
    }),
  });
  const id = created?.data?.video_id;
  if (!id) throw new Error(`no video_id: ${JSON.stringify(created).slice(0, 200)}`);
  process.stdout.write(`    ${seg.id} ${id} `);
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 10000));
    const d = (await api(`/v3/videos/${id}`)).data ?? {};
    if (d.status === "completed") {
      await download(d.video_url, dest);
      console.log(`done ${Math.round((Date.now() - started) / 1000)}s`);
      return { dest, duration: d.duration, cost: (d.duration ?? 0) * AVATAR_PER_SEC };
    }
    if (d.status === "failed") throw new Error(`${seg.id} failed: ${d.failure_message || d.failure_code}`);
    if (Date.now() - started > 15 * 60 * 1000) throw new Error(`${seg.id} stuck at ${d.status}`);
    process.stdout.write(".");
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const go = process.argv.includes("--go");
  let est = 0;

  console.log("");
  for (const seg of SEGMENTS) {
    const text = fs.readFileSync(path.join(DIR, seg.file), "utf8").trim();
    const words = text.split(/\s+/).length;
    const secs = (words / 165) * 60;
    const price = seg.mode === "avatar" ? AVATAR_PER_SEC : SPEECH_PER_SEC;
    est += secs * price;
    const exists = fs.existsSync(path.join(OUT, `${seg.id}.${seg.mode === "avatar" ? "mp4" : "wav"}`));
    console.log(`  ${seg.id.padEnd(4)} ${seg.mode.padEnd(10)} ${String(words).padStart(4)}w  ~${secs.toFixed(0)}s  ~$${(secs * price).toFixed(2)}${exists ? "   [already have it]" : ""}`);
  }
  console.log(`\n  estimated total  $${est.toFixed(2)}`);

  if (!go) { console.log("\nDry run. Add --go to generate.\n"); return; }

  console.log("\ngenerating…");
  let spent = 0;
  for (const seg of SEGMENTS) {
    const text = fs.readFileSync(path.join(DIR, seg.file), "utf8").trim();
    const r = seg.mode === "avatar" ? await makeAvatar(seg, text) : await makeNarration(seg, text);
    if (r.skipped) { console.log(`    ${seg.id} already present — skipped`); continue; }
    spent += r.cost ?? 0;
    if (seg.mode === "narration") console.log(`    ${seg.id} narration ${r.duration.toFixed(1)}s  $${r.cost.toFixed(4)}`);
  }
  console.log(`\n  actually spent   ~$${spent.toFixed(2)}\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
