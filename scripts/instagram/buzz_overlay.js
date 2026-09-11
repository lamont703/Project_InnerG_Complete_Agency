#!/usr/bin/env node
/**
 * Lay a mosquito track under a finished cut.
 *
 *   node scripts/instagram/buzz_overlay.js --in=cut.mp4 --out=cut-buzz.mp4
 *   node scripts/instagram/buzz_overlay.js --in=... --gain=1.4 --preview=1
 *
 * COSTS NOTHING. This is ffmpeg oscillators, not a generated sound effect. No
 * API, no credits. Worth stating because the obvious way to get an insect
 * sound is to ask a model for one, and the Higgsfield audio models in this
 * account are scoped to the game pipeline and must not be used for standalone
 * audio.
 *
 * VIDEO IS STREAM-COPIED. Only the audio changes, so there is no reason to
 * re-encode the picture — it stays bit-identical and the run takes seconds
 * instead of a minute. That also means this can be layered on top of a branded
 * cut without a second generation loss.
 *
 * THE CUES ARE FOR ONE SPECIFIC CUT. The times below were read off "Full
 * edited draft.MP4" by sampling frames and finding where the insect is in
 * frame. RE-EDIT THE FILM AND THESE ARE WRONG — they are not derived from
 * anything the file carries, so nothing will complain. Re-map them by pulling
 * frames if the cut moves.
 *
 * WHY IT GOES QUIET WHEN THE MOSQUITO LANDS. The buzz is the insect's wings,
 * not the insect. On the shoulder it drops to a fraction of the flying level,
 * and the sudden absence is what makes the shot read as "it has settled in and
 * is staying". A continuous buzz across the whole film would be an ambience;
 * cued to the wings, it is a character.
 *
 * ONE BED, SLICED. Every cue takes a different slice of the same 20-second
 * oscillator bed, so each one lands on a different part of the slow drift and
 * no two are identical. Generating a separate bed per cue would give the same
 * variety for more code, and looping ONE short slice would give an obvious
 * repeat.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");
const SR = 48000;

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const IN = arg("in");
const OUT = arg("out");
const GAIN = Number(arg("gain", 1.0));        // scales every cue at once
const PREVIEW = arg("preview", "0") !== "0";  // write the bare mosquito track too
const VOICE = arg("voice", "classic");
const AUDITION = arg("audition", "");         // "start,length" — render every voice
const SOURCE = arg("source", "");             // a real recording; beats every synth voice
const HP = Number(arg("hp", 150));            // rumble filter for the recording
const TARGET_PEAK = Number(arg("peak", -3));  // dBFS the cleaned bed is normalised to

/*
 * SIX BUZZES, and they differ on the things the ear actually sorts insects by.
 *
 *   f     fundamental. Under ~450 it stops being a mosquito and becomes a fly.
 *   vr/vd vibrato rate and depth — the WINGBEAT. This is the one parameter
 *         that decides whether it reads as an insect or as a test tone.
 *   dr/dd a slow pitch drift, which is the insect moving around the room.
 *   ar    amplitude LFO. Deliberately never equal to dr: when pitch and volume
 *         swell together the ear hears a siren, not a thing flying past.
 *   h2/h3 harmonic gains, which carry the rasp.
 *   nz    broadband noise mixed in. Real wings are not a pure tone, and a
 *         little noise is the difference between "buzzing" and "beeping".
 *   hp/lp the band. Everything must stay clear of the clipper hum below.
 */
