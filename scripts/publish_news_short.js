#!/usr/bin/env node
/**
 * FINISH AND QUEUE A NEWS DESK — captions, music, upload, publisher row.
 *
 *   node scripts/publish_news_short.js "reference/AI News Video Shorts/<spec>.json"
 *   node scripts/publish_news_short.js <spec.json> --dry
 *
 * WHY THIS IS A SCRIPT AND NOT THREE COMMANDS. It was three commands, twice.
 * The captions arguments were typed by hand, the music track was chosen at the
 * prompt, and the publisher row was inserted by a throwaway file in a temp
 * directory that no longer exists. Every one of those is a place the format
 * drifts between episodes, and the last one is not reproducible at all.
 *
 * EVERY SETTING COMES FROM lib/newsdesk-config.js. Nothing here decides
 * anything on its own — that is the point. Changing how a News Desk sounds or
 * looks is an edit to the config with a test asserting the old value, not a
 * different flag typed at a prompt.
 *
 * THE TITLE AND CAPTION LIVE IN THE SPEC, beside the script they belong to, so
 * one file is the whole record of an episode.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const FF = require("ffmpeg-static");
const { NEWSDESK } = require("../lib/newsdesk-config.js");

const has = (n) => process.argv.includes(`--${n}`);
const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const run = (args, label) => {
  const r = spawnSync("node", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${label} failed:\n${(r.stderr || r.stdout || "").trim().slice(0, 400)}`);
  return r.stdout || "";
};
const probe = (f) => {
  const err = spawnSync(FF, ["-hide_banner", "-i", f], { encoding: "utf8" }).stderr || "";
  const d = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : null;
};

(async () => {
  const specFile = process.argv[2];
  if (!specFile || !fs.existsSync(specFile)) {
    console.error("Usage: publish_news_short.js <spec.json> [--dry]");
    process.exit(1);
  }
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  if (!spec.title || !spec.caption) {
    throw new Error(`${specFile} needs "title" and "caption" — they are part of the episode, not of the run`);
  }

  const work = arg("work", path.join(".cache", "news", spec.slug));
  const rendered = path.join(work, `${spec.slug}.mp4`);
  const words = path.join(work, `${spec.slug}.words.json`);
  if (!fs.existsSync(rendered)) throw new Error(`no render at ${rendered} — run render_news_short.js first`);
  if (!fs.existsSync(words)) throw new Error(`no word timings at ${words} — re-run render_news_short.js; captions are silently empty without them`);

  console.log(`\n${spec.slug}`);

  /* ---- 1. captions ------------------------------------------------------ */
  const c = NEWSDESK.captions;
  const captioned = rendered.replace(/\.mp4$/i, "") + ".captioned.mp4";
  console.log(`1/4  captions  ${c.font} ${c.size}px, ${c.outline}px outline, margin ${c.marginV}`);
  run(["scripts/add_captions.js", rendered, "--words", words, "--out", captioned,
       "--font", c.font, "--size", String(c.size), "--outline", String(c.outline),
       "--margin", String(c.marginV), "--max-words", String(c.maxWords),
       "--max-chars", String(c.maxChars), "--max-secs", String(c.maxSecs),
       ...(c.upper ? [] : ["--no-upper"])], "add_captions");

  /* ---- 2. music --------------------------------------------------------- */
  const withMusic = captioned.replace(/\.mp4$/i, "") + ".music.mp4";
  console.log(`2/4  music     ${path.basename(NEWSDESK.music.track)} @ ${NEWSDESK.music.gain}`);
  if (!fs.existsSync(NEWSDESK.music.track)) throw new Error(`music bed missing: ${NEWSDESK.music.track}`);
  run(["scripts/add_music.js", captioned, "--track", NEWSDESK.music.track,
       "--gain", String(NEWSDESK.music.gain), "--out", withMusic], "add_music");

  const secs = probe(withMusic);
  const mb = fs.statSync(withMusic).size / 1048576;
  console.log(`     ${secs?.toFixed(1)}s  ${mb.toFixed(2)}MB`);
  if (secs && (secs < NEWSDESK.targetSecs.min || secs > NEWSDESK.targetSecs.max)) {
    console.log(`     NOTE: outside the ${NEWSDESK.targetSecs.min}-${NEWSDESK.targetSecs.max}s target for this format`);
  }
  if (has("dry")) { console.log(`\nDry run — finished at ${withMusic}, nothing uploaded or queued.\n`); return; }

  /* ---- 3. storage ------------------------------------------------------- */
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await db.from("publisher_queue")
    .select("id, status").eq("item_key", spec.slug).maybeSingle();
  if (existing) {
    console.log(`\nAlready queued: ${existing.id} (${existing.status}). Nothing inserted.`);
    console.log(`Delete that row first if you meant to replace it.\n`);
    return;
  }

  const P = NEWSDESK.publish;
  console.log(`3/4  upload    ${P.bucket}/${P.videoPrefix}${spec.slug}.mp4`);
  const up = await db.storage.from(P.bucket)
    .upload(`${P.videoPrefix}${spec.slug}.mp4`, fs.readFileSync(withMusic), { contentType: "video/mp4", upsert: true });
  if (up.error) throw new Error(`upload failed: ${up.error.message}`);
  const videoUrl = db.storage.from(P.bucket).getPublicUrl(`${P.videoPrefix}${spec.slug}.mp4`).data.publicUrl;

  let thumbUrl = null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nd-"));
  try {
    const jpg = path.join(tmp, "cover.jpg");
    execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(P.coverAtSec),
      "-i", withMusic, "-frames:v", "1", "-q:v", "3", jpg], { stdio: "ignore" });
    const t = await db.storage.from(P.bucket)
      .upload(`${P.coverPrefix}${spec.slug}.jpg`, fs.readFileSync(jpg), { contentType: "image/jpeg", upsert: true });
    if (!t.error) thumbUrl = db.storage.from(P.bucket).getPublicUrl(`${P.coverPrefix}${spec.slug}.jpg`).data.publicUrl;
  } catch (e) { console.log(`     cover skipped: ${e.message}`); }
  fs.rmSync(tmp, { recursive: true, force: true });

  /* ---- 4. the publisher row --------------------------------------------- */
  const { data: last } = await db.from("publisher_queue")
    .select("position").order("position", { ascending: false }).limit(1).maybeSingle();

  /*
   * video_url is written in the SAME insert, because the file is already in
   * storage. A row queued without one is 'unpublishable' and sits in the line
   * blocking the slot behind it.
   */
  const { data: row, error } = await db.from("publisher_queue").insert({
    item_key: spec.slug,
    title: spec.title,
    caption: spec.caption,
    video_type: P.videoType,
    video_url: videoUrl,
    thumbnail_url: thumbUrl,
    duration_secs: secs,
    position: (last?.position ?? 0) + 1,
    status: "queued",
  }).select("id, position").single();
  if (error) throw new Error(`insert failed: ${error.message}`);

  console.log(`4/4  queued    position ${row.position}  (${P.videoType})`);
  console.log(`\n${videoUrl}`);
  console.log(`${thumbUrl ?? "(no cover)"}\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
