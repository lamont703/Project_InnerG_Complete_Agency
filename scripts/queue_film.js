#!/usr/bin/env node
/**
 * Put a finished video file into the content publisher queue.
 *
 *   node scripts/queue_film.js --video=film.mp4 --key=the-guard \
 *        --title="..." --caption="..." --cover-at=27 --dry
 *
 * Drop --dry to actually upload and insert.
 *
 * WHY THIS EXISTS SEPARATELY FROM publish_news_short.js. That script owns a
 * News Desk end to end — it burns captions, lays the series music bed, and
 * reads a spec JSON, because a News Desk is assembled by this repo. A film cut
 * somewhere else arrives FINISHED, and running it through the News Desk
 * publisher would re-encode it and stamp the wrong music on it. This does the
 * last two steps only: upload it somewhere public, and add the row.
 *
 * THE BUCKET IS entity-photos, NOT social-assets. social-assets caps at 5MB and
 * a 44-second film is 26MB. The upload fails loudly there rather than silently,
 * but the failure looks like a permissions problem, so it is worth knowing
 * which bucket you want before you start.
 *
 * BOTH PLATFORMS FETCH THE URL THEMSELVES. YouTube and Instagram pull the file
 * from video_url, so it has to be a public URL — not a signed one, not a local
 * path. A queued row whose video_url is unreachable fails at the slot, hours
 * later, with nobody watching.
 *
 * video_type IS LEFT NULL ON PURPOSE for anything that is not one of the
 * registered formats. The column has no check constraint, so naming a format
 * that does not exist would be accepted and would then drive the copy builders
 * down the wrong branch. NULL means "derive", which combined with an explicit
 * caption is the honest answer for a one-off.
 *
 * POSITION IS max+1 — THE BACK OF THE QUEUE. It does not jump the line, and
 * nothing here publishes anything. The hourly cron takes position 1 at 9am,
 * 2pm and 7pm Eastern. Reorder on the board if you want it out sooner.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const FF = path.join(__dirname, "..", "node_modules", "ffmpeg-static", "ffmpeg");
const BUCKET = "entity-photos";
const VIDEO_PREFIX = "films/";
const COVER_PREFIX = "films/cover-";

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const has = (n) => process.argv.includes(`--${n}`);

const VIDEO = arg("video");
const KEY = arg("key");
const TITLE = arg("title");
const CAPTION = arg("caption", "");
const COVER_AT = Number(arg("cover-at", 2));
const VIDEO_TYPE = arg("video-type", "") || null;
const DRY = has("dry") || arg("dry", "0") !== "0";

function durationSecs(file) {
  const r = spawnSync(FF, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = (r.stderr || "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error(`could not read a duration from ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function main() {
  if (!VIDEO || !KEY || !TITLE) {
    throw new Error("--video, --key and --title are all required");
  }
  if (!fs.existsSync(VIDEO)) throw new Error(`no such file: ${VIDEO}`);
  /* YouTube truncates at 100 and the cron does the slicing silently, so a long
   * title is not an error there — it is a title that quietly loses its end. */
  if (TITLE.length > 100) throw new Error(`title is ${TITLE.length} chars; YouTube truncates at 100`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  const db = createClient(url, key);

  const secs = durationSecs(VIDEO);
  const bytes = fs.statSync(VIDEO).size;

  const { data: rows, error: readErr } = await db
    .from("publisher_queue")
    .select("position,item_key,title,status,video_url")
    .order("position", { ascending: true })
    .limit(400);
  if (readErr) throw new Error(`could not read the queue: ${readErr.message}`);

  const queued = rows.filter((r) => r.status === "queued");
  const publishable = queued.filter((r) => r.video_url);
  const maxPos = rows.length ? Math.max(...rows.map((r) => r.position)) : 0;
  const clash = rows.find((r) => r.item_key === KEY);

  console.log(`queue: ${rows.length} rows, ${queued.length} queued, ${publishable.length} with a video`);
  console.log("\nnext out:");
  for (const r of publishable.slice(0, 5)) {
    console.log(`  pos ${String(r.position).padStart(3)}  ${r.item_key.slice(0, 46)}`);
  }

  const position = maxPos + 1;
  const ahead = publishable.filter((r) => r.position < position).length;
  console.log(`\nthis film -> position ${position}, ${ahead} publishable item(s) ahead of it`);
  console.log(`at 3 slots a day that is roughly ${Math.ceil(ahead / 3)} day(s) before it goes out`);

  if (clash) {
    throw new Error(`item_key "${KEY}" already exists at position ${clash.position} (status ${clash.status}) — item_key is UNIQUE; pick another or reuse that row`);
  }

  const payload = {
    item_key: KEY,
    title: TITLE,
    caption: CAPTION || null,
    video_type: VIDEO_TYPE,
    duration_secs: Number(secs.toFixed(2)),
    position,
    status: "queued",
  };

  console.log(`\nfile: ${path.basename(VIDEO)}  ${(bytes / 1e6).toFixed(1)}MB  ${secs.toFixed(1)}s`);
  console.log(`bucket: ${BUCKET}/${VIDEO_PREFIX}${KEY}.mp4`);
  console.log("\npayload:");
  console.log(JSON.stringify(payload, null, 2));

  if (DRY) {
    console.log("\n--dry: nothing uploaded, nothing inserted.");
    return;
  }

  const videoPath = `${VIDEO_PREFIX}${KEY}.mp4`;
  const up = await db.storage.from(BUCKET).upload(videoPath, fs.readFileSync(VIDEO), {
    contentType: "video/mp4", upsert: true,
  });
  if (up.error) throw new Error(`video upload failed: ${up.error.message}`);
  const videoUrl = db.storage.from(BUCKET).getPublicUrl(videoPath).data.publicUrl;
  console.log(`\nuploaded video -> ${videoUrl}`);

  /* The cover is the Instagram Reel cover and is attempted as the YouTube
   * thumbnail. JPEG, sRGB, 9:16, under 8MB. */
  const coverFile = path.join(require("os").tmpdir(), `cover-${KEY}.jpg`);
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(COVER_AT), "-i", VIDEO, "-frames:v", "1", "-q:v", "3", coverFile], { stdio: "inherit" });
  const coverPath = `${COVER_PREFIX}${KEY}.jpg`;
  const cu = await db.storage.from(BUCKET).upload(coverPath, fs.readFileSync(coverFile), {
    contentType: "image/jpeg", upsert: true,
  });
  if (cu.error) throw new Error(`cover upload failed: ${cu.error.message}`);
  const thumbUrl = db.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
  console.log(`uploaded cover -> ${thumbUrl}`);

  const { data: row, error } = await db.from("publisher_queue")
    .insert({ ...payload, video_url: videoUrl, thumbnail_url: thumbUrl })
    .select("id, position")
    .single();
  if (error) throw new Error(`insert failed: ${error.message}`);

  console.log(`\nqueued  id ${row.id}  position ${row.position}`);
  console.log("Nothing has been published. The hourly cron takes position 1 at 9am / 2pm / 7pm ET.");
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
