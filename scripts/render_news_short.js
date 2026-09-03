#!/usr/bin/env node
/**
 * NEWS DESK — a headline, your commentary, and the avatar only where it earns
 * its cost. `newsdesk` in lib/video-type.js; ~90s; ~$1.31.
 *
 * NOT A HOT TAKE, which is the format this is most easily confused with and the
 * reason both were renamed off their machinery. A Hot Take is one continuous
 * 30-second avatar take on an evergreen topic, written from a queue card by
 * render_queued.js. A News Desk is a reaction to a story that actually broke,
 * ninety seconds long, from a script written by hand. Both buy HeyGen avatar
 * seconds, which is why "the avatar video" never identified either of them.
 *
 *   node scripts/render_news_short.js "reference/AI News Video Shorts/astra-script.json"
 *   node scripts/render_news_short.js <script.json> --dry
 *
 * WHY THIS IS NOT render_queued.js's HOT TAKE PATH. That renders one continuous
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
 * so this format cannot disturb the pipeline that is already working. They are
 * different talking photos — a black hoodie here, a grey one on the Hot Take —
 * so the two formats are told apart on sight as well as by name.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const { findClips, markUsed } = require("../lib/broll-library.js");
const { PROFILES, withinBudget } = require("../lib/newsdesk-config.js");

const FF = require("ffmpeg-static");
const HEYGEN = "https://api.heygen.com";
/*
 * WHICH PROFILE THIS RUN IS. `newsdesk` reacts to a headline and sits the avatar
 * over the article; `hottake` is an opinion piece with no article, so the face
 * fills the frame. Same production method, different content and framing —
 * see lib/newsdesk-config.js.
 */
const PROFILE_ID = (process.argv.find((a) => a.startsWith("--profile=")) || "").split("=")[1]
  || (process.argv.includes("--profile") ? process.argv[process.argv.indexOf("--profile") + 1] : null)
  || "newsdesk";
const NEWSDESK = PROFILES[PROFILE_ID];
if (!NEWSDESK) { console.error(`Unknown --profile "${PROFILE_ID}". One of: ${Object.keys(PROFILES).join(", ")}`); process.exit(1); }

const W = NEWSDESK.video.width, H = NEWSDESK.video.height, FPS = NEWSDESK.video.fps;
const AVATAR_PER_SEC = NEWSDESK.avatar.perSec;

/**
 * THE LONGEST ANY ONE PICTURE MAY STAY ON SCREEN.
 *
 * THE BUG THIS IS THE FIX FOR. The renderer used to give each SEGMENT exactly
 * one visual, so a segment's length was a picture's length. On the first News
 * Desk that meant a 22.8-second block on one static article screenshot with a
 * slow zoom, which reads as a frozen frame and is where a viewer leaves.
 *
 * The segment is a unit of NARRATION — it ends where a thought ends — and has
 * no reason to be a unit of PICTURE. So a long segment is now cut into as many
 * shots as it needs, each with its own visual, and the audio runs across the
 * cuts untouched.
 *
 * SIX SECONDS, not a rounder number, because the b-roll clips are five seconds
 * and a cap below the clip length would force every one of them to be trimmed.
 */
const VISUAL_MAX_SECS = NEWSDESK.visuals.maxSecs;

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

/**
 * A CACHED FILE IS ONLY USABLE IF IT DECODES. `fs.existsSync` is not a cache
 * check, it is a filename check, and the difference has cost real money twice:
 *
 *   - a machine shutdown killed ffmpeg mid-write, leaving a background clip with
 *     no moov atom that the next run happily reused;
 *   - a 10-minute timeout killed the closing composite the same way, and the
 *     re-run "cached" a 2.3MB file with a duration of zero, producing a video
 *     that was 13 seconds short and looked finished.
 *
 * Neither failed loudly. Both produced a file of plausible size that no longer
 * decodes, which is the worst shape a cache entry can take.
 */
