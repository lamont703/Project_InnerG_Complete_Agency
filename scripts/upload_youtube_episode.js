#!/usr/bin/env node
/**
 * Uploads an episode to YouTube: video, thumbnail, and captions.
 *
 * UPLOADS UNLISTED BY DEFAULT, and that is a deliberate refusal to do the last
 * irreversible inch automatically. Publishing notifies every subscriber and
 * puts the video in front of the world; you cannot un-notify anyone. Flipping
 * unlisted -> public afterwards is one click and costs thirty seconds. The
 * asymmetry is not close, especially for a 23-minute video that nobody has yet
 * watched end to end and captions that are machine-generated.
 *
 * Pass --public to publish outright. That flag exists so the choice is made by
 * a person typing it, rather than by a default nobody examined.
 *
 * RESUMABLE UPLOAD, because the file is 138 MB. A simple POST of that over a
 * flaky connection fails at 90% with nothing to resume from and no way to know
 * how far it got.
 *
 * Usage:
 *   node scripts/upload_youtube_episode.js --dry-run
 *   node scripts/upload_youtube_episode.js
 *   node scripts/upload_youtube_episode.js --public
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Episodes Rendered");
const BASE = "Why_barbers_and_cosmetologists_fail_written_exams";

const VIDEO = path.join(DIR, `${BASE}.mp4`);
const THUMB = path.join(DIR, `${BASE}.thumbnail.16x9.png`);
const CAPTIONS = path.join(__dirname, "..", "reference", "Podcast Visuals", "Podcast Episodes", `${BASE}.srt`);

const TITLE = "How to Pass the Barber & Cosmetology Written Exam (What Schools Don't Teach You)";

const DESCRIPTION = `Barbers and cosmetologists pass the hands-on practical exam at roughly 92%. On the written exam, first-attempt pass rates in Texas sit near 57% — a gap of about 35 points between people who can clearly do the work and people who can prove it on a computer.

This episode is about why that gap exists, and what to ask a school before you pay them.

We cover the language gap between the Milady textbook and the PSI exam, why "overall pass rate" is a number schools use to hide behind, and the three questions every prospective student should ask an admissions office before signing anything.

⏱️ Chapters
0:00 The gap: 92% pass the practical, far fewer pass the written
1:26 The language trap — the exam doesn't sound like your textbook
3:19 Milady teaches it, PSI tests it: the interpreter problem
4:09 A real example: the sodium hydroxide double negative
6:05 What regional pass rates prove: it's the school, not the exam
7:35 The driving school analogy
9:45 Accreditation, federal aid, and schools fighting to survive
10:55 "Overall pass rate" is a trick — ask for first-attempt
13:49 The illusion of the 100% pass rate claim
15:35 Question 1: what is your first-attempt pass rate?
16:23 Question 2: how do you teach the exam's language?
18:39 Question 3: what do you teach about actually earning a living
22:07 If you keep failing, you already have the skill

🔗 Look up any Texas school's real first-attempt pass rate:
https://shearquery.com/texas-school-leaderboard

📋 Free state board practical exam kit checklist:
https://shearquery.com/texas-barber-state-board-practical-exam-kit-list

Pass-rate figures are computed from the 2026 TDLR exam roster. First-attempt, not the eventually-passed number schools usually quote.

#barber #cosmetology #stateboard #barberschool #cosmetologyschool`;

const TAGS = [
  "barber state board exam", "how to study for barber exam", "barber exam study guide",
  "how to pass the barber exam", "barber exam practice test", "cosmetology state board review",
  "texas barber state board written exam", "barber written exam", "cosmetology written exam",
  "how to pass barber state board exam", "barber school", "cosmetology school",
  "state board exam prep", "milady", "psi exam", "barber license", "cosmetology license",
];

// 27 = Education. The category matters for how YouTube classifies and
// recommends this; "People & Blogs" is the default that buries it.
const CATEGORY_ID = "27";

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("token refresh failed: " + JSON.stringify(j));
  return j.access_token;
}

async function uploadVideo(token, privacyStatus) {
  const size = fs.statSync(VIDEO).size;
  const metadata = {
    snippet: { title: TITLE, description: DESCRIPTION, tags: TAGS, categoryId: CATEGORY_ID },
    status: { privacyStatus, selfDeclaredMadeForKids: false },
  };

  // Step 1: start a resumable session. The response's Location is the URL the
  // bytes go to.
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
  if (!start.ok) throw new Error(`resumable start ${start.status}: ${(await start.text()).slice(0, 500)}`);
  const location = start.headers.get("location");
  if (!location) throw new Error("no upload URL returned");

  console.log(`  uploading ${(size / 1048576).toFixed(1)} MB…`);
  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Length": String(size), "Content-Type": "video/mp4" },
    body: fs.readFileSync(VIDEO),
  });
  const body = await put.text();
  if (!put.ok) throw new Error(`upload ${put.status}: ${body.slice(0, 500)}`);
  return JSON.parse(body);
}

async function setThumbnail(token, videoId) {
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" }, body: fs.readFileSync(THUMB) }
  );
  if (!res.ok) throw new Error(`thumbnail ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function uploadCaptions(token, videoId) {
  // captions.insert takes multipart/related: a JSON part then the file part.
  const boundary = "----shearquery" + Date.now();
  const meta = JSON.stringify({ snippet: { videoId, language: "en", name: "English", isDraft: false } });
  const srt = fs.readFileSync(CAPTIONS);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    srt,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch("https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`captions ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const privacyStatus = process.argv.includes("--public") ? "public" : "unlisted";

  for (const [label, f] of [["video", VIDEO], ["thumbnail", THUMB], ["captions", CAPTIONS]]) {
    if (!fs.existsSync(f)) throw new Error(`missing ${label}: ${f}`);
  }

  console.log(`title    : ${TITLE}`);
  console.log(`privacy  : ${privacyStatus}${privacyStatus === "unlisted" ? "  (pass --public to publish)" : ""}`);
  console.log(`category : Education`);
  console.log(`tags     : ${TAGS.length}`);
  console.log(`video    : ${(fs.statSync(VIDEO).size / 1048576).toFixed(1)} MB\n`);
  if (dry) { console.log("dry run — nothing uploaded."); return; }

  const token = await accessToken();
  const video = await uploadVideo(token, privacyStatus);
  console.log(`  video id: ${video.id}`);

  try { await setThumbnail(token, video.id); console.log("  thumbnail set"); }
  catch (e) { console.log(`  thumbnail FAILED — ${e.message}`); }

  try { await uploadCaptions(token, video.id); console.log("  captions uploaded"); }
  catch (e) { console.log(`  captions FAILED — ${e.message}`); }

  console.log(`\nhttps://www.youtube.com/watch?v=${video.id}`);
  console.log(`https://studio.youtube.com/video/${video.id}/edit`);
}

if (require.main === module) main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
