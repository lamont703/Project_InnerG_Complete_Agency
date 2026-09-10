#!/usr/bin/env node
/**
 * REACTION NARRATION — TTS only, no avatar, so the voice can be heard and
 * approved before anything expensive is bought.
 *
 *   node scripts/render_reaction_narration.js          # dry run, prices it
 *   node scripts/render_reaction_narration.js --go     # generates
 *
 * WHY THIS IS A SEPARATE STEP FROM THE AVATAR. Speech is $0.000667/sec and the
 * avatar is $0.0386/sec — 58x. Listening first costs about forty cents; being
 * wrong about the script after buying the avatar costs about twenty-three
 * dollars. So the audio is always bought first, listened to, and only then
 * mapped to a face.
 *
 * ONE FILE PER BEAT, NOT ONE LONG TAKE. A beat can be re-recorded on its own
 * when a line changes, and the graphics are cut per beat anyway. A single
 * 9-minute WAV would mean re-buying all of it to fix one sentence.
 *
 * word_timestamps ARE SAVED EVEN THOUGH NOTHING READS THEM YET. They come back
 * free with the audio and cannot be recovered later without paying for the
 * audio again — the same reasoning as scripts/video_build_assets.js.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const API = "https://api.heygen.com";
const DIR = "reference/reaction-one-person-ai/script";
const OUT = path.join(DIR, "narration");

const SPEECH_PER_SEC = 0.000667;
const WPM = 175; // measured across shipped episodes; see lib/newsdesk-config.js

const go = process.argv.includes("--go");

for (const k of ["HEYGEN_API_KEY", "HEYGEN_VOICE_ID"]) {
  if (!process.env[k]) { console.error(`missing ${k} in .env.local`); process.exit(1); }
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      "x-api-key": process.env.HEYGEN_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
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

const beats = fs.readdirSync(DIR).filter((f) => /^beat-\d+\.txt$/.test(f)).sort();
if (!beats.length) { console.error(`no beat-NN.txt in ${DIR}`); process.exit(1); }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  let est = 0, estWords = 0;
  console.log("");
  for (const f of beats) {
    const id = f.replace(/\.txt$/, "");
    const words = fs.readFileSync(path.join(DIR, f), "utf8").trim().split(/\s+/).length;
    const secs = (words / WPM) * 60;
    estWords += words; est += secs * SPEECH_PER_SEC;
    const have = fs.existsSync(path.join(OUT, `${id}.wav`));
    console.log(`  ${id}  ${String(words).padStart(4)}w  ~${secs.toFixed(0).padStart(3)}s  ~$${(secs * SPEECH_PER_SEC).toFixed(3)}${have ? "   [already have it]" : ""}`);
  }
  const estSecs = Math.round((estWords / WPM) * 60);
  console.log(`\n  ${estWords} words  ~${Math.floor(estSecs / 60)}:${String(estSecs % 60).padStart(2, "0")}  ~$${est.toFixed(2)} total`);

  if (!go) { console.log("\nDry run. Add --go to generate.\n"); return; }

  console.log("\ngenerating…\n");
  let spent = 0, total = 0;
  for (const f of beats) {
    const id = f.replace(/\.txt$/, "");
    const dest = path.join(OUT, `${id}.wav`);
    if (fs.existsSync(dest)) { console.log(`  ${id}  already have it, skipping`); continue; }

    const text = fs.readFileSync(path.join(DIR, f), "utf8").trim();
    const j = await api("/v3/voices/speech", {
      method: "POST",
      body: JSON.stringify({
        text,
        voice_id: process.env.HEYGEN_VOICE_ID,
        input_type: "text",
        speed: 1,
      }),
    });
    const d = j.data ?? {};
    if (!d.audio_url) throw new Error(`${id}: no audio_url in ${JSON.stringify(j).slice(0, 200)}`);

    const bytes = await download(d.audio_url, dest);
    fs.writeFileSync(
      path.join(OUT, `${id}.words.json`),
      JSON.stringify({ duration: d.duration, word_timestamps: d.word_timestamps ?? [] }, null, 2),
    );

    const cost = (d.duration ?? 0) * SPEECH_PER_SEC;
    spent += cost; total += d.duration ?? 0;
    console.log(`  ${id}  ${(d.duration ?? 0).toFixed(1)}s  ${(bytes / 1024).toFixed(0)}KB  $${cost.toFixed(3)}`);
  }

  const m = Math.floor(total / 60), s = Math.round(total % 60);
  console.log(`\n  ${m}:${String(s).padStart(2, "0")} of narration  $${spent.toFixed(2)} spent`);
  console.log(`  ${OUT}\n`);
})().catch((e) => { console.error("\n" + e.message + "\n"); process.exit(1); });
