#!/usr/bin/env node
/**
 * Synthesise the cues the stick-figure horror short needs.
 *
 *   node scripts/instagram/sfx.js --out experiments/sfx
 *
 * WHY SYNTHESISED AND NOT GENERATED. Higgsfield's sound-effect model is
 * restricted to its game pipeline and must not be used for standalone audio, so
 * there is no AI route here. Synthesis is the same bargain the rest of this
 * animator takes: deterministic, free, repeatable, and ours. The same cue comes
 * out identical every run, which a generated one never would.
 *
 * WHERE IT IS HONESTLY WEAK. Synthesis is good at tones, swells and stings and
 * poor at real mechanical noise. The clipper hum below is a stack of harmonics
 * that reads as "electric motor", not as YOUR clippers — and a barber has
 * clippers and a phone. Thirty seconds of real recording beats anything in this
 * file for the two clipper cues; the rest are better synthesised than recorded.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const SR = 48000;

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const out = arg("out", "experiments/sfx");
fs.mkdirSync(out, { recursive: true });

/** Render one cue from an ffmpeg filtergraph that ends in [a]. */
function cue(name, seconds, graph) {
  const file = path.join(out, `${name}.wav`);
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-filter_complex", graph,
    "-map", "[a]", "-t", String(seconds), "-ar", String(SR), "-ac", "1", file,
  ], { stdio: "inherit" });
  console.log(`  ${name.padEnd(16)} ${seconds}s`);
  return file;
}

/*
 * A clipper is a small motor: a low fundamental with strong odd harmonics and a
 * little broadband hiss from the blade. The GUARD is plastic over the teeth, so
 * it damps the top end — which is the whole trick here. Guarded and bare are
 * the SAME oscillator with different high-harmonic weight and a different
 * low-pass, so the moment the guard falls is a timbre change on a continuous
 * note rather than one sound stopping and another starting. A cut would read as
 * an edit; a change of colour reads as something going wrong.
 */
const buzz = (h3, h5, hiss) =>
  `aevalsrc='0.34*sin(2*PI*118*t)+${h3}*sin(2*PI*354*t)+${h5}*sin(2*PI*590*t)':s=${SR}:d=30[osc];` +
  `anoisesrc=c=pink:r=${SR}:a=${hiss}[hs];` +
  `[osc][hs]amix=inputs=2:weights=1 1[mix]`;

cue("clipper-guarded", 4,
  `${buzz(0.10, 0.03, 0.05)};[mix]lowpass=f=2200,volume=0.9[a]`);

cue("clipper-bare", 4,
  `${buzz(0.20, 0.11, 0.13)};[mix]lowpass=f=7000,highpass=f=80,volume=1.0[a]`);

/*
 * The guard hitting tile. Two short noise bursts a few milliseconds apart — one
 * strike and one bounce — band-passed to the hard, hollow region a small plastic
 * part actually occupies. A single burst reads as a click; the bounce is what
 * makes it read as an object.
 */
cue("guard-drop", 0.9,
  `anoisesrc=c=white:r=${SR}:a=0.9:d=0.9[n];` +
  `[n]bandpass=f=2400:width_type=h:w=1800,` +
  `volume='if(lt(t,0.012),t/0.012,exp(-28*(t-0.012)))+0.45*if(between(t,0.11,0.122),(t-0.11)/0.012,if(gt(t,0.122),exp(-34*(t-0.122)),0))':eval=frame[a]`);

/*
 * The dread. A slow rise built from three detuned sines a semitone apart — the
 * beating between them is the unease; a single clean tone just sounds like a
 * test signal. Volume and brightness climb together, because a swell that only
 * gets louder reads as a fade-in rather than as tension.
 */
cue("string-rise", 3.0,
  `aevalsrc='0.30*sin(2*PI*196*t)+0.26*sin(2*PI*207.65*t)+0.22*sin(2*PI*220*t)':s=${SR}:d=3[o];` +
  `[o]volume='pow(t/3,2.0)':eval=frame,` +
  `highpass=f=90,` +
  `aformat=sample_fmts=fltp,` +
  `afade=t=out:st=2.86:d=0.14[a]`);

/*
 * The sting. Instant attack, dissonant, gone in under a second. It marks the
 * frame the client's eyes change, so anything with an audible ramp is late.
 */
cue("sting", 0.7,
  `aevalsrc='0.5*sin(2*PI*880*t)+0.4*sin(2*PI*1244.5*t)+0.25*sin(2*PI*1760*t)':s=${SR}:d=0.7[o];` +
  `anoisesrc=c=white:r=${SR}:a=0.35:d=0.7[n];` +
  `[o][n]amix=inputs=2:weights=1 0.6[m];` +
  `[m]volume='exp(-7*t)':eval=frame,highpass=f=300[a]`);

/* Room tone. Silence that is not digital zero — a dead track reads as a fault. */
cue("room-tone", 4,
  `anoisesrc=c=brown:r=${SR}:a=0.012:d=4[n];[n]lowpass=f=500[a]`);

console.log(`\n  -> ${out}`);
