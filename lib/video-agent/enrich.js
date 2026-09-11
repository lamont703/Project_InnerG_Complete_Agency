/*
 * READ THE SOURCE BEFORE WRITING ABOUT IT.
 *
 * The propose step used to run on Vercel, where the model had a filename and a
 * URL string and nothing else. Three times it filled that gap with prose that
 * fit any source: a News Desk of invented rates from a headline alone, a
 * reaction that never named one thing the clip said, and it would have done the
 * same to a figure. Each arrived priced, with a live approval code.
 *
 * Propose runs on the machine now, and this is the reason it had to move: the
 * machine has Whisper, ffmpeg and an ordinary network stack. What comes out of
 * here is the difference between reacting to a video and describing the idea of
 * reacting to a video.
 *
 * NOTHING HERE INVENTS A FALLBACK. If a clip will not transcribe or a page will
 * not fetch, that is reported as a failure and the caller refuses. A partial
 * read is the one outcome worse than no read, because it looks like a read.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const WHISPER = path.join(os.homedir(), ".venvs", "shearquery-whisper", "bin", "python");

/** URLs the sender is pointing us AT, not the ones trailing every signature. */
function articleUrls(body) {
  const found = String(body || "").match(/https?:\/\/[^\s<>")\]]+/g) || [];
  return [...new Set(found)]
    .map((u) => u.replace(/[.,;:]+$/, ""))
    .filter((u) => !/innergcomplete\.com|shearquery\.com|mail\.google|googleusercontent/i.test(u));
}

/**
 * Word-level transcript of a supplied clip. Returns the text AND the duration,
 * because a reaction spec needs in/out points and inventing those is the same
 * failure in a different coordinate system.
 */
function transcribeClip(file) {
  if (!fs.existsSync(WHISPER)) throw new Error(`no transcriber at ${WHISPER}`);
  execFileSync(WHISPER, [path.join("scripts", "transcribe_video.py"), file],
    { stdio: ["ignore", "pipe", "pipe"] });
  const out = file.replace(/\.[a-z0-9]+$/i, "") + ".words.json";
  if (!fs.existsSync(out)) throw new Error("transcriber wrote no output");
  const t = JSON.parse(fs.readFileSync(out, "utf8"));
  if (!t.segments?.length) throw new Error("transcript came back empty");
  return {
    duration: t.duration,
    /* Timestamped, because the model has to choose in/out points from it. */
    text: t.segments.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join("\n"),
  };
}

/** Readable text of a page, or an explicit failure. No summarising, no guessing. */
async function fetchArticle(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, " ")
    .trim();
  /*
   * A PAYWALL RETURNS 200 WITH A STUB. Length is the only signal available
   * without parsing every publisher's markup, and a page too short to be an
   * article must fail loudly rather than become the basis of a script.
   */
  if (text.length < 1200) throw new Error(`only ${text.length} chars of readable text — paywall or JS-rendered`);
  return text.slice(0, 12000);
}

module.exports = { articleUrls, transcribeClip, fetchArticle, WHISPER };
