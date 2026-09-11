#!/usr/bin/env node
/**
 * Lay the cues onto the guard film's actual timeline, so the SOUND can be
 * judged before a single frame is animated.
 *
 *   node scripts/instagram/sfx_demo.js
 *
 * The point of the exercise is one question: does the guard falling read, with
 * no picture at all? If it does not read here it will not read over animation,
 * and the format is not viable — better to learn that from an 11-second wav
 * than after building eight shots.
 */
const path = require("path");
const { execFileSync } = require("child_process");
const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const S = "experiments/sfx";
const OUT = "experiments/sfx/guard-moment.wav";

/* Timings lifted straight from the shot list. */
const cut = [
  // file,              start, end,  gain
  [`${S}/clipper-guarded.wav`, 0.00, 3.20, 0.85],  // shots 1-2, the guard still on
  [`${S}/guard-drop.wav`,      3.20, 4.10, 1.00],  // shot 3, it hits the floor
  [`${S}/clipper-bare.wav`,    3.24, 5.50, 0.85],  // shot 4, he keeps cutting
  [`${S}/room-tone.wav`,       5.50, 11.0, 1.00],  // shot 5, everything drops out
  [`${S}/string-rise.wav`,     7.00, 10.0, 0.55],  // shots 6-7, the dread
  [`${S}/sting.wav`,           9.55, 10.3, 0.95],  // shot 8, his eyes change
];

const inputs = [];
const parts = [];
cut.forEach(([file, start, end, gain], i) => {
  inputs.push("-i", file);
  const dur = end - start;
  /*
   * Every element is trimmed, levelled, then delayed to its cue. aloop keeps
   * the 4s clipper beds covering a longer span without an audible seam — a
   * concat would tick at the joins, and the hum has to be continuous for the
   * timbre change to land as a change rather than a cut.
   */
  parts.push(
    `[${i}:a]aloop=loop=-1:size=2e9,atrim=0:${dur.toFixed(3)},` +
    `volume=${gain},afade=t=in:st=0:d=0.03,afade=t=out:st=${Math.max(0, dur - 0.06).toFixed(3)}:d=0.06,` +
    `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}[p${i}]`
  );
});
const graph =
  parts.join(";") + ";" +
  cut.map((_, i) => `[p${i}]`).join("") +
  `amix=inputs=${cut.length}:normalize=0,alimiter=limit=0.95,volume=1.6[a]`;

execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error",
  ...inputs, "-filter_complex", graph, "-map", "[a]", "-t", "11", "-ar", "48000", "-ac", "1", OUT,
], { stdio: "inherit" });
console.log(`  -> ${OUT}`);