function usable(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) return false;
  try {
    execFileSync(FF, ["-v", "error", "-i", file, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
  } catch { return false; }
  const err = spawnSync(FF, ["-hide_banner", "-i", file], { encoding: "utf8" }).stderr || "";
  const m = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return !!m && (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) > 0.05;
}

/**
 * TWO VIEWS OF ONE SCREENSHOT, which is how the article stops repeating itself.
 *
 * The phone screenshot holds two different things worth showing: the HEADLINE,
 * and the CHART at the bottom — two scatter plots where the AI-driven one is
 * visibly tighter than the benchmark. That chart IS the finding, drawn, so
 * showing it is not decoration.
 *
 * WHY THE CHART IS NOT SIMPLY CROPPED TO 9:16 LIKE THE HEADLINE. It is a wide
 * side-by-side figure. Cropping it to a vertical frame tightly enough to fill
 * the screen cuts off one of the two plots, which destroys the only thing it is
 * there to show — the COMPARISON. So it is letterboxed on a dark card at full
 * width instead, and reads as a deliberate cutaway rather than a bad crop.
 */
function headlineClip(image, seconds, out, zoomFrom = 1.0, zoomTo = 1.06) {
  const frames = Math.max(1, Math.round(seconds * FPS));
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", image,
    "-t", String(seconds), "-r", String(FPS),
    "-vf", `scale=${W * 2}:-2,zoompan=z='${zoomFrom}+(${zoomTo}-${zoomFrom})*on/${frames}':d=1:` +
           `x='iw/2-(iw/zoom/2)':y='0':s=${W}x${H}:fps=${FPS},setsar=1`,
    "-pix_fmt", "yuv420p", "-an", out], { stdio: ["ignore", "ignore", "pipe"] });
}

/**
 * The chart, on a dark card, growing slowly.
 *
 * TWO CROPS, AND THAT IS THE POINT. Splitting a segment into shots buys nothing
 * if every shot shows the SAME picture — the cut is invisible and the hold is
 * unchanged, which is exactly what happened on the first cut of this video: an
 * 11.4-second "two shot" chart segment that scene detection read as one frame.
 * So the wide comparison plays first, then the frame pushes into the AI-driven
 * plot alone, which is both a real cut and the better edit: show the contrast,
 * then show the thing that got smaller.
 */
