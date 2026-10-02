#!/usr/bin/env node
/**
 * REACTION EXPRESSION TEST — does the avatar's face follow a real recorded
 * reaction, or only the `expressiveness` setting?
 *
 *   node scripts/heygen/reaction_expression_test.js --audio=<file> [--in=7.3 --out=21.8] [--go]
 *
 * WHY OUR OWN AUDIO AND NOT VOICE MIRRORING. Mirroring moves one person's
 * delivery into a different voice, and it exists only in HeyGen's web studio.
 * The avatar's voice is a clone of the person recording, so the recording is
 * already the right voice with the real inflection — Audio to Video
 * (POST /v3/videos with audio_url) lip-syncs to it directly.
 *
 * TWO RENDERS OF THE SAME AUDIO, low and high expressiveness. One render can't
 * answer the question: a lively face at "high" might be the setting, not the
 * emotion. Same audio, same motion prompt, only the dial changes — so any
 * difference between the two is the dial, and whatever both share is the audio.
 *
 * HEYGEN TAKES MP3 OR WAV ONLY. Phone recordings arrive as .m4a, so the clip is
 * converted to mp3 (a third party fetches it; wav is megabytes of nothing) and
 * uploaded to entity-photos — social-assets refuses audio mime types.
 *
 * Dead air is trimmed before upload: the avatar is billed per second, and a
 * silent lead-in is paid face time doing nothing.
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const AUDIO = arg("audio");
const IN = arg("in");
const OUT_T = arg("out");
const GO = process.argv.includes("--go");
const PER_SEC = 0.0386; // reference/reaction-one-person-ai/reaction.spec.json budget.avatarPerSec
const AVATAR_ENV = arg("avatar-env", "HEYGEN_LANDSCAPE_AVATAR_ID");
const LEVELS = arg("levels", "low,high").split(",");
const MOTION = arg("motion",
  "Reacts to something he just watched. First genuine surprise: eyebrows lift, head pulls back slightly, eyes widen. " +
  "Then growing frustration: slow head shake, a short exhale, one open hand gesturing as if to say 'come on'. " +
  "Ends composed, leaning in slightly as if deciding to keep watching.");

const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };
if (!AUDIO || !fs.existsSync(AUDIO)) die("--audio=<existing file> is required");
/* --avatar-id takes a raw photo-avatar id for one-off trials that have no env
   var yet; otherwise the id comes from --avatar-env. */
const AVATAR_ID = arg("avatar-id") || process.env[AVATAR_ENV];
if (!AVATAR_ID) die(`missing ${AVATAR_ENV}`);

const heygen = async (p, init = {}) => {
  const r = await fetch("https://api.heygen.com" + p, { ...init,
    headers: { "X-Api-Key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${p} HTTP ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
  return j;
};

(async () => {
  const dir = path.join("experiments", "Audio Reactions", "renders");
  fs.mkdirSync(dir, { recursive: true });
  /* --tag keeps a retry from overwriting an earlier run's renders and sidecar —
     those paid video ids are the only record of what was bought. */
  const TAG = arg("tag");
  const stem = path.basename(AUDIO).replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + (TAG ? `-${TAG}` : "");
  const mp3 = path.join(dir, `${stem}.mp3`);
  const trim = [...(IN ? ["-ss", IN] : []), "-i", AUDIO, ...(OUT_T ? ["-t", String(Number(OUT_T) - Number(IN || 0))] : [])];
  execFileSync(FF, ["-nostdin", "-y", "-hide_banner", "-loglevel", "error", ...trim,
    "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
  const secs = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", mp3]).toString());
  const est = secs * PER_SEC * LEVELS.length;
  console.log(`\n  audio   ${mp3}  ${secs.toFixed(2)}s`);
  console.log(`  renders ${LEVELS.join(" + ")} expressiveness  ~$${est.toFixed(2)} at $${PER_SEC}/s`);
  if (!GO) { console.log("\n  dry run — nothing uploaded or bought. Add --go.\n"); return; }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const key = `reaction-audio/test-${stem}-${Date.now()}.mp3`;
  const up = await db.storage.from("entity-photos").upload(key, fs.readFileSync(mp3), { contentType: "audio/mpeg", upsert: true });
  if (up.error) die(`upload failed: ${up.error.message}`);
  const audioUrl = db.storage.from("entity-photos").getPublicUrl(key).data.publicUrl;
  console.log(`  uploaded ${audioUrl}`);

  const jobs = [];
  for (const level of LEVELS) {
    const c = await heygen("/v3/videos", { method: "POST", body: JSON.stringify({
      type: "avatar",
      avatar_id: AVATAR_ID,
      audio_url: audioUrl,
      expressiveness: level,
      motion_prompt: MOTION,
      title: `expression-test-${stem}-${level}`.slice(0, 100),
      aspect_ratio: "16:9",
      resolution: "1080p",
    }) });
    const id = c?.data?.video_id;
    if (!id) die(`no video_id for ${level}: ${JSON.stringify(c).slice(0, 300)}`);
    jobs.push({ level, id });
    console.log(`  queued  ${level.padEnd(6)} ${id}`);
  }

  /* Sidecar first: if polling dies, the paid video ids are not lost. */
  fs.writeFileSync(path.join(dir, `${stem}.jobs.json`), JSON.stringify({ audio: AUDIO, audioUrl, secs, motion: MOTION, jobs }, null, 2));

  const pending = new Set(jobs.map((j) => j.id));
  for (let i = 0; i < 180 && pending.size; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    for (const j of jobs) {
      if (!pending.has(j.id)) continue;
      const s = (await heygen(`/v3/videos/${j.id}`)).data ?? {};
      if (s.status === "completed" && s.video_url) {
        const f = path.join(dir, `${stem}-${j.level}.mp4`);
        fs.writeFileSync(f, Buffer.from(await (await fetch(s.video_url)).arrayBuffer()));
        console.log(`  done    ${j.level.padEnd(6)} ${f}  ${s.duration ?? "?"}s`);
        pending.delete(j.id);
      } else if (s.status === "failed") {
        console.log(`  FAILED  ${j.level.padEnd(6)} ${JSON.stringify(s.error ?? s).slice(0, 300)}`);
        pending.delete(j.id);
      }
    }
  }
  if (pending.size) console.log(`  still pending: ${[...pending].join(", ")} — ids saved in the .jobs.json sidecar`);
})().catch((e) => die(e.message));
