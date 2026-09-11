#!/usr/bin/env node
/**
 * Sound bed for the twelve-shot cut.
 *
 *   node scripts/instagram/sfx_guard.js
 *
 * RE-TIMED, NOT REUSED. The first bed was written for an eight-shot film with
 * no mosquito. Adding the insect changed the shape: there is now a long comic
 * middle before the dread starts, and a bed cued to the old beats would drop
 * its sting three seconds early.
 *
 * The mosquito whine is a slow vibrato on a high sine — a real recording would
 * be better, but a wavering tone is the one insect sound synthesis does well,
 * and it has to sit ABOVE the clipper hum in pitch or the two smear together.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const S = "experiments/sfx";
const OUT = `${S}/guard-film.wav`;
const SR = 48000;

/* One mosquito cue, generated here because the first pass had no insect. */
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-filter_complex",
  `aevalsrc='0.22*sin(2*PI*(620+55*sin(2*PI*5.5*t))*t)+0.08*sin(2*PI*(1240+110*sin(2*PI*5.5*t))*t)':s=${SR}:d=6[o];` +
  `[o]highpass=f=380,volume=0.9[a]`,
  "-map", "[a]", "-t", "6", "-ar", String(SR), "-ac", "1", `${S}/mosquito.wav`], { stdio: "inherit" });

/* file, start, end, gain — cued to the cut in scripts/instagram/cut_guard.js */
const bed = [
  [`${S}/clipper-guarded.wav`, 0.00,  6.00, 0.80],  // shots 1-3, guard still on
  [`${S}/mosquito.wav`,        1.30,  8.00, 0.55],  // arrives, and stays until the clap
  [`${S}/guard-drop.wav`,      6.20,  7.10, 1.00],  // shot 6, it hits the floor
  [`${S}/clipper-bare.wav`,    6.24, 10.20, 0.80],  // shot 7, still cutting, bare blade
  [`${S}/sting.wav`,            9.80, 10.40, 0.45], // the clap, used as an impact
  [`${S}/room-tone.wav`,       10.20, 18.20, 1.00], // shot 9 on, everything drops out
  [`${S}/string-rise.wav`,     12.60, 15.60, 0.60], // the stripe, dread climbing
  [`${S}/sting.wav`,           15.55, 16.30, 0.95], // shot 11, his head comes up
];

const inputs = [];
const parts = [];
bed.forEach(([file, start, end, gain], i) => {
  inputs.push("-i", file);
  const dur = end - start;
  parts.push(
    `[${i}:a]aloop=loop=-1:size=2e9,atrim=0:${dur.toFixed(3)},` +
    `volume=${gain},afade=t=in:st=0:d=0.04,afade=t=out:st=${Math.max(0, dur - 0.10).toFixed(3)}:d=0.10,` +
    `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}[p${i}]`
  );
});
const graph = parts.join(";") + ";" + bed.map((_, i) => `[p${i}]`).join("") +
  `amix=inputs=${bed.length}:normalize=0,alimiter=limit=0.90,volume=1.5[a]`;

execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", ...inputs,
  "-filter_complex", graph, "-map", "[a]", "-t", "18.2", "-ar", String(SR), "-ac", "1", OUT],
  { stdio: "inherit" });
console.log(`  -> ${OUT}`);
