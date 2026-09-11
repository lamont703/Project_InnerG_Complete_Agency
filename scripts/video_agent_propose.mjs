/**
 * Write the proposal, on the machine that can read the source.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *        scripts/video_agent_propose.mjs [--once] [--dry]
 *
 * THIS IS A SEPARATE ENTRY POINT FROM video_agent_worker.js ON PURPOSE, and the
 * split is the safety property rather than an accident of packaging: this
 * process reads and writes and sends mail, and it NEVER spends. The worker
 * spends and never interprets. Losing that boundary means one bug can both
 * invent a job and pay for it.
 *
 * WHY IT IS NOT IN THE CRON ROUTE ANY MORE. Proposing means reading the source —
 * transcribing a supplied clip, fetching a linked article. Vercel has neither
 * Whisper nor ffmpeg, so the model there had a filename and a URL string, and
 * three separate times it filled the gap with prose that fit any source. The
 * route still does intake and consent; both need nothing but the API.
 */
import dotenv from "dotenv";
/*
 * .env.local, EXPLICITLY. "dotenv/config" loads .env, which in this repo is a
 * different and staler file — the script connected somewhere else and reported
 * "nothing to propose" against a row that was plainly sitting there. Every
 * other script here names the path; this one has to as well.
 */
dotenv.config({ path: ".env.local" });
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { proposeForRow } from "@/lib/video-agent/stages";
import enrich from "@/lib/video-agent/enrich.js";

const { articleUrls, transcribeClip, fetchArticle } = enrich;
const has = (n) => process.argv.includes(`--${n}`);
const WORK = path.join(".cache", "propose");

const db = () => {
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[k]) throw new Error(`${k} is not set`);
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
};

/** Pull an attachment to disk so Whisper has a file to open. */
async function download(att, jobId) {
  fs.mkdirSync(path.join(WORK, jobId), { recursive: true });
  const safe = String(att.filename || "clip.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
  const local = path.join(WORK, jobId, safe);
  if (fs.existsSync(local) && fs.statSync(local).size > 0) return local;
  if (!att.url) throw new Error(`${safe} has no direct URL (Drive links are resolved at render time, not here)`);
  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`fetching ${safe}: HTTP ${res.status}`);
  fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
  return local;
}

/*
 * READ FAILURES ARE REPORTED, NEVER SWALLOWED. A null transcript reaching
 * proposeForRow means the read was attempted and failed, and the prompt refuses
 * on that. Silently passing null for "we did not bother" would make the two
 * indistinguishable and hand the model an excuse to improvise.
 */
async function readSources(row) {
  const atts = row.attachments ?? [];
  const notes = [];
  let clipTranscript = null;
  let article = null;

  const video = atts.find((a) => /^video\//i.test(a.mimeType || ""));
  if (video) {
    try {
      const file = await download(video, row.id);
      const t = transcribeClip(file);
      clipTranscript = { filename: video.filename, duration: t.duration, text: t.text };
      notes.push(`transcribed ${video.filename} (${t.duration.toFixed(1)}s)`);
    } catch (err) {
      notes.push(`TRANSCRIBE FAILED: ${err.message}`);
    }
  }

  for (const url of articleUrls(row.body_text)) {
    try {
      const text = await fetchArticle(url);
      article = { url, text };
      notes.push(`fetched ${url} (${text.length} chars)`);
      break;   // one article per video; the first readable one wins
    } catch (err) {
      notes.push(`FETCH FAILED ${url}: ${err.message}`);
    }
  }
  return { clipTranscript, article, notes };
}

const client = db();
const { data: pending } = await client
  .from("video_requests").select("*").eq("status", "received")
  .order("received_at", { ascending: true }).limit(1);

if (!pending?.length) {
  console.log("nothing to propose");
  process.exit(0);
}

const row = pending[0];
console.log(`proposing "${row.subject}"  (${row.id.slice(0, 8)})`);

const { clipTranscript, article, notes } = await readSources(row);
for (const n of notes) console.log(`  ${n}`);

if (has("dry")) {
  console.log(`\nDRY — transcript ${clipTranscript ? "YES" : "no"}, article ${article ? "YES" : "no"}. Nothing sent.`);
  process.exit(0);
}

const verdict = await proposeForRow(client, row, { clipTranscript, article });
console.log(`  ${verdict.ok ? "PROPOSED" : "refused"}: ${verdict.note}`);
