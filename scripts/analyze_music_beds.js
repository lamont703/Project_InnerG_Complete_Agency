#!/usr/bin/env node
/**
 * MUSIC BED ANALYSIS — measuring tracks nobody can listen to.
 *
 *   node scripts/analyze_music_beds.js
 *   node scripts/analyze_music_beds.js --dir "experiments/YouTube Music Tracks"
 *
 * WHY THIS EXISTS. An assistant cannot hear audio. It can read a waveform's
 * statistics, and for the one job here — a bed that sits UNDER narration and
 * reads as "low and dark" — the statistics are most of the decision. Three
 * numbers do the work:
 *
 *   TILT   Energy below 250 Hz against energy above 4 kHz, in dB. A large
 *          positive tilt is a dark track: weight in the low end, little air on
 *          top. A negative tilt is bright — cymbals, synth sparkle, presence —
 *          which is exactly the region a human voice occupies, so a bright bed
 *          fights the VO no matter how quiet it is.
 *
 *   LRA    Loudness range, in LU. This is the one people forget. A bed with a
 *          wide LRA swings loud and quiet under a steady voice, so every
 *          quiet passage buries the narration and every loud one steps on it.
 *          Under 6 LU sits still; over 10 needs riding or ducking.
 *
 *   LUFS   Integrated loudness. Not a quality signal — it is the number to
 *          normalise FROM. Broadcast beds land around -30 to -26 LUFS under
 *          speech, so what matters is knowing each track's starting point.
 *
 * WHAT IT DOES NOT MEASURE. Melody, key, whether the track is any good, and
 * whether it has an obvious hook that will pull attention off the narration.
 * A person still has to listen. This narrows 29 tracks to a shortlist worth
 * listening to, in the right order — it does not pick the music.
 *
 * A 90-SECOND WINDOW FROM 25% IN. Intros are unrepresentative: many beds open
 * sparse and arrive at their real texture later. Measuring the whole file also
 * costs minutes across 29 tracks for no extra signal.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const DIR = arg("dir", "experiments/YouTube Music Tracks");
const WINDOW = 90;

function probeDuration(file) {
  const out = execFileSync(FFPROBE, [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1", file,
  ]).toString().trim();
  return Number(out) || 0;
}

/*
 * spawnSync, NOT execFileSync.
 *
 * ffmpeg's filters — volumedetect, ebur128 — print their results to STDERR,
 * and execFileSync returns STDOUT. The first version read the return value and
 * got an empty string on every successful run, so all 29 tracks reported "—"
 * with no error anywhere. spawnSync hands back both streams.
 */
function runFilters(file, start, filters) {
  const r = spawnSync(FF, [
    "-nostats", "-ss", String(start), "-t", String(WINDOW),
    "-i", file, "-af", filters, "-f", "null", "-",
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return (r.stderr || "") + (r.stdout || "");
}

function bandRms(file, start, filter) {
  const err = runFilters(file, start, `${filter},volumedetect`);
  const m = err.match(/mean_volume:\s*(-?[\d.]+) dB/);
  return m ? Number(m[1]) : null;
}

/*
 * PARSE THE SUMMARY, NOT THE STREAM.
 *
 * ebur128 prints a running line per frame — "M: -70.0 S: -70.0 I: -70.0 LUFS
 * LRA: 0.0 LU" — and only prints the real figures in a "Summary:" block at the
 * end. Matching the first "I:" in the output takes the very first frame, before
 * the meter has integrated anything, so every track reads -70 LUFS / 0.0 LRA:
 * the values for silence. Split at Summary and read only what follows.
 */
function loudness(file, start) {
  const out = runFilters(file, start, "ebur128=peak=true");
  const idx = out.lastIndexOf("Summary:");
  const tail = idx === -1 ? out : out.slice(idx);
  const grab = (label) => {
    const m = tail.match(new RegExp("\\b" + label + ":\\s*(-?[\\d.]+)"));
    return m ? Number(m[1]) : null;
  };
  return { lufs: grab("I"), lra: grab("LRA") };
}

const files = fs.readdirSync(DIR)
  .filter((f) => /\.(mp3|m4a|wav|flac)$/i.test(f))
  .sort();

if (!files.length) {
  console.error(`no audio files in ${DIR}`);
  process.exit(1);
}

const rows = [];
for (const name of files) {
  const file = path.join(DIR, name);
  const dur = probeDuration(file);
  const start = Math.max(0, Math.min(dur * 0.25, Math.max(0, dur - WINDOW)));

  const low = bandRms(file, start, "lowpass=f=250");
  const high = bandRms(file, start, "highpass=f=4000");
  const { lufs, lra } = loudness(file, start);
  const tilt = low != null && high != null ? low - high : null;

  rows.push({ name: name.replace(/\.(mp3|m4a|wav|flac)$/i, ""), dur, lufs, lra, tilt });
  process.stderr.write(".");
}
process.stderr.write("\n\n");

/* Rank for "low, dark, sits under a voice": dark tilt first, flat LRA second.
   Both are normalised loosely — this is an ordering, not a score anyone should
   quote back as a measurement. */
rows.sort((a, b) => (b.tilt ?? -99) - (a.tilt ?? -99));

const fmt = (v, d = 1) => (v == null ? "  —  " : v.toFixed(d).padStart(6));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

console.log("TILT = low(<250Hz) minus high(>4kHz), dB. Higher = darker.");
console.log("LRA  = loudness range, LU. Lower = sits still under narration.\n");
console.log("  TILT    LRA     LUFS   LEN    TRACK");
console.log("  " + "-".repeat(76));
for (const r of rows) {
  const flag = r.tilt != null && r.tilt >= 20 && r.lra != null && r.lra <= 6 ? " ◀ bed" : "";
  console.log(`${fmt(r.tilt)} ${fmt(r.lra)} ${fmt(r.lufs)}  ${mmss(r.dur).padStart(5)}  ${r.name}${flag}`);
}
console.log("\n◀ bed = dark (tilt >= 20 dB) AND steady (LRA <= 6 LU): the shortlist to listen to first.");