const CHART_WIDE = NEWSDESK.visuals.chartWide;    // both plots, the comparison
const CHART_TIGHT = NEWSDESK.visuals.chartTight;  // the AI-driven plot alone
function chartClip(image, seconds, out, crop = CHART_WIDE) {
  const frames = Math.max(1, Math.round(seconds * FPS));
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-i", image,
    "-t", String(seconds), "-r", String(FPS),
    // Card height follows the crop's own aspect, so a tighter crop fills more of
    // the frame instead of being letterboxed to the wide crop's shape.
    "-vf", `crop=${crop},scale=${W * 2}:-2,zoompan=z='1.0+${NEWSDESK.visuals.chartZoom}*on/${frames}':d=1:` +
           `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
           `s=${W}x${Math.round(W * Number(crop.split(":")[1]) / Number(crop.split(":")[0]))}:fps=${FPS},` +
           `pad=${W}:${H}:0:(${H}-ih)/2:color=${NEWSDESK.visuals.chartBg},setsar=1`,
    "-pix_fmt", "yuv420p", "-an", out], { stdio: ["ignore", "ignore", "pipe"] });
}

/** A library clip, cropped to fill 9:16, silent, cut to length. */
function brollClip(src, seconds, out) {
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-stream_loop", "-1", "-i", src,
    "-t", String(seconds), "-r", String(FPS),
    "-vf", `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`,
    "-pix_fmt", "yuv420p", "-an", out], { stdio: ["ignore", "ignore", "pipe"] });
}

/**
 * Cut a segment's runtime into shots no longer than VISUAL_MAX_SECS.
 *
 * EVEN LENGTHS, not "fill six then leave a remainder". A 13-second segment
 * split greedily is 6 + 6 + 1, and that one-second flash reads as a mistake.
 * Three shots of 4.3s is the same three pictures without the stutter.
 */
function shotLengths(seconds) {
  const n = Math.max(1, Math.ceil(seconds / VISUAL_MAX_SECS));
  return Array.from({ length: n }, () => seconds / n);
}

(async () => {
  for (const k of ["HEYGEN_API_KEY", NEWSDESK.avatar.avatarEnv, NEWSDESK.avatar.voiceEnv]) {
    if (!process.env[k]) { console.error(`${k} is not set.`); process.exit(1); }
  }
  const specFile = process.argv[2];
  if (!specFile || !fs.existsSync(specFile)) { console.error("Usage: render_news_short.js <script.json>"); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  /*
   * A Hot Take has no article screenshot, so `headline` is optional — but a spec
   * that ASKS for a headline or chart shot without one would fail deep inside
   * the render loop, after the avatar was already bought. Check it up front.
   */
  const needsImage = spec.segments.some((sg) => sg.mode !== "avatar" && ["headline", "chart"].includes(sg.visual))
    || !PROFILES[PROFILE_ID].avatar.fullScreen;
  if (needsImage && (!spec.headline || !fs.existsSync(spec.headline))) {
    console.error(`this spec needs a headline image and ${spec.headline ? `"${spec.headline}" is not there` : "none is set"}.`);
    process.exit(1);
  }
  const work = arg("work", path.join(".cache", "news", spec.slug));
  fs.mkdirSync(work, { recursive: true });
  const out = arg("out", path.join(work, `${spec.slug}.mp4`));

  /*
   * THE BUDGET GATE, CHECKED BEFORE ANY CREDIT IS SPENT. The ceiling is a
   * number in lib/newsdesk-config.js, not a habit — a script that can quietly
   * cost more than agreed is one that eventually will. --over-budget is the
   * deliberate override, and it has to be typed.
   */
  const budget = withinBudget(spec);
  console.log(`\n${spec.slug}`);
  console.log(`  ${spec.segments.length} segments, ~${budget.seconds.toFixed(0)}s of avatar ≈ $${budget.usd.toFixed(2)}  (cap $${budget.budget})\n`);
  if (!budget.ok && !has("over-budget")) {
    console.error(`This script estimates $${budget.usd.toFixed(2)}, over the $${budget.budget} News Desk cap.`);
    console.error(`Cut avatar segments, or re-run with --over-budget if you mean it.\n`);
    process.exit(1);
  }

  /* ---- 1. one narration, one voice ------------------------------------- */
  const narrationFile = path.join(work, "narration.wav");
  const timingFile = path.join(work, "narration.words.json");
  let words;
  if (fs.existsSync(narrationFile) && fs.existsSync(timingFile)) {
    words = JSON.parse(fs.readFileSync(timingFile, "utf8"));
    console.log("1/5  narration — reusing the one already generated");
  } else {
    console.log("1/5  generating the narration (one pass, one voice)");
    /*
     * ONLY OUR WORDS GO TO TTS. A reaction video interleaves segments we
     * SPEAK with segments that are somebody else's clip playing with its own
     * audio. Sending the clip text too would generate narration nobody uses,
     * push every later timestamp out, and silently misalign the whole edit.
     */
    const full = spec.segments.filter((sg) => sg.mode !== "clip").map((s) => s.text).join(" ");
    const tts = await heygen("/v3/voices/speech", {
      method: "POST",
      body: JSON.stringify({ voice_id: process.env[NEWSDESK.avatar.voiceEnv], text: full }),
    });
    const url = tts?.data?.audio_url;
    if (!url) throw new Error("TTS returned no audio_url");
    fs.writeFileSync(narrationFile, Buffer.from(await (await fetch(url)).arrayBuffer()));
    words = tts.data.word_timestamps || [];
    fs.writeFileSync(timingFile, JSON.stringify(words, null, 2));
    console.log(`     ${tts.data.duration?.toFixed(1)}s, ${words.length} word timings`);
  }

  /*
   * `times` is indexed like spec.segments, but a `clip` segment has no place in
   * the narration at all — it carries its own audio. So the walk runs over the
   * SPOKEN segments and the results are scattered back onto the full index, with
   * clips holding their own in/out points instead.
   */
  const spoken = spec.segments.filter((sg) => sg.mode !== "clip");
  const spokenTimes = segmentTimes(words, spoken);
  let sp = 0;
  const times = spec.segments.map((sg) =>
    sg.mode === "clip" ? { start: sg.from, end: sg.to, clip: true } : spokenTimes[sp++]);
  times.forEach((t, i) => console.log(
    `     ${String(i).padStart(2)} ${spec.segments[i].mode.padEnd(6)} ${t.start.toFixed(1)}–${t.end.toFixed(1)}s  ` +
    `${spec.segments[i].mode === "clip" ? `[source ${spec.segments[i].from}s–${spec.segments[i].to}s]` : spec.segments[i].text.slice(0, 44) + "…"}`));
  if (has("dry")) { console.log("\nDry run — narration and timings only, no video bought.\n"); return; }

  /* ---- 2. slice the narration ------------------------------------------ */
  console.log("\n2/5  slicing");
  const slices = times.map((t, i) => {
    if (spec.segments[i].mode === "clip") return null;   // carries its own audio
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
  const usedClipIds = [];   // so one video does not lean on the same clip twice
  let spent = 0;

  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i];
    const dur = seg.mode === "clip"
      ? seg.to - seg.from                       // the clip's own length
      : (times[i].end + 0.12) - times[i].start;
    const piece = path.join(work, `piece-${i}.mp4`);
    if (usable(piece)) { pieces.push(piece); console.log(`  ${i} cached`); continue; }
    if (fs.existsSync(piece)) console.log(`  ${i} cached piece does not decode — rebuilding`);

    if (seg.mode === "clip") {
      /*
       * SOMEBODY ELSE'S FOOTAGE, WITH THEIR AUDIO. This is the segment type a
       * reaction video is built from: the source plays as itself, and the piece
       * that follows is us talking over ours. Nothing here touches the
       * narration — see the note where `full` is built.
       *
       * NORMALISED TO THE SAME LADDER as every other piece (fps, size, sample
       * rate, codec), because concat demuxer joins streams without re-encoding
       * and a piece that differs in any of those produces a file that plays for
       * some players and stutters or desyncs on others.
       *
       * LOUDNESS MATCHED, NOT LEFT ALONE. Podcast audio recorded somewhere else
       * sits at a different level to our narration, and a reaction video that
       * jumps volume at every cut is unwatchable on a phone. -17 LUFS is where
       * the TTS narration lands, measured.
       */
      const src = seg.source ?? spec.clipSource;
      if (!src || !fs.existsSync(src)) throw new Error(`clip segment ${i} has no source file (${src})`);
      console.log(`  ${i} clip   ${dur.toFixed(1)}s  ${path.basename(src)} ${seg.from}s–${seg.to}s`);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
        "-ss", String(seg.from), "-to", String(seg.to), "-i", src,
        "-filter_complex",
        `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v];` +
        `[0:a]loudnorm=I=-17:TP=-1.5:LRA=11,aresample=44100[a]`,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", NEWSDESK.video.preset, "-crf", String(NEWSDESK.video.crfPiece), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", `${NEWSDESK.video.audioKbps}k`, "-ac", "1", piece], { stdio: ["ignore", "ignore", "pipe"] });
      pieces.push(piece);
      continue;
    }

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
      const up = await db.storage.from(NEWSDESK.publish.bucket)
        .upload(key, fs.readFileSync(mp3), { contentType: "audio/mpeg", upsert: true });
      if (up.error) throw new Error(`audio upload failed: ${up.error.message}`);
      const audioUrl = db.storage.from(NEWSDESK.publish.bucket).getPublicUrl(key).data.publicUrl;

      /*
       * THE PAID RENDER IS THE EXPENSIVE ARTEFACT, so it gets its own cache
       * ahead of the composite. A composite can fail for a dozen free reasons —
       * a bad filter, a killed process — and re-buying the avatar to fix one of
       * them is paying twice for the same seconds.
       */
      const raw = path.join(work, `avatar-${i}.mp4`);
      if (usable(raw)) {
        console.log(`  ${i} avatar — reusing the render already paid for`);
      } else {
      console.log(`  ${i} avatar ${dur.toFixed(1)}s ≈ $${(dur * AVATAR_PER_SEC).toFixed(2)}`);
      const created = await heygen("/v3/videos", {
        method: "POST",
        body: JSON.stringify({
          type: "avatar",
          avatar_id: process.env[NEWSDESK.avatar.avatarEnv],
          audio_url: audioUrl,
          title: `${spec.slug}-${i}`.slice(0, 100),
          aspect_ratio: NEWSDESK.avatar.aspectRatio,
          resolution: NEWSDESK.avatar.resolution,
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

      fs.writeFileSync(raw, Buffer.from(await (await fetch(done.video_url)).arrayBuffer()));
      }

      /*
       * HEADLINE BEHIND, HIM IN FRONT. The article is the hook and has to stay
       * legible while he talks, so the avatar sits in the lower portion at 68%
       * width rather than filling the frame. A thin light edge separates him
       * from a page that is mostly white, which otherwise blends.
       */
      if (NEWSDESK.avatar.fullScreen) {
        /*
         * FULL FRAME. A Hot Take has no article to keep readable — the argument
         * is the hook — so the face fills the screen. Scaled to COVER and then
         * cropped, never padded: bars around a talking head read as a mistake,
         * and HeyGen already returns 9:16 so the crop takes almost nothing.
         */
        execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-i", slices[i],
          "-filter_complex",
          `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v]`,
          "-map", "[v]", "-map", "1:a", "-t", String(dur),
          "-c:v", "libx264", "-preset", NEWSDESK.video.preset, "-crf", String(NEWSDESK.video.crfPiece), "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", `${NEWSDESK.video.audioKbps}k`, piece], { stdio: ["ignore", "ignore", "pipe"] });
      } else {
      const bg = path.join(work, `bg-${i}.mp4`);
      headlineClip(spec.headline, dur, bg, 1.0, 1.04);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", bg, "-i", raw, "-i", slices[i],
        "-filter_complex",
        `[1:v]scale=${Math.round(W * NEWSDESK.avatar.widthPct)}:-2,setsar=1,` +
        `pad=iw+${NEWSDESK.avatar.edgePad * 2}:ih+${NEWSDESK.avatar.edgePad * 2}:${NEWSDESK.avatar.edgePad}:${NEWSDESK.avatar.edgePad}:color=${NEWSDESK.avatar.edgeColor}[av];` +
        `[0:v][av]overlay=(W-w)/2:H-h-${NEWSDESK.avatar.bottomOffset}:shortest=1[v]`,
        "-map", "[v]", "-map", "2:a", "-r", String(FPS), "-t", String(dur),
        "-c:v", "libx264", "-preset", NEWSDESK.video.preset, "-crf", String(NEWSDESK.video.crfPiece), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", `${NEWSDESK.video.audioKbps}k`, piece], { stdio: ["ignore", "ignore", "pipe"] });
      }
    } else {
      /*
       * A VOICE SEGMENT IS AS MANY SHOTS AS ITS LENGTH DEMANDS. This is the fix
       * for the frozen frame: the picture changes on VISUAL_MAX_SECS, the
       * narration does not, and the two are no longer the same clock.
       *
       * The shot LIST is built first, so a segment asking for three b-roll
       * shots gets three DIFFERENT clips rather than the same one three times —
       * which would be a cut to nowhere and worse than not cutting at all.
       */
      const lens = shotLengths(dur);
      const views = [];
      if (seg.visual === "broll") {
        const tags = seg.tags || [];
        /*
         * NO GLOBAL EXCLUSION, and getting this wrong is what made the shot
         * maths fail the first time. Excluding every clip already used in the
         * video starves the later segments, and the fallback then repeats one
         * clip three times INSIDE a single segment — three cuts to the same
         * picture, which is worse than never cutting.
         *
         * Repeating a clip ACROSS segments, forty seconds apart, is barely
         * noticeable. Repeating one WITHIN a segment is a visible mistake. So
         * the whole matching set is fetched, unused clips are preferred, and
         * distinctness is enforced only where it matters — inside the segment.
         */
        const hits = await findClips(db, { tags, limit: 50 });
        if (!hits.length) {
          throw new Error(`nothing in the b-roll library matches [${tags.join(", ")}] — add a clip or change the tags rather than shipping the wrong picture`);
        }
        const fresh = hits.filter((c) => !usedClipIds.includes(c.id));
        const pool = [...fresh, ...hits.filter((c) => usedClipIds.includes(c.id))];
        for (let k = 0; k < lens.length; k++) {
          const clip = pool[k % pool.length];
          if (k >= pool.length) console.log(`     (only ${pool.length} clip(s) match [${tags.join(", ")}] — one repeats)`);
          views.push({ kind: "broll", clip });
        }
      } else if (seg.visual === "chart") {
        lens.forEach((_, k) => views.push({ kind: "chart", crop: k % 2 ? CHART_TIGHT : CHART_WIDE }));
      } else {
        for (const _ of lens) views.push({ kind: "headline" });
      }

      console.log(`  ${i} voice  ${dur.toFixed(1)}s  ${lens.length} shot${lens.length > 1 ? "s" : ""}  ${seg.visual ?? "headline"}` +
        (seg.visual === "broll" ? `  [${views.map((v) => v.clip.tags[0]).join(", ")}]` : ""));

      const shots = [];
      for (let k = 0; k < lens.length; k++) {
        const shot = path.join(work, `shot-${i}-${k}.mp4`);
        const v = views[k];
        if (v.kind === "broll") {
          const local = path.join(".cache", "broll-hf", path.basename(v.clip.storage_path || `${v.clip.id}.mp4`));
          if (!fs.existsSync(local)) {
            fs.mkdirSync(path.dirname(local), { recursive: true });
            fs.writeFileSync(local, Buffer.from(await (await fetch(v.clip.url)).arrayBuffer()));
          }
          brollClip(local, lens[k], shot);
          if (!usedClipIds.includes(v.clip.id)) usedClipIds.push(v.clip.id);
          await markUsed(db, v.clip.id);
        } else if (v.kind === "chart") {
          chartClip(spec.headline, lens[k], shot, v.crop);
        } else {
          // Alternate the push direction shot to shot so two headline shots in a
          // row are not the same move twice.
          headlineClip(spec.headline, lens[k], shot, k % 2 ? 1.10 : 1.0, k % 2 ? 1.0 : 1.10);
        }
        shots.push(shot);
      }

      /*
       * The shots are joined FIRST, silent, then the segment's audio slice is
       * laid over the join. Muxing audio into each shot instead would put a
       * container boundary in the middle of a spoken word at every cut.
       */
      const vlist = path.join(work, `shots-${i}.txt`);
      fs.writeFileSync(vlist, shots.map((sp) => `file '${path.resolve(sp)}'`).join("\n"));
      const joined = path.join(work, `shots-${i}.mp4`);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", vlist,
        "-c", "copy", joined], { stdio: ["ignore", "ignore", "pipe"] });

      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", joined, "-i", slices[i],
        "-map", "0:v", "-map", "1:a", "-t", String(dur),
        "-c:v", "libx264", "-preset", NEWSDESK.video.preset, "-crf", String(NEWSDESK.video.crfPiece), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", `${NEWSDESK.video.audioKbps}k`, piece], { stdio: ["ignore", "ignore", "pipe"] });
    }
    pieces.push(piece);
  }

  /* ---- 4. one timeline -------------------------------------------------- */
  console.log("\n4/5  assembling");
  const list = path.join(work, "pieces.txt");
  fs.writeFileSync(list, pieces.map((p) => `file '${path.resolve(p)}'`).join("\n"));
  const assembled = path.join(work, "assembled.mp4");
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "libx264", "-preset", NEWSDESK.video.preset, "-crf", String(NEWSDESK.video.crfFinal), "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", `${NEWSDESK.video.audioKbps}k`, "-movflags", "+faststart", assembled], { stdio: ["ignore", "ignore", "pipe"] });

  fs.copyFileSync(assembled, out);

  /* ---- 5. word timings ON THE ASSEMBLED TIMELINE ------------------------ */
  /*
   * WITHOUT THIS THE CAPTIONS PASS SILENTLY DOES NOTHING, and that is not a
   * theory — it happened on the first News Desk and shipped an uncaptioned
   * video. Three separate reasons, none of which raises an error:
   *
   *   1. add_captions.js reads `.words` off an OBJECT. narration.words.json is
   *      a bare ARRAY, so it sees zero words, burns nothing, and exits 0.
   *   2. The HeyGen list carries <start> / <end> marker tokens that
   *      add_captions.js does not filter. They render as literal on-screen text.
   *   3. THE TIMINGS ARE ON THE WRONG CLOCK. The narration is continuous; the
   *      video is its segments cut out and butted together, so every pause
   *      BETWEEN segments exists in the timings and not in the video. Captions
   *      driven off the raw narration drift progressively late — about 2.5s by
   *      the end of a 90-second cut.
   *
   * Offsets come from PROBING the finished pieces rather than from
   * (end - start + 0.12), because ffmpeg rounds each piece to a whole frame and
   * that rounding is what the concat actually used.
   */
  const pieceDur = (f) => {
    const err = spawnSync(FF, ["-hide_banner", "-i", f], { encoding: "utf8" }).stderr || "";
    const m = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  };
  let acc = 0;
  const offsets = pieces.map((pth) => { const o = acc; acc += pieceDur(pth); return o; });

  const mapped = [];
  /*
   * CLIP SEGMENTS ARE EXCLUDED FROM THE MATCH, and leaving them in is a subtle
   * corruption rather than a crash. A clip's `times` entry holds SOURCE
   * timecodes — 0s to 9s of the podcast — which overlap the narration's own
   * timeline, so a narration word at 5s would match the clip's range and be
   * placed on a piece that never speaks it. Captions would then sit over
   * somebody else's footage saying something they did not say.
   *
   * A clip carries no narration, so it simply has no captions. That is correct:
   * the podcast's own speech is not in our transcript.
   */
  const spokenIdx = spec.segments.map((sg, i) => (sg.mode === "clip" ? -1 : i)).filter((i) => i >= 0);
  for (const w of words) {
    if (!w.word || /^<.*>$/.test(w.word)) continue;
    let si = spokenIdx.find((i) => w.start >= times[i].start - 0.001 && w.start <= times[i].end + 0.2);
    if (si === undefined) {                // inside a dropped gap — clamp forward
      si = spokenIdx.find((i) => times[i].start > w.start);
      if (si === undefined) si = spokenIdx[spokenIdx.length - 1];
    }
    const base = offsets[si] ?? 0;
    const lim = pieceDur(pieces[si]);
    mapped.push({
      word: w.word,
      start: Number((base + Math.min(Math.max(0, w.start - times[si].start), lim)).toFixed(3)),
      end: Number((base + Math.min(Math.max(0, w.end - times[si].start), lim)).toFixed(3)),
    });
  }
  const wordsOut = out.replace(/\.mp4$/i, "") + ".words.json";
  fs.writeFileSync(wordsOut, JSON.stringify({ words: mapped }, null, 2));

  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
  console.log(`\n5/5  done  ${out}  ${mb(out)}MB`);
  console.log(`     spent ~$${spent.toFixed(2)} on avatar`);
  console.log(`     ${mapped.length} word timings rebased onto the ${acc.toFixed(1)}s cut -> ${wordsOut}\n`);
  console.log(`Next:`);
  console.log(`  node scripts/add_captions.js ${out} --words ${wordsOut}`);
  console.log(`  node scripts/add_music.js <captioned.mp4> --track "..."\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