const VOICES = {
  /* Where we started: middle of the road, sits under music without fighting. */
  classic: { f: 600, vr: 6.2, vd: 50, dr: 0.23, dd: 90, ar: 0.31, h2: 0.30, h3: 0.10, nz: 0.00, hp: 400, lp: 3200 },

  /* Thin and high. The one that reads as "annoying" fastest, and the one that
   * survives a phone speaker best, because there is nothing down low to lose. */
  whine:   { f: 880, vr: 8.0, vd: 70, dr: 0.27, dd: 120, ar: 0.37, h2: 0.16, h3: 0.05, nz: 0.00, hp: 600, lp: 4200 },

  /* Fat and low. Closer to a bluebottle — more comic weight, more physical
   * presence, but it starts to muddy against the clipper hum. */
  fat:     { f: 420, vr: 4.6, vd: 38, dr: 0.19, dd: 60, ar: 0.26, h2: 0.55, h3: 0.28, nz: 0.00, hp: 260, lp: 2600 },

  /* Big slow pitch sweeps. Strongest sense of something flying PAST you rather
   * than hovering — best on the shots where it crosses the frame. */
  doppler: { f: 640, vr: 6.6, vd: 55, dr: 0.50, dd: 210, ar: 0.44, h2: 0.28, h3: 0.09, nz: 0.00, hp: 380, lp: 3400 },

  /* Noise in the wings. The most naturalistic of the six — least like a
   * synthesiser, but it also hides more easily under a busy mix. */
  raspy:   { f: 560, vr: 6.0, vd: 46, dr: 0.21, dd: 80, ar: 0.29, h2: 0.34, h3: 0.14, nz: 0.30, hp: 420, lp: 3000 },

  /* Fast erratic flutter. Broadest, most Looney-Tunes reading — matches the
   * stick-figure drawing more than it matches an actual insect. */
  cartoon: { f: 720, vr: 11.0, vd: 95, dr: 0.62, dd: 130, ar: 0.85, h2: 0.42, h3: 0.20, nz: 0.06, hp: 450, lp: 3800 },
};

/*
 * start, end, gain, slice — where in the 20s bed to take this cue from, note
 *
 * gain is peak-relative: the bed is normalised, so 0.30 peaks near -20 dBFS
 * against a mix whose own mean sits at -27 dB.
 */
const CUES = [
  [ 5.20, 10.20, 0.30,  0.0, "arrives and circles the barber"],
  [21.20, 22.80, 0.34,  6.5, "the swat — agitated, close"],
  [26.00, 31.00, 0.07, 13.0, "PERCHED on the shoulder — wings only, barely there"],
  [31.00, 33.80, 0.22,  3.2, "hovering at the cheek for the kiss"],
  [33.80, 43.90, 0.30,  9.0, "off the cheek, orbiting his head to the end"],
];

