#!/usr/bin/env node
/**
 * Sound bed for The Spray Bottle, cut from real recordings.
 *
 *   node scripts/instagram/sfx_spray.js
 *
 * THE RECORDINGS WIN, AND THE SYNTHESISED VERSION IS GONE. An earlier pass
 * generated all of this with filtered noise, on the reasoning that spray and
 * water ARE broadband noise so synthesis is the physical thing rather than an
 * imitation of it. That reasoning holds and the result was usable — but a real
 * spray bottle has a valve rattle, a real comb has individual teeth, and real
 * breathing has a throat in it. None of that is noise-shaped and none of it
 * survives synthesis.
 *
 * ONE SOURCE FILE HELD FOUR SEPARATE SPRAYS, at 0.00, 0.38, 0.88 and 1.48, and
 * the barrage rotates through all four. This matters more than it sounds: the
 * same sample fourteen times in four seconds stops being a spray bottle and
 * becomes an obvious loop, which the ear catches instantly. Four alternating
 * takes read as one man pumping a trigger.
 *
 * EVERY SOURCE IS NORMALISED FIRST, then given a cue gain. The files arrived
 * between -0.4 dB peak (the spray, effectively clipping) and -31 dB (the comb,
 * nearly inaudible) — a thirty decibel spread. Mixing those raw makes every cue
 * level two decisions tangled together, and swapping one source re-breaks the
 * whole mix. Normalise to a common peak and a cue gain means what it says.
 *
 * FOUR CUES ARE STILL SYNTHESISED because no recording was supplied: the cape
 * flap, the arm-reach whoosh, the nozzle squeak and the room tone. They are
 * motion and air rather than objects, and nothing in the film leans on them.
 *
 * THE SPUTTER IS THE REAL SPRAY CUT OFF AT 0.13s with a hard fade — a spray
 * that dies the instant it starts. Synthesised it was a short hiss; taken from
 * the same recording as the working sprays it is unmistakably the SAME BOTTLE
 * failing, which is the entire point of that beat.
 *
 * REAL RECORDINGS NEED FAR MORE GAIN THAN SYNTHESISED ONES AT THE SAME PEAK.
 * A generated spray was dense noise for its whole length; a recorded one is a
 * short transient surrounded by near-silence, so at equal peak it carries a
 * fraction of the average energy. Carrying the synth mix's gain numbers over
 * left the film ten decibels down and put the POUR — the climax — quieter than
 * an ordinary spray. Set these by measuring the assembled mix, not by copying.
 *
 * SIX CUES ARE PRE-LAPPED — they start three to six frames BEFORE the picture
 * cuts to them. The ear arrives first and the picture confirms it, which makes
 * a cut feel motivated instead of assembled. It is the cheapest editing trick
 * there is and it costs nothing but a negative offset. Do not pre-lap a sound
 * that happens mid-shot rather than at the cut: the final spray lands when he
 * squeezes, not when we cut to him, and moving it early would just make it
 * early.
 *
 * CUE TIMES COME FROM cut_spray.js AND WILL BE WRONG IF THE CUT MOVES. Nothing
 * derives them from the film. Shot boundaries are listed beside the table.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");
const SR = 48000;
const SFX = "experiments/sfx";
const FILM = "experiments/films/the-spray-bottle-silent.mp4";
const OUT = "experiments/films/the-spray-bottle.mp4";
const DUR = 42.1;
const work = ".cache/spray-sfx";
fs.mkdirSync(work, { recursive: true });

const C = (n) => path.join(work, `${n}.wav`);
const NOISE = "(random(0)*2-1)";

/** Peak in dBFS. spawnSync because volumedetect reports on stderr and exits 0. */
function peakDb(file) {
  const r = spawnSync(FF, ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" });
  const m = (r.stderr || "").match(/max_volume:\s*(-?[\d.]+) dB/);
  if (!m) throw new Error(`could not measure ${file}`);
  return Number(m[1]);
}

/** Bring a source to a common peak so cue gains are comparable across files. */
function normalise(src, out, target = -3) {
  if (!fs.existsSync(src)) throw new Error(`missing sound file: ${src}`);
  const boost = target - peakDb(src);
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-af", `volume=${boost.toFixed(2)}dB`, "-ar", String(SR), "-ac", "1", out], { stdio: "inherit" });
  console.log(`  ${path.basename(src).padEnd(32)} ${boost >= 0 ? "+" : ""}${boost.toFixed(1)} dB`);
}

/** One cue cut out of a normalised source. */
function slice(src, out, ss, dur, { fadeIn = 0.005, fadeOut = 0.05 } = {}) {
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(ss), "-t", String(dur), "-i", src,
    "-af", `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${Math.max(0, dur - fadeOut).toFixed(3)}:d=${fadeOut}`,
    "-ar", String(SR), "-ac", "1", out], { stdio: "inherit" });
}

