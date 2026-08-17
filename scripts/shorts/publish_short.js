#!/usr/bin/env node
/**
 * Uploads a rendered Short to YouTube with its SEO payload.
 *
 * UPLOADS UNLISTED BY DEFAULT, and `--public` has to be typed. This mirrors
 * upload_youtube_episode.js exactly, for the reason recorded there: publishing
 * notifies every subscriber and puts the video in front of the world, and you
 * cannot un-notify anyone. Flipping unlisted -> public afterwards is one click.
 * The asymmetry is not close.
 *
 * IT IS SEPARATE FROM make_short.js ON PURPOSE. Rendering is cheap and
 * reversible; publishing is neither. Keeping the irreversible step in its own
 * script means an automation can be given the renderer and NOT the publisher,
 * which is what makes a scheduled pipeline safe to leave running.
 *
 * PREFLIGHT REFUSES BEFORE IT SPENDS. YouTube's limits are checked here rather
 * than discovered in a 400: title 100 chars, description 5000, tags 500 chars
 * total. A rejected upload still costs quota.
 *
 * QUOTA IS THE REAL CEILING ON CADENCE. videos.insert has its own bucket with a
 * documented default of 100 calls per day — not units, calls — so twice a day
 * is far inside it. What is NOT inside it is a retry loop: a failed upload that
 * retries blindly can burn the day's allowance on one video.
 *
 * Usage:
 *   node scripts/shorts/publish_short.js --key barber-never-pass --dry-run
 *   node scripts/shorts/publish_short.js --key barber-never-pass
 *   node scripts/shorts/publish_short.js --key barber-never-pass --public
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const PUBLISHED = path.join(OUT_DIR, "_published.json");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DRY = process.argv.includes("--dry-run");
const PUBLIC = process.argv.includes("--public");

/** Documented YouTube ceilings. Exceeding one is an error, not an opinion. */
const LIMIT = { title: 100, description: 5000, tagsChars: 500 };

/** A tag containing a space counts with surrounding quotes — YouTube's rule. */
const tagsCharCount = (tags) =>
  tags.reduce((n, t) => n + (t.includes(" ") ? t.length + 2 : t.length), 0) + Math.max(0, tags.length - 1);

async function accessToken() {
  const e = process.env;
  const body = new URLSearchParams({
    client_id: e.YOUTUBE_CLIENT_ID,
    client_secret: e.YOUTUBE_CLIENT_SECRET,
    refresh_token: e.YOUTUBE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token refresh failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j.access_token;
}

async function main() {
  const key = arg("key", null);
  if (!key) { console.error("Usage: publish_short.js --key <card-key> [--public] [--dry-run]"); process.exit(1); }

  const metaPath = path.join(OUT_DIR, `${key}.seo.json`);
  if (!fs.existsSync(metaPath)) {
    console.error(`No SEO payload for "${key}". Render it first:\n  node scripts/shorts/make_short.js --key ${key}`);
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const video = path.join(ROOT, meta.video);
  if (!fs.existsSync(video)) { console.error(`Video missing: ${meta.video}`); process.exit(1); }

  const { seo } = meta;
  const size = fs.statSync(video).size;

  // ---- Preflight -----------------------------------------------------------
  const problems = [];
  if (seo.title.length > LIMIT.title) problems.push(`title ${seo.title.length} > ${LIMIT.title}`);
  if (Buffer.byteLength(seo.description, "utf8") > LIMIT.description) problems.push(`description over ${LIMIT.description} bytes`);
  const tc = tagsCharCount(seo.tags);
  if (tc > LIMIT.tagsChars) problems.push(`tags ${tc} chars > ${LIMIT.tagsChars}`);
  /**
   * A Short is decided by aspect ratio and duration, not by the hashtag — but a
   * file that is not vertical will simply be published as a normal video, which
   * is a silent failure of the entire format decision.
   */
  if (!/\.mp4$/i.test(video)) problems.push("not an mp4");

  const already = (() => { try { return JSON.parse(fs.readFileSync(PUBLISHED, "utf8")); } catch { return {}; } })();
  if (already[key]) problems.push(`already published as ${already[key].videoId} on ${already[key].at.slice(0, 10)}`);

  console.log(`\n  key          ${key}`);
  console.log(`  video        ${meta.video}  (${(size / 1048576).toFixed(1)} MB)`);
  console.log(`  title        ${seo.title}  (${seo.title.length}/${LIMIT.title})`);
  console.log(`  tags         ${seo.tags.length} tags, ${tc}/${LIMIT.tagsChars} chars`);
  console.log(`  privacy      ${PUBLIC ? "PUBLIC" : "unlisted"}`);
  if (problems.length) {
    console.error(`\n  REFUSING:\n${problems.map((p) => `    - ${p}`).join("\n")}\n`);
    process.exit(1);
  }
  if (DRY) { console.log(`\n  Dry run. Nothing uploaded.\n`); return; }

  // ---- Upload --------------------------------------------------------------
  const token = await accessToken();
  const metadata = {
    snippet: {
      title: seo.title,
      description: seo.description,
      tags: seo.tags,
      categoryId: seo.categoryId,
      defaultLanguage: seo.defaultLanguage,
    },
    status: {
      privacyStatus: PUBLIC ? "public" : "unlisted",
      selfDeclaredMadeForKids: false,
    },
  };

  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!start.ok) throw new Error(`resumable start ${start.status}: ${(await start.text()).slice(0, 400)}`);
  const location = start.headers.get("location");
  if (!location) throw new Error("no upload URL returned");

  console.log(`\n  uploading…`);
  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Length": String(size), "Content-Type": "video/mp4" },
    body: fs.readFileSync(video),
  });
  const text = await put.text();
  if (!put.ok) throw new Error(`upload ${put.status}: ${text.slice(0, 400)}`);
  const result = JSON.parse(text);

  already[key] = { videoId: result.id, at: new Date().toISOString(), privacy: metadata.status.privacyStatus };
  fs.writeFileSync(PUBLISHED, JSON.stringify(already, null, 2) + "\n");

  console.log(`  done         https://youtube.com/shorts/${result.id}`);
  console.log(`  privacy      ${metadata.status.privacyStatus}${PUBLIC ? "" : "  — flip to public in Studio when you are happy with it"}\n`);
}

if (require.main === module) main().catch((e) => { console.error(`\n  ${e.message}\n`); process.exit(1); });
