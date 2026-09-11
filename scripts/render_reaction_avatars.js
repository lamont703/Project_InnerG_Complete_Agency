#!/usr/bin/env node
/**
 * REACTION AVATARS — buy the six face moments, and nothing else.
 *
 *   node scripts/render_reaction_avatars.js         # dry run, prices it
 *   node scripts/render_reaction_avatars.js --go    # buys
 *
 * THE SPEC IS reference/reaction-one-person-ai/reaction.spec.json, WHICH IS THE
 * SAME DOCUMENT AS THE ARTIFACT. The artifact is where the six segments are
 * argued; the spec is where they are executed. Nothing here re-derives a cut
 * point or an angle — change the spec, or change the artifact and then the
 * spec, but never this file.
 *
 * IT DRIVES THE AVATAR FROM AUDIO WE ALREADY BOUGHT. HeyGen states the contract:
 *
 *   "An audio source is required: provide (script + voice_id), audio_url, or
 *    audio_asset_id."
 *
 * Sending `script` instead would re-synthesise — paying for speech a second
 * time at a take that does not match the one already approved. The narration in
 * script/narration/ is the only voice this video has.
 *
 * CUTS LAND ON SENTENCE BOUNDARIES, taken from the word_timestamps saved beside
 * each WAV. That is what makes face time extendable later: an extension is a
 * new clip appended at a full stop, not a replacement for one already paid for.
 * `--verify-cuts` re-checks every in/out against those timings and buys nothing.
 *
 * THREE THINGS COPIED FROM render_news_short.js BECAUSE THEY WERE LEARNED THE
 * EXPENSIVE WAY:
 *
 *   1. entity-photos, NOT social-assets. That bucket allows only image/* and
 *      video/*, caps at 5MB, and refuses an audio upload with "mime type
 *      audio/wav is not supported".
 *   2. mp3, not wav. A third party fetches this over the network; 20s of wav is
 *      megabytes of nothing.
 *   3. THE PAID RENDER GETS ITS OWN CACHE, ahead of any composite. A composite
 *      fails for a dozen free reasons, and re-buying an avatar to fix one of
 *      them is paying twice for the same seconds.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const ROOT = path.join("reference", "reaction-one-person-ai");
const SPEC = path.join(ROOT, "reaction.spec.json");
const NARR = path.join(ROOT, "script", "narration");
const OUT = path.join(ROOT, "avatar");

const GO = process.argv.includes("--go");
const VERIFY = process.argv.includes("--verify-cuts");

const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));
const { avatar: AV, budget: B } = spec;

for (const k of ["HEYGEN_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[k]) { console.error(`missing ${k} in .env.local`); process.exit(1); }
}
for (const env of Object.values(AV.angles)) {
  if (!process.env[env]) { console.error(`missing ${env} in .env.local`); process.exit(1); }
}

async function heygen(p, init = {}) {
  const res = await fetch("https://api.heygen.com" + p, {
    ...init,
    headers: { "x-api-key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`${p} -> ${res.status}: ${body?.error?.message || body?.message || body?.raw}`);
  return body;
}

const secs = (g) => Number((g.out - g.in).toFixed(2));

/*
 * A cut that is not on a full stop still renders — it just forfeits the segment
 * if the face time is ever extended. Worth asserting rather than trusting.
 */
