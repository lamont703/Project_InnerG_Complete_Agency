#!/usr/bin/env node
/**
 * AI News Shorts — a headline, your commentary, and the avatar only where it earns its cost.
 *
 *   node scripts/render_news_short.js "reference/AI News Video Shorts/astra-script.json"
 *   node scripts/render_news_short.js <script.json> --dry
 *
 * WHY THIS IS NOT render_queued.js's AVATAR PATH. That renders one continuous
 * avatar take and edits it afterwards. Here the avatar is the expensive part and
 * is only worth paying for where seeing him matters — the open, the pivot, the
 * thesis, the close. The middle is his voice over the headline and b-roll. On
 * this script that is $1.57 rather than $4.10, and it is also the better edit:
 * a talking head held for 106 straight seconds is what kills a Short.
 *
 * ONE VOICE, ONE TAKE, NO SEAMS. The whole narration is generated ONCE by
 * HeyGen TTS, then sliced. Avatar segments are rendered by handing HeyGen the
 * slice as `audio_url` — the API states the contract itself:
 *
 *   "An audio source is required: provide (script + voice_id), audio_url, or
 *    audio_asset_id."
 *
 * So the avatar lip-syncs to the same recording the voice-only parts use. The
 * usual failure of stitched narration — a join where tone or loudness shifts —
 * cannot happen, because there is only ever one audio file.
 *
 * THE TIMINGS COME FREE. That TTS call returns word_timestamps, so segment
 * boundaries are read off the audio rather than estimated, and no Whisper pass
 * is needed here at all.
 *
 * ITS OWN AVATAR, DELIBERATELY. HEYGEN_NEWS_AVATAR_ID, never HEYGEN_AVATAR_ID,
 * so this format cannot disturb the pipeline that is already working.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const { searchVideos, pickBest, download } = require("../lib/pixabay.js");

const FF = require("ffmpeg-static");
const HEYGEN = "https://api.heygen.com";
const W = 1080, H = 1920, FPS = 25;
const AVATAR_PER_SEC = 0.0386;

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);

async function heygen(pathname, init = {}) {
  const res = await fetch(`${HEYGEN}${pathname}`, {
    ...init,
    headers: { "x-api-key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Where each segment starts and ends in the single narration.
 *
 * The TTS spoke the segments joined in order, so the word list is the segments
 * concatenated — matching is a walk, not a search. It is still done by
 * NORMALISED token rather than by index, because the engine splits contractions
 * and punctuation its own way and an index walk drifts silently: the audio
 * stays correct while every boundary moves, which shows up as segments cutting
 * mid-sentence rather than as an error.
 */
function segmentTimes(words, segments) {
  const toks = words.filter((w) => w.word && !/^<.*>$/.test(w.word));
  let i = 0;
  return segments.map((seg) => {
    const want = seg.text.split(/\s+/).map(norm).filter(Boolean);
    const start = toks[i]?.start ?? 0;
    let matched = 0;
    while (i < toks.length && matched < want.length) {
      if (norm(toks[i].word) === want[matched]) matched++;
      i++;
    }
    const end = toks[Math.max(0, i - 1)]?.end ?? start;
    if (matched < want.length * 0.6) {
      throw new Error(`could not line the narration up with segment "${seg.text.slice(0, 40)}…"`);
    }
    return { start, end };
  });
}

/** A still, filling 9:16, with a slow push so it is never a frozen frame. */
function stillClip(image, seconds, out, zoomFrom = 1.0, zoomTo = 1.08) {
  const frames = Math.round(seconds * FPS);
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", image,
    "-t", String(seconds), "-r", String(FPS),
    "-vf", `scale=${W * 2}:-2,zoompan=z='${zoomFrom}+(${zoomTo}-${zoomFrom})*on/${frames}':d=1:` +
           `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},setsar=1`,
    "-pix_fmt", "yuv420p", "-an", out], { stdio: ["ignore", "ignore", "pipe"] });
}