function dimensionsAndAudio(file) {
  let stderr = "";
  try {
    execFileSync(FF, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    stderr = (e.stderr || "").toString();
  }
  const dur = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return {
    duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : null,
    hasAudio: /Stream #\d+:\d+.*: Audio:/.test(stderr),
  };
}

/** Duration of a media file in seconds. */
function durationOf(file) {
  const d = dimensionsAndAudio(file).duration;
  if (!d) throw new Error(`could not read a duration from ${file}`);
  return d;
}

/**
 * Peak level of a file in dBFS, read back off volumedetect.
 *
 * spawnSync, not execFileSync: volumedetect writes its report to stderr and
 * EXITS ZERO, so reading stderr only out of a thrown exception (which is what
 * dimensionsAndAudio can get away with, because `ffmpeg -i` with no output
 * always fails) silently yields an empty string and no measurement.
 */
function peakDb(file) {
  const r = spawnSync(FF, ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" });
  const m = (r.stderr || "").match(/max_volume:\s*(-?[\d.]+) dB/);
  if (!m) throw new Error(`could not measure the level of ${file}`);
  return Number(m[1]);
}

/**
 * Build a long bed out of a SHORT real recording.
 *
 * The problem this solves: a library sound effect is a few seconds long and
 * the longest cue here is ten. Looping it plainly puts an identical copy of
 * the same buzz back-to-back, and a repeat that exact is the one thing the ear
 * catches immediately — it stops sounding like an insect and starts sounding
 * like a sample.
 *
 * So the copies are PITCH-VARIED and CROSSFADED. asetrate shifts pitch and
 * speed together, which for a flying insect is not an artefact — it is the
 * thing moving nearer and further. Five copies at five rates crossfaded into
 * one another give roughly twenty seconds with no identical stretch in it, and
 * each cue then takes a different slice on top of that.
 *
 * CLEANED, NOT SQUASHED. A highpass takes the handling rumble that sits just
 * under the buzz, and the gain is a single measured number rather than a
 * compressor, because the near-and-far movement in the recording is the reason
 * it beats the synthesis. Levelling it out would throw away what we bought.
 */
function makeBedFromSource(src, outFile) {
  if (!fs.existsSync(src)) throw new Error(`no such file: ${src}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqsrc-"));
  const rates = [1.00, 1.09, 0.93, 1.05, 0.96];
  const copies = rates.map((r, i) => {
    const f = path.join(tmp, `c${i}.wav`);
    execFileSync(FF, [
      "-y", "-hide_banner", "-loglevel", "error", "-i", src,
      "-af", `highpass=f=${HP},asetrate=44100*${r},aresample=${SR},aformat=channel_layouts=stereo`,
      "-ar", String(SR), "-ac", "2", f,
    ], { stdio: "inherit" });
    return f;
  });

  const XF = 0.6;
  const ins = [];
  copies.forEach((c) => ins.push("-i", c));
  let graph = "", prev = "[0:a]";
  for (let i = 1; i < copies.length; i++) {
    const out = i === copies.length - 1 ? "[bed]" : `[x${i}]`;
    graph += `${prev}[${i}:a]acrossfade=d=${XF}:c1=tri:c2=tri${out};`;
    prev = `[x${i}]`;
  }
  const joined = path.join(tmp, "joined.wav");
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error", ...ins,
    "-filter_complex", graph.replace(/;$/, ""), "-map", "[bed]",
    "-ar", String(SR), "-ac", "2", joined,
  ], { stdio: "inherit" });

  const measured = peakDb(joined);
  const boost = TARGET_PEAK - measured;
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error", "-i", joined,
    "-af", `volume=${boost.toFixed(2)}dB,alimiter=limit=0.98`,
    "-ar", String(SR), "-ac", "2", outFile,
  ], { stdio: "inherit" });

  console.log(`  source: ${path.basename(src)}`);
  console.log(`  highpass ${HP}Hz, ${rates.length} copies at rates ${rates.join("/")}, ${XF}s crossfades`);
  console.log(`  measured peak ${measured.toFixed(1)} dB -> boosted ${boost >= 0 ? "+" : ""}${boost.toFixed(1)} dB to ${TARGET_PEAK} dB\n`);
  return boost;
}

/**
 * Render a 20s oscillator bed for one named voice.
 *
 * The three layers, and why each is there:
 *  - the FAST vibrato is the wingbeat, and it alone separates insect from tone
 *  - the SLOW drift moves it around the room so a five-second cue is not static
 *  - the amplitude LFO, at a rate that never matches the drift, makes it
 *    approach and recede instead of swelling like a siren
 */
function makeBed(name, outFile, seconds = 20) {
  const v = VOICES[name];
  if (!v) throw new Error(`unknown voice "${name}" — have: ${Object.keys(VOICES).join(", ")}`);

  const f = `${v.f}+${v.vd}*sin(2*PI*${v.vr}*t)+${v.dd}*sin(2*PI*${v.dr}*t)`;
  const tone =
    `0.85*sin(2*PI*(${f})*t)` +
    `+${v.h2}*sin(2*PI*(2*(${f}))*t)` +
    `+${v.h3}*sin(2*PI*(3*(${f}))*t)`;
  /* Noise is multiplied by the same vibrato so it flutters with the wings
   * rather than sitting behind them as a separate hiss. */
  const noise = v.nz > 0
    ? `+${v.nz}*(random(0)*2-1)*(0.6+0.4*sin(2*PI*${v.vr}*t))`
    : "";
  const expr = `(0.30+0.22*sin(2*PI*${v.ar}*t))*(${tone}${noise})`;

  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-filter_complex",
    `aevalsrc='${expr}':s=${SR}:d=${seconds}[o];` +
    `[o]highpass=f=${v.hp},lowpass=f=${v.lp},dynaudnorm=f=200:g=5,volume=0.9[a]`,
    "-map", "[a]", "-t", String(seconds), "-ar", String(SR), "-ac", "1", outFile,
  ], { stdio: "inherit" });
  return v;
}

/**
 * Render the same excerpt of the film once per voice, back to back, so they
 * can be compared in one file against real picture. Judging a buzz on its own
 * is misleading — what matters is how it sits under the mix.
 */
function audition() {
  const [startS, lenS] = AUDITION.split(",").map(Number);
  const start = startS || 5.2, len = lenS || 5.0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqaud-"));
  const names = Object.keys(VOICES);
  const pieces = [];

  names.forEach((name, i) => {
    const bed = path.join(tmp, `${name}.wav`);
    makeBed(name, bed, len + 2);
    const seg = path.join(tmp, `seg${i}.mp4`);
    execFileSync(FF, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", String(start), "-t", String(len), "-i", IN,
      "-i", bed,
      "-filter_complex",
      `[1:a]volume=${(0.30 * GAIN).toFixed(3)},afade=t=in:st=0:d=0.3,` +
      `afade=t=out:st=${(len - 0.4).toFixed(2)}:d=0.4[b];` +
      `[0:a][b]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]`,
      "-map", "0:v", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", seg,
    ], { stdio: "inherit" });
    pieces.push(seg);
    console.log(`  ${i + 1}. ${name}`);
  });

  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, pieces.map((p) => `file '${p}'`).join("\n") + "\n");
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", list,
    "-c", "copy", "-movflags", "+faststart", path.resolve(OUT),
  ], { stdio: "inherit" });
  console.log(`\n  ${names.length} voices x ${len}s from ${start}s  ->  ${OUT}`);
}

function main() {
  if (!IN || !OUT) throw new Error("--in and --out are both required");
  if (AUDITION) {
    if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);
    return audition();
  }
  if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);
  if (path.resolve(IN) === path.resolve(OUT)) {
    throw new Error("--out must differ from --in; refusing to overwrite the source");
  }

  const { duration, hasAudio } = dimensionsAndAudio(IN);
  if (!hasAudio) throw new Error(`${IN} has no audio track to mix into`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqbuzz-"));
  const bed = path.join(tmp, "bed.wav");

  /*
   * The buzz, in three layers.
   *
   *  - a FAST vibrato (~6.2 Hz) is the wingbeat wobble, and it is the single
   *    thing that separates "mosquito" from "test tone".
   *  - a SLOW drift (~0.23 Hz) on the same fundamental moves it around the
   *    room, so a five-second cue does not sit on one pitch.
   *  - an amplitude LFO at a different, non-harmonic rate (0.31 Hz) makes it
   *    approach and recede. Matching those two rates would make the pitch and
   *    volume swell together, which reads as a siren rather than an insect.
   *
   * Second and third harmonics carry the rasp. Highpass at 400 keeps it clear
   * of the clipper hum; lowpass at 3200 takes off the fizz that would fight
   * the music.
   */
  if (SOURCE) makeBedFromSource(SOURCE, bed);
  else makeBed(VOICE, bed);

  /* Each cue is a slice of the bed, faded, level-set and delayed into place. */
  const inputs = [];
  const parts = [];
  const bedLen = durationOf(bed);
  CUES.forEach(([start, end, gain, slice, note], i) => {
    /* aloop below covers any shortfall, but starting a slice past the end of
     * the bed yields an empty stream and a silent cue with no error. */
    const off = Math.min(slice, Math.max(0, bedLen - 1));
    inputs.push("-ss", String(off), "-i", bed);
    const dur = end - start;
    const g = (gain * GAIN).toFixed(4);
    /* Long fades. A mosquito does not start and stop, it arrives and leaves,
     * and a hard edge on a 600 Hz tone clicks. */
    const fin = Math.min(0.35, dur / 3).toFixed(3);
    const fout = Math.min(0.45, dur / 3).toFixed(3);
    parts.push(
      `[${i}:a]aloop=loop=-1:size=2e9,atrim=0:${dur.toFixed(3)},asetpts=N/SR/TB,` +
      `volume=${g},afade=t=in:st=0:d=${fin},` +
      `afade=t=out:st=${(dur - fout).toFixed(3)}:d=${fout},` +
      `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)},` +
      `apad=whole_dur=${(duration || 44).toFixed(3)}[p${i}]`
    );
    console.log(`  ${start.toFixed(2)}s -> ${end.toFixed(2)}s  gain ${g}  ${note}`);
  });

  const track = path.join(tmp, "mosquito.wav");
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error", ...inputs,
    "-filter_complex",
    parts.join(";") + ";" + CUES.map((_, i) => `[p${i}]`).join("") +
    `amix=inputs=${CUES.length}:normalize=0,volume=1.0[a]`,
    "-map", "[a]", "-t", String(duration || 44), "-ar", String(SR), "-ac", "2", track,
  ], { stdio: "inherit" });

  if (PREVIEW) {
    const p = OUT.replace(/\.[^.]+$/, "") + "-mosquito-only.wav";
    fs.copyFileSync(track, p);
    console.log(`  bare mosquito track -> ${p}`);
  }

  /*
   * normalize=0 on the mix is what keeps the original at its own level. With
   * normalisation on, amix divides every input by the input count, so adding a
   * quiet insect would drop the whole film by 6 dB — the film gets quieter and
   * the buzz sounds like it worked.
   */
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", IN, "-i", track,
    "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
    "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", path.resolve(OUT),
  ], { stdio: "inherit" });

  const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);
  console.log(`\n  ${CUES.length} cues, video stream-copied  ->  ${OUT}  ${mb}MB`);
}

try { main(); } catch (e) { console.error(e.message); process.exit(1); }
