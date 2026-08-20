#!/usr/bin/env node
/**
 * Gives every queued video a still image, so the publisher page shows what a
 * post SAYS without anyone pressing play.
 *
 * IT TAKES A FRAME FROM NEAR THE END, NOT THE START. These cards animate: the
 * stat counts up, the headline rises, the accent bar draws, and the question
 * arrives last. A first frame is an almost-empty card — the exact opposite of
 * useful. The frame at ~85% of the runtime is the fully revealed card with the
 * figure, the source and the question all on screen, which is the whole point
 * of wanting a thumbnail here.
 *
 * IT ONLY FILLS GAPS. Rows that already have a thumbnail are skipped, so this
 * is safe to re-run and will not overwrite a cover image somebody chose
 * deliberately.
 *
 * Usage:
 *   node scripts/shorts/make_thumbnails.js --dry-run
 *   node scripts/shorts/make_thumbnails.js
 */
require("dotenv").config({ path: ".env.local", override: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const DRY = process.argv.includes("--dry-run");
const BUCKET = "entity-photos";
const PREFIX = "instagram";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function durationSeconds(file) {
  let out = "";
  try { execFileSync(ffmpeg, ["-i", file], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { out = e.stderr || ""; }
  const m = /Duration: (\d+):(\d+):(\d+\.?\d*)/.exec(out);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 9;
}

async function main() {
  const s = db();
  const { data: rows, error } = await s
    .from("publisher_queue")
    .select("id, item_key, video_url, thumbnail_url")
    .not("video_url", "is", null)
    .is("thumbnail_url", null);

  if (error) { console.error(error.message); process.exit(1); }
  if (!rows.length) { console.log("\n  Every queued item already has a thumbnail.\n"); return; }

  console.log(`\n  ${rows.length} item(s) without a thumbnail\n`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "thumbs-"));

  for (const r of rows) {
    process.stdout.write(`  ${r.item_key.padEnd(30)} `);
    if (DRY) { console.log("would generate"); continue; }

    try {
      const local = path.join(tmp, "v.mp4");
      const res = await fetch(r.video_url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));

      const at = (durationSeconds(local) * 0.85).toFixed(2);
      const png = path.join(tmp, "t.jpg");
      execFileSync(ffmpeg, ["-y", "-ss", at, "-i", local, "-frames:v", "1", "-q:v", "3", png], { stdio: ["ignore", "ignore", "pipe"] });

      const objectPath = `${PREFIX}/cover-${r.item_key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`;
      const up = await s.storage.from(BUCKET).upload(objectPath, fs.readFileSync(png), { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { data: pub } = s.storage.from(BUCKET).getPublicUrl(objectPath);

      const upd = await s.from("publisher_queue").update({ thumbnail_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq("id", r.id);
      if (upd.error) throw new Error(upd.error.message);
      console.log(`ok  (frame at ${at}s)`);
    } catch (e) {
      console.log(`FAILED — ${String(e.message).slice(0, 60)}`);
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("");
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