(async () => {
  for (const k of ["HEYGEN_API_KEY", "HEYGEN_NEWS_AVATAR_ID", "HEYGEN_VOICE_ID"]) {
    if (!process.env[k]) { console.error(`${k} is not set.`); process.exit(1); }
  }
  const specFile = process.argv[2];
  if (!specFile || !fs.existsSync(specFile)) { console.error("Usage: render_news_short.js <script.json>"); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const work = arg("work", path.join(".cache", "news", spec.slug));
  fs.mkdirSync(work, { recursive: true });
  const out = arg("out", path.join(work, `${spec.slug}.mp4`));

  const avatarSecsEst = spec.segments.filter((s) => s.mode === "avatar")
    .reduce((t, s) => t + s.text.split(/\s+/).length / 165 * 60, 0);
  console.log(`\n${spec.slug}`);
  console.log(`  ${spec.segments.length} segments, ~${avatarSecsEst.toFixed(0)}s of avatar ≈ $${(avatarSecsEst * AVATAR_PER_SEC).toFixed(2)}\n`);

  /* ---- 1. one narration, one voice ------------------------------------- */
  const narrationFile = path.join(work, "narration.wav");
  const timingFile = path.join(work, "narration.words.json");
  let words;
  if (fs.existsSync(narrationFile) && fs.existsSync(timingFile)) {
    words = JSON.parse(fs.readFileSync(timingFile, "utf8"));
    console.log("1/5  narration — reusing the one already generated");
  } else {
    console.log("1/5  generating the narration (one pass, one voice)");
    const full = spec.segments.map((s) => s.text).join(" ");
    const tts = await heygen("/v3/voices/speech", {
      method: "POST",
      body: JSON.stringify({ voice_id: process.env.HEYGEN_VOICE_ID, text: full }),
    });
    const url = tts?.data?.audio_url;
    if (!url) throw new Error("TTS returned no audio_url");
    fs.writeFileSync(narrationFile, Buffer.from(await (await fetch(url)).arrayBuffer()));
    words = tts.data.word_timestamps || [];
    fs.writeFileSync(timingFile, JSON.stringify(words, null, 2));
    console.log(`     ${tts.data.duration?.toFixed(1)}s, ${words.length} word timings`);
  }

  const times = segmentTimes(words, spec.segments);
  times.forEach((t, i) => console.log(
    `     ${String(i).padStart(2)} ${spec.segments[i].mode.padEnd(6)} ${t.start.toFixed(1)}–${t.end.toFixed(1)}s  ${spec.segments[i].text.slice(0, 44)}…`));
  if (has("dry")) { console.log("\nDry run — narration and timings only, no video bought.\n"); return; }

  /* ---- 2. slice the narration ------------------------------------------ */
  console.log("\n2/5  slicing");
  const slices = times.map((t, i) => {
    const p = path.join(work, `seg-${i}.wav`);
    if (!fs.existsSync(p)) {
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", narrationFile,
        "-ss", String(t.start), "-to", String(t.end + 0.12), "-c", "copy", p], { stdio: "ignore" });
    }
    return p;
  });

  /* ---- 3. avatar segments, lip-synced to those slices ------------------- */
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pieces = [];
  let spent = 0;

  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i];
    const dur = (times[i].end + 0.12) - times[i].start;
    const piece = path.join(work, `piece-${i}.mp4`);
    if (fs.existsSync(piece)) { pieces.push(piece); console.log(`  ${i} cached`); continue; }

    if (seg.mode === "avatar") {
      /*
       * The slice has to be reachable by HeyGen, so it goes to a public bucket
       * first. Keyed by slug and index: a re-run reuses the same object rather
       * than accumulating one per attempt.
       *
       * NOT social-assets, WHICH REFUSES IT. That bucket allows only
       * image/*, video/mp4 and video/quicktime and caps at 5MB — an audio
       * upload comes back "mime type audio/wav is not supported". entity-photos
       * has no MIME or size restriction and this pipeline already writes short
       * covers there, so it is the one that will actually take it.
       *
       * MP3 RATHER THAN WAV, because the file is fetched over the network by a
       * third party: a 90-second wav is ~16MB of nothing, and mp3 is the format
       * every speech API accepts without question.
       */
      const mp3 = slices[i].replace(/\.wav$/, ".mp3");
      if (!fs.existsSync(mp3)) {
        execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", slices[i],
          "-c:a", "libmp3lame", "-b:a", "192k", mp3], { stdio: "ignore" });
      }
      const key = `news-audio/${spec.slug}-${i}.mp3`;
      const up = await db.storage.from("entity-photos")
        .upload(key, fs.readFileSync(mp3), { contentType: "audio/mpeg", upsert: true });
      if (up.error) throw new Error(`audio upload failed: ${up.error.message}`);
      const audioUrl = db.storage.from("entity-photos").getPublicUrl(key).data.publicUrl;

      console.log(`  ${i} avatar ${dur.toFixed(1)}s ≈ $${(dur * AVATAR_PER_SEC).toFixed(2)}`);
      const created = await heygen("/v3/videos", {
        method: "POST",
        body: JSON.stringify({
          type: "avatar",
          avatar_id: process.env.HEYGEN_NEWS_AVATAR_ID,
          audio_url: audioUrl,
          title: `${spec.slug}-${i}`.slice(0, 100),
          aspect_ratio: "9:16",
          resolution: "1080p",
        }),
      });
      const id = created?.data?.video_id;
      if (!id) throw new Error("no video_id returned");
      process.stdout.write("    ");
      const began = Date.now();
      let done;
      for (;;) {
        await new Promise((r) => setTimeout(r, 10000));
        const d = (await heygen(`/v3/videos/${id}`)).data ?? {};
        if (d.status === "completed") { done = d; console.log(` ${Math.round((Date.now() - began) / 1000)}s`); break; }
        if (d.status === "failed") throw new Error(`avatar render failed: ${d.failure_message || d.failure_code}`);
        if (Date.now() - began > 20 * 60 * 1000) throw new Error(`stuck at ${d.status}`);
        process.stdout.write(".");
      }
      spent += dur * AVATAR_PER_SEC;

      const raw = path.join(work, `avatar-${i}.mp4`);
      fs.writeFileSync(raw, Buffer.from(await (await fetch(done.video_url)).arrayBuffer()));

      /*
       * HEADLINE BEHIND, HIM IN FRONT. The article is the hook and has to stay
       * legible while he talks, so the avatar sits in the lower portion at 68%
       * width rather than filling the frame. A thin light edge separates him
       * from a page that is mostly white, which otherwise blends.
       */
      const bg = path.join(work, `bg-${i}.mp4`);
      stillClip(spec.headline, dur, bg, 1.0, 1.04);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", bg, "-i", raw, "-i", slices[i],
        "-filter_complex",
        `[1:v]scale=${Math.round(W * 0.68)}:-2,setsar=1,pad=iw+8:ih+8:4:4:color=0x111827[av];` +
        `[0:v][av]overlay=(W-w)/2:H-h-120:shortest=1[v]`,
        "-map", "[v]", "-map", "2:a", "-r", String(FPS), "-t", String(dur),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", piece], { stdio: ["ignore", "ignore", "pipe"] });
    } else if (seg.visual === "broll" && seg.query) {
      console.log(`  ${i} voice  ${dur.toFixed(1)}s  b-roll "${seg.query}"`);
      const hits = await searchVideos(seg.query, { perPage: 20 });
      const pick = pickBest(hits, { seconds: Math.min(dur, 6), query: seg.query });
      if (!pick) throw new Error(`no b-roll for "${seg.query}" — pick another query rather than shipping the wrong picture`);
      const got = await download(pick, path.join(".cache", "broll"));
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
        "-stream_loop", "-1", "-i", got.path, "-i", slices[i],
        "-filter_complex", `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v]`,
        "-map", "[v]", "-map", "1:a", "-t", String(dur),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", piece], { stdio: ["ignore", "ignore", "pipe"] });
    } else {
      console.log(`  ${i} voice  ${dur.toFixed(1)}s  headline`);
      const bg = path.join(work, `bg-${i}.mp4`);
      stillClip(spec.headline, dur, bg, 1.0, 1.12);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", bg, "-i", slices[i],
        "-map", "0:v", "-map", "1:a", "-t", String(dur),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", piece], { stdio: ["ignore", "ignore", "pipe"] });
    }
    pieces.push(piece);
  }

  /* ---- 4. one timeline -------------------------------------------------- */
  console.log("\n4/5  assembling");
  const list = path.join(work, "pieces.txt");
  fs.writeFileSync(list, pieces.map((p) => `file '${path.resolve(p)}'`).join("\n"));
  const assembled = path.join(work, "assembled.mp4");
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", assembled], { stdio: ["ignore", "ignore", "pipe"] });

  fs.copyFileSync(assembled, out);
  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
  console.log(`\n5/5  done  ${out}  ${mb(out)}MB`);
  console.log(`     spent ~$${spent.toFixed(2)} on avatar\n`);
  console.log(`Next: captions and music, using the tools the avatar pipeline already has:`);
  console.log(`  node scripts/add_captions.js ${out} --words <words.json>`);
  console.log(`  node scripts/add_music.js <captioned.mp4> --track "..."\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