function noiseCue(file, { dur, lo, hi, attack = 0.01, decay = 0.2 }) {
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-filter_complex",
    `aevalsrc='${NOISE}':s=${SR}:d=${dur}[o];` +
    `[o]highpass=f=${lo},highpass=f=${lo},lowpass=f=${hi},lowpass=f=${hi},` +
    `afade=t=in:st=0:d=${attack},afade=t=out:st=${Math.max(0, dur - decay).toFixed(3)}:d=${decay}[a]`,
    "-map", "[a]", "-t", String(dur), "-ar", String(SR), "-ac", "1", file], { stdio: "inherit" });
}

function squeakCue(file, dur = 1.4) {
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-filter_complex",
    `aevalsrc='${NOISE}*(0.35+0.35*sin(2*PI*2.6*t))':s=${SR}:d=${dur}[o];` +
    `[o]highpass=f=900,lowpass=f=3400,afade=t=in:st=0:d=0.15,` +
    `afade=t=out:st=${(dur - 0.3).toFixed(2)}:d=0.3[a]`,
    "-map", "[a]", "-t", String(dur), "-ar", String(SR), "-ac", "1", file], { stdio: "inherit" });
}

console.log("normalising sources to -3 dB peak:");
const N = {};
for (const [key, file] of Object.entries({
  spray:  "spray bottle.mp3",
  comb:   "combing hair.mp3",
  drip:   "dripping water.mp3",
  sigh:   "man sighing.mp3",
  pour:   "water pouring out of bottle.mp3",
  thrown: "throwing bottle.mp3",
  breath: "man heavy breathing.mp3",
  hum:    "man humming.mp3",
})) {
  N[key] = C(`n_${key}`);
  normalise(path.join(SFX, file), N[key]);
}

/* The four sprays inside the one recording, found by profiling it. */
slice(N.spray, C("spray_a"), 0.00, 0.34);
slice(N.spray, C("spray_b"), 0.38, 0.40);
slice(N.spray, C("spray_c"), 0.88, 0.48);
slice(N.spray, C("spray_d"), 1.48, 0.27);
/* Same bottle, killed at 0.13s — it starts and dies. */
slice(N.spray, C("sputter"), 0.88, 0.13, { fadeOut: 0.07 });

slice(N.comb,   C("comb"),    2.00, 1.60, { fadeIn: 0.10, fadeOut: 0.25 });
/*
 * THE DRIP DENSITY IS NOT UNIFORM IN THE SOURCE. Profiling it in half-second
 * windows: 10-14s is nearly empty (peaks -30 to -42) while 19-26s is busy
 * (peaks -17 to -29). A slice taken from 10s was mostly gaps, and raising its
 * gain ten decibels moved the mixed film by one — the level was never the
 * problem, the density was. So the bed is built by looping the BUSY seven
 * seconds.
 */
slice(N.drip, C("dripdense"), 19.0, 7.0, { fadeIn: 0.02, fadeOut: 0.02 });
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
  "-stream_loop", "7", "-i", C("dripdense"), "-t", "46",
  "-ar", String(SR), "-ac", "1", C("driploop")], { stdio: "inherit" });

/**
 * One length of drip bed, cut from a chosen point in the loop.
 *
 * THE DRIPPING IS NOT CONTINUOUS THROUGH THE FILM, and that is the point. It
 * runs where the WETNESS is the subject and stops where a PERFORMANCE is: the
 * relief sigh and the huffing are both solo close-ups whose whole content is a
 * man breathing, and water ticking away underneath turns a held emotional beat
 * into background ambience. Dropping out under them also makes the drip
 * RETURN afterwards, which lands harder than never having left.
 */
