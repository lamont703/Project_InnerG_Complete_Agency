#!/usr/bin/env node
/**
 * Marries a podcast audio file to the Shear Run visual bed, producing one
 * upload-ready MP4.
 *
 * THE VISUAL BED IS BUILT TO THE AUDIO, not the other way round. Clips are
 * chained until they exceed the audio, then the whole thing is trimmed to the
 * audio's exact length. That ordering matters: pad the audio to
 * fit the video and you get silence at the end, which on YouTube is watch time
 * spent on nothing and reads as a mistake.
 *
 * HARD CUTS, AND WHY THAT IS THE RIGHT CALL HERE. Crossfading would be nicer,
 * but the bundled ffmpeg is a 2018 build and the `xfade` filter arrived in 4.3
 * (2020) — it is not available, and shipping a dependency upgrade to soften a
 * scene change is a poor trade.
 *
 * What that constraint buys is better than what it costs: with cuts, the video
 * can go through the CONCAT DEMUXER and be STREAM-COPIED. No re-encode means no
 * generation loss on thin saturated neon lines — the one thing this footage is
 * most fragile about — and the build takes seconds rather than twenty minutes.
 * A palette change on a cut reads as a deliberate scene change anyway, and it
 * happens roughly five times across a 23-minute episode.
 *
 * THE AUDIO IS COPIED, NEVER RE-ENCODED. It arrives as AAC and YouTube wants
 * AAC, so a re-encode would be a generation of loss for nothing. Loudness is
 * MEASURED and reported rather than corrected: YouTube normalises playback
 * itself, and quietly changing someone's mastered audio is not a decision a
 * build script should make on its own.
 *
 * Usage:
 *   node scripts/build_podcast_video.js "path/to/episode.m4a"
 *   node scripts/build_podcast_video.js "episode.m4a"
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const CLIP_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "shear-run");
const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Episodes Rendered");
const OUT_DIR_TMP = () => OUT_DIR;

const probeDuration = (file) => {
  const out = execFileSync(ffmpeg, ["-i", file], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] })
    .toString();
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error(`could not read duration of ${file}`);
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
};

// execFileSync throws on ffmpeg's non-zero exit for -i with no output, so probe
// through a wrapper that tolerates it and still captures stderr.
function duration(file) {
  try { return probeDuration(file); }
  catch (e) {
    const out = (e.stderr || "").toString();
    const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (!m) throw new Error(`could not read duration of ${file}`);
    return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }
}

/**
 * Loudness, measured with what this ffmpeg build can actually do.
 *
 * The right tool is ebur128 (real LUFS, the unit every platform normalises in),
 * but this 2018 build errors out mid-stream on the episode file — "Error
 * reinitializing filters" — and reports 0.0 LUFS, which is its pre-failure
 * state rather than a measurement. Reporting that would be worse than
 * reporting nothing: 0 LUFS is physically absurd and someone might act on it.
 *
 * So volumedetect, which works. It gives RMS mean and true peak in dB rather
 * than LUFS. Those are NOT interconvertible — RMS ignores the frequency
 * weighting LUFS applies — so this reports dB and says so, rather than
 * converting and inventing precision.
 */
function measureLoudness(audio) {
  return new Promise((resolve) => {
    const p = spawn(ffmpeg, ["-nostats", "-i", audio, "-af", "volumedetect", "-f", "null", "-"]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", () => {
      const mean = err.match(/mean_volume:\s*(-?\d+\.?\d*) dB/);
      const peak = err.match(/max_volume:\s*(-?\d+\.?\d*) dB/);
      resolve({
        meanDb: mean ? parseFloat(mean[1]) : null,
        peakDb: peak ? parseFloat(peak[1]) : null,
      });
    });
  });
}

async function main() {
  const audio = process.argv[2];
  if (!audio || !fs.existsSync(audio)) {
    console.error('usage: node scripts/build_podcast_video.js "path/to/episode.m4a"');
    process.exit(1);
  }
  const clips = fs.readdirSync(CLIP_DIR).filter((f) => f.endsWith(".mp4")).sort()
    .map((f) => path.join(CLIP_DIR, f));
  if (!clips.length) { console.error(`no clips in ${CLIP_DIR}`); process.exit(1); }

  const audioLen = duration(audio);
  const clipLen = duration(clips[0]);

  // How many clips to chain so the bed exceeds the audio. With hard cuts the
  // arithmetic is simply length x count — no crossfade overlap to subtract.
  const n = Math.ceil(audioLen / clipLen);
  const seq = Array.from({ length: n }, (_, i) => clips[i % clips.length]);
  const bedLen = n * clipLen;

  console.log(`audio : ${(audioLen / 60).toFixed(2)} min`);
  console.log(`clips : ${clips.length} available, ${clipLen}s each`);
  console.log(`bed   : ${n} segments -> ${(bedLen / 60).toFixed(2)} min (trimmed to audio)\n`);

  const loud = await measureLoudness(audio);
  console.log(`audio level: mean ${loud.meanDb} dB RMS, true peak ${loud.peakDb} dB`);
  if (loud.peakDb !== null && loud.peakDb > -1) {
    console.log(`             WARNING: peak above -1 dB — close to clipping.`);
  }
  console.log(`             dB RMS, not LUFS — ebur128 fails on this ffmpeg build. Reported, not`);
  console.log(`             corrected: re-mastering someone's audio is not this script's call.\n`);

  // The concat demuxer takes a list file. Paths are quoted and single quotes
  // escaped, because these live under "Podcast Visuals" — a directory with a
  // space in it, which is exactly what breaks naive list building.
  const listFile = path.join(OUT_DIR_TMP(), "concat.txt");
  fs.mkdirSync(path.dirname(listFile), { recursive: true });
  fs.writeFileSync(listFile, seq.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n");

  const base = path.basename(audio).replace(/\.[^.]+$/, "");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${base}.mp4`);

  const args = [
    "-y",
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-i", audio,
    "-map", "0:v", "-map", "1:a",
    // STREAM COPY on both. The clips were already encoded to spec by
    // record_shear_run.js and the audio is already AAC, so re-encoding either
    // would cost quality and time to arrive at the same file.
    "-c:v", "copy", "-c:a", "copy",
    "-t", audioLen.toFixed(3),
    "-movflags", "+faststart",
    out,
  ];

  console.log("muxing (stream copy — no re-encode)…");
  const started = Date.now();
  await new Promise((res, rej) => {
    const p = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let last = 0, err = "";
    p.stderr.on("data", (d) => {
      err += d;
      const m = d.toString().match(/time=(\d+):(\d+):(\d+)/);
      if (m) {
        const secs = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
        if (secs - last > 60) { last = secs; process.stdout.write(`  ${(secs / 60).toFixed(0)}/${(audioLen / 60).toFixed(0)} min\n`); }
      }
    });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(err.slice(-1500)))));
  });

  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`\n${path.basename(out)}  ${mb} MB  (${((Date.now() - started) / 60000).toFixed(1)} min to encode)`);
  console.log(out);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