function verifyCuts() {
  let bad = 0;
  for (const g of spec.segments) {
    const wf = path.join(NARR, `${g.beat}.words.json`);
    const wt = (JSON.parse(fs.readFileSync(wf, "utf8")).word_timestamps || [])
      .filter((w) => String(w.word || "").trim().match(/[.?!]$/))
      .map((w) => w.end);
    const near = (t) => t === 0 || wt.some((e) => Math.abs(e - t) < 0.35);
    const ok = near(g.in) && near(g.out);
    if (!ok) bad++;
    console.log(`  ${g.id}  ${g.beat}  ${String(g.in).padStart(5)} -> ${String(g.out).padStart(5)}  ${ok ? "on a full stop" : "NOT on a sentence boundary"}`);
  }
  console.log(bad ? `\n  ${bad} segment(s) would forfeit on extension.\n` : "\n  every cut lands on a full stop.\n");
  return bad === 0;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  if (VERIFY) { process.exit(verifyCuts() ? 0 : 1); }

  /* ---- price it BEFORE anything is bought ---- */
  let total = 0;
  console.log("");
  for (const g of spec.segments) {
    const d = secs(g);
    total += d;
    const have = fs.existsSync(path.join(OUT, `${g.id}.mp4`));
    console.log(`  ${g.id}  ${g.beat}  ${d.toFixed(1).padStart(5)}s  ${g.angle.padEnd(8)} $${(d * B.avatarPerSec).toFixed(2)}${have ? "   [already bought]" : ""}`);
  }
  const cost = total * B.avatarPerSec;
  console.log(`\n  ${total.toFixed(1)}s of face  $${cost.toFixed(2)}  (cap $${B.capUsd.toFixed(2)})`);

  if (cost > B.capUsd) {
    console.error(`\nOVER BUDGET: $${cost.toFixed(2)} exceeds the $${B.capUsd.toFixed(2)} cap in the spec.`);
    console.error("Raise capUsd in reaction.spec.json deliberately, or cut seconds. Nothing was bought.\n");
    process.exit(1);
  }
  if (!verifyCuts()) {
    console.error("Refusing to buy: a cut is not on a sentence boundary, so it could not be extended later.\n");
    process.exit(1);
  }
  if (!GO) { console.log("Dry run. Add --go to buy.\n"); return; }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let spent = 0;

  for (const g of spec.segments) {
    const dest = path.join(OUT, `${g.id}.mp4`);
    if (fs.existsSync(dest)) { console.log(`  ${g.id}  already bought, skipping`); continue; }

    const d = secs(g);
    const mp3 = path.join(OUT, `${g.id}.mp3`);
    if (!fs.existsSync(mp3)) {
      execFileSync(FF, ["-nostdin", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", String(g.in), "-to", String(g.out), "-i", path.join(NARR, `${g.beat}.wav`),
        "-c:a", "libmp3lame", "-b:a", "192k", mp3], { stdio: "ignore" });
    }

    const key = `${AV.keyPrefix}/${spec.slug}-${g.id}.mp3`;
    const up = await db.storage.from(AV.bucket)
      .upload(key, fs.readFileSync(mp3), { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw new Error(`${g.id} audio upload failed: ${up.error.message}`);
    const audioUrl = db.storage.from(AV.bucket).getPublicUrl(key).data.publicUrl;

    console.log(`  ${g.id}  ${d.toFixed(1)}s ${g.angle} ≈ $${(d * B.avatarPerSec).toFixed(2)}`);
    const created = await heygen("/v3/videos", {
      method: "POST",
      body: JSON.stringify({
        type: "avatar",
        avatar_id: process.env[AV.angles[g.angle]],
        audio_url: audioUrl,
        title: `${spec.slug}-${g.id}`.slice(0, 100),
        aspect_ratio: AV.aspectRatio,
        resolution: AV.resolution,
      }),
    });
    const id = created?.data?.video_id;
    if (!id) throw new Error(`${g.id}: no video_id returned`);

    process.stdout.write("    ");
    const began = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, 10000));
      const s = (await heygen(`/v3/videos/${id}`)).data ?? {};
      if (s.status === "completed") {
        const r = await fetch(s.video_url);
        fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
        console.log(` done ${Math.round((Date.now() - began) / 1000)}s`);
        break;
      }
      if (s.status === "failed") throw new Error(`${g.id} failed: ${s.failure_message || s.failure_code}`);
      if (Date.now() - began > 15 * 60 * 1000) throw new Error(`${g.id} stuck at ${s.status}`);
      process.stdout.write(".");
    }

    /*
     * VERIFY THE PICTURE, NOT THE DIMENSIONS. A portrait talking photo asked for
     * 16:9 returns a genuinely 1920x1080 file with the render pillarboxed in
     * white, and nothing errors. Asserting the width alone would pass on exactly
     * the failure this project already paid for once.
     */
    const dims = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height", "-of", "csv=p=0", dest]).toString().trim();
    if (!dims.startsWith("1920,1080")) throw new Error(`${g.id}: expected 1920x1080, got ${dims}`);
    spent += d * B.avatarPerSec;
  }

  console.log(`\n  $${spent.toFixed(2)} spent this run.  ${OUT}\n`);
})().catch((e) => { console.error("\n" + e.message + "\n"); process.exit(1); });