function dripSeg(name, ss, dur) {
  slice(C("driploop"), C(name), ss, dur, { fadeIn: 0.35, fadeOut: 0.55 });
}
dripSeg("dripA1", 0.0, 5.9);   dripSeg("dripA2", 13.0, 5.9);   // drenched + sputter, and that is all

slice(N.drip,   C("dripone"), 19.0, 0.45);

/**
 * THE BARBER HUMS WHILE HE SPRAYS, and stops the moment anything goes wrong.
 * It is the whole character in one sound: he is not malicious, he is having a
 * nice time. The humming runs under the first spray, the barrage and the
 * drenching, comes back when he starts again with bottle two, and returns for
 * the final spray — and it is absent everywhere he is puzzled or baffled.
 *
 * THE SOURCE IS ONLY 4.5s AND IT IS NEEDED FOR 8.6, so the second pass is
 * PITCH-SHIFTED rather than looped. Nobody hums the same phrase at exactly the
 * same pitch twice, so a shifted repeat sounds like more humming where an exact
 * repeat sounds like a tape.
 */
function humPass(name, rate, dur) {
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", N.hum,
    "-af", `asetrate=${SR}*${rate},aresample=${SR},atrim=0:${dur},` +
           `afade=t=in:st=0:d=0.30,afade=t=out:st=${(dur - 0.55).toFixed(2)}:d=0.55`,
    "-ar", String(SR), "-ac", "1", C(name)], { stdio: "inherit" });
}
humPass("hum_a", 1.00, 4.45);   // first spray + into the barrage
humPass("hum_b", 0.95, 3.95);   // the barrage + the drenching
humPass("hum_c", 1.04, 4.05);   // bottle two, spraying again
humPass("hum_d", 0.97, 3.00);   // the final spray
slice(N.sigh,   C("sigh"),    0.00, 1.30, { fadeOut: 0.35 });
slice(N.pour,   C("pour"),    0.80, 3.60, { fadeIn: 0.06, fadeOut: 0.45 });
slice(N.thrown, C("impact"),  0.00, 0.24);
slice(N.breath, C("breathe"), 0.00, 2.50, { fadeIn: 0.15, fadeOut: 0.40 });

/* No recording supplied for these — motion and air. */
noiseCue(C("cape"),   { dur: 0.70, lo: 200, hi: 2600, attack: 0.06, decay: 0.45 });
noiseCue(C("whoosh"), { dur: 0.40, lo: 300, hi: 3000, attack: 0.05, decay: 0.30 });
noiseCue(C("tone"),   { dur: 6.00, lo: 80,  hi: 900,  attack: 1.00, decay: 1.00 });
squeakCue(C("squeak"));

const SPRAYS = ["spray_a", "spray_b", "spray_c", "spray_d"];

/*
 * cue, start, gain, note — shot boundaries from cut_spray.js:
 *   cape 0.0 | comb 1.8 | spray1 3.4 | spray-more 5.0 | drenched 9.0 |
 *   empty 12.0 | relief 15.0 | BOTTLE TWO 17.8 | sad 21.3 | anger 23.5 |
 *   grab 25.5 | unscrew 26.9 | pour 29.1 | throw 32.5 | huff 34.3 |
 *   BOTTLE THREE 36.7 | final 38.7 | end 42.1
 */
const CUES = [
  ["cape",    0.25, 0.90, "the cape flaps down"],
  ["comb",    1.85, 0.90, "combing — real teeth"],

  /* Humming under every stretch where he is spraying and pleased with himself. */
  ["hum_a",   3.50, 0.42, "he hums while he works"],
  ["hum_b",   7.90, 0.40, ""],
  ["hum_c",  21.40, 0.40, "still humming with bottle two"],
  ["hum_d",  38.90, 0.38, "and for the last one"],

  ["spray_a", 3.70, 0.85, "first polite spray"],
  ["spray_b", 4.45, 0.80, "and a second"],

  /* Fourteen sprays accelerating, rotating through all four takes so the same
   * sample never lands twice running. */
  ...[4.90, 5.48, 5.82, 6.14, 6.44, 6.74, 7.02, 7.28, 7.53, 7.77, 8.00, 8.22, 8.43, 8.63]
    .map((t, i) => [SPRAYS[i % 4], t, 0.75 + i * 0.021, i === 0 ? "the barrage" : ""]),

  ["spray_c", 9.20, 0.70, "still going over the drenched shot"],
  ["spray_a", 10.30, 0.66, ""],
  ["spray_d", 11.20, 0.62, ""],

  /*
   * THE DRIPPING RUNS ONCE AND NEVER COMES BACK. Two layers, offset in the loop
   * so their gaps do not align, across the drenching and the dead bottle — then
   * it stops at the sigh and the film is dry for its whole second half.
   *
   * It reads as a sound that belongs to ONE PART OF THE STORY rather than as
   * room ambience. Carried through to the end it became wallpaper and stopped
   * meaning anything; ending it on the sigh makes it the sound of him being
   * soaked, which is over by then. Everything after is his.
   */
  ["dripA1",  9.00, 0.62, "dripping — the drenching, and only here"],
  ["dripA2",  9.00, 0.62, ""],

  ["sputter", 11.90, 1.00, "squeeze — it dies (pre-lapped)"],
  ["sputter", 13.05, 0.92, "again"],
  ["dripone", 13.55, 0.70, "two sad dribbles"],
  ["sputter", 14.30, 0.70, "and a shake"],

  ["sigh",    14.88, 0.95, "the relief (pre-lapped)"],

  ["whoosh",  19.40, 0.55, "the arm goes out"],
  ["impact",  20.65, 0.55, "a new bottle in hand"],

  ["spray_b", 21.70, 0.82, "and it starts again"],
  ["spray_c", 22.35, 0.82, ""],
  ["spray_a", 22.95, 0.82, ""],
  ["spray_d", 23.90, 0.78, ""],
  ["spray_b", 24.60, 0.78, ""],

  ["whoosh",  25.75, 0.75, "the snatch"],
  ["squeak",  27.35, 0.70, "the nozzle coming off"],

  /* The pour needs far more gain than the sprays. It is continuous water with
   * low average energy, where a spray is a dense transient — at the same number
   * the climax of the film came out 6 dB QUIETER than an ordinary spray. */
  ["pour",    28.95, 1.70, "the whole bottle over his own head"],

  ["whoosh",  32.38, 0.80, "the throw (pre-lapped)"],
  ["impact",  33.60, 1.00, "it lands out of frame"],

  ["breathe", 34.12, 1.00, "huffing (pre-lapped)"],

  ["whoosh",  37.30, 0.55, "the arm goes out again"],
  ["impact",  38.25, 0.50, "bottle three"],

  ["spray_c", 39.35, 0.90, "one more"],
];

const inputs = [];
const parts = [];
CUES.forEach(([name, start, gain, note], i) => {
  inputs.push("-i", C(name));
  parts.push(
    `[${i}:a]volume=${gain},adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)},` +
    `apad=whole_dur=${DUR}[p${i}]`
  );
  if (note) console.log(`  ${start.toFixed(2).padStart(5)}s  ${name.padEnd(8)} ${note}`);
});

inputs.push("-stream_loop", "-1", "-i", C("tone"));
const ti = CUES.length;
parts.push(`[${ti}:a]volume=0.14,atrim=0:${DUR},asetpts=N/SR/TB[p${ti}]`);

const track = path.join(work, "track.wav");
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", ...inputs,
  "-filter_complex",
  parts.join(";") + ";" + parts.map((_, i) => `[p${i}]`).join("") +
  `amix=inputs=${parts.length}:normalize=0,alimiter=limit=0.92[a]`,
  "-map", "[a]", "-t", String(DUR), "-ar", String(SR), "-ac", "2", track], { stdio: "inherit" });

/* Video is stream-copied — this pass only adds a track to a silent film. */
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
  "-i", FILM, "-i", track,
  "-map", "0:v", "-map", "1:a",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
  "-shortest", "-movflags", "+faststart", OUT], { stdio: "inherit" });

console.log(`\n${CUES.length} cues from ${Object.keys(N).length} recordings  ->  ${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(2)}MB`);
