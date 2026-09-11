#!/usr/bin/env node
/**
 * Mix a one-shot sound effect into a finished cut at a chosen moment.
 *
 *   node scripts/instagram/add_sfx.js --in=film.mp4 --out=film2.mp4 \
 *        --sfx="horror riser.mp3" --hit=5.067 --peak-at=5.9 --gain=0.5
 *
 *   --at=N        start the effect at N seconds (simple placement)
 *   --hit=N       the moment in the VIDEO the effect's key point lands on
 *   --peak-at=M   the point WITHIN the effect that is its key moment
 *
 * ALIGN THE PAYOFF, NOT THE START. A riser, a sting and an impact are all
 * defined by one instant — the top of the build, the hit — and that instant is
 * what has to sit on the cut. Placing these by their start time means doing
 * `start = cut - (wherever the payoff happens to be)` in your head every time,
 * and being a third of a second out is the difference between a riser that
 * breaks on the cut and one that breaks just after it, which reads as a
 * mistake rather than as tension.
 *
 * So: give it the moment in the film and the moment in the file, and it does
 * the subtraction. If that puts the start before zero it TRIMS THE HEAD of the
 * effect rather than sliding the payoff late — a riser missing its first
 * second still works, a riser that peaks after the cut does not.
 *
 * VIDEO IS STREAM-COPIED, same as brand_video.js and buzz_overlay.js. Only the
 * audio changes, so re-encoding the picture would be a generation loss for
 * nothing.
 *
 * IT DOES NOT DUCK THE ORIGINAL. amix with normalize=0 keeps the existing mix
 * at its own level and adds on top, with a limiter to catch the sum. With
 * normalisation on, amix divides by the input count, so adding one effect
 * would quietly drop the entire film by 6 dB — and the film getting quieter is
 * easy to mistake for the effect being loud enough.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const IN = arg("in");
const OUT = arg("out");
const SFX = arg("sfx");
const AT = arg("at", "");
const HIT = arg("hit", "");
const PEAK_AT = Number(arg("peak-at", 0));
/*
 * --trim and --len take a WINDOW out of the effect. A library cue is usually
 * longer than the shot it is going on and has a shape — a bed, a climax, a
 * decay — so the useful part is rarely the first N seconds. Head-trimming has
 * to be available on its own, not only as the side effect of a --hit that
 * lands before zero.
 */
const TRIM = Number(arg("trim", 0));
const LEN = arg("len", "");
/*
 * --tempo time-stretches the effect WITHOUT shifting its pitch. Below 1 is
 * slower and longer. This is for when a cue's build is shorter than the run of
 * picture it has to carry: a ten-second build dropped on thirteen seconds of
 * film peaks three seconds early and then decays through the moment it was
 * supposed to land on. Stretching moves the climax without moving the start.
 *
 * Do not reach for it to make a cue merely LAST longer — that is --len, or
 * letting the natural tail run. Stretching past about 0.7 starts to smear
 * transients, which a textural bed survives and an impact does not.
 */
const TEMPO = Number(arg("tempo", 1));
const GAIN = Number(arg("gain", 1.0));
const FADE_IN = Number(arg("fade-in", 0.05));
const FADE_OUT = Number(arg("fade-out", 0.35));

function durationOf(file) {
  const r = spawnSync(FF, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = (r.stderr || "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error(`could not read a duration from ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function main() {
  if (!IN || !OUT || !SFX) throw new Error("--in, --out and --sfx are all required");
  if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);
  if (!fs.existsSync(SFX)) throw new Error(`no such file: ${SFX}`);
  if (path.resolve(IN) === path.resolve(OUT)) {
    throw new Error("--out must differ from --in; refusing to overwrite the source");
  }
  if (AT === "" && HIT === "") throw new Error("give either --at or --hit");

  const sfxLen = durationOf(SFX);
  const filmLen = durationOf(IN);

  if (!(TEMPO >= 0.5 && TEMPO <= 2)) {
    throw new Error("--tempo must be between 0.5 and 2 (one atempo pass)");
  }

  /*
   * Work out where the effect starts and how much of its head to drop.
   *
   * TRIM and PEAK_AT are in the effect's OWN time; everything after the stretch
   * is in film time. So a --hit offset has to be divided by the tempo, or a
   * stretched cue lands early by exactly the amount it was stretched.
   */
  let start, trim = TRIM;
  if (HIT !== "") {
    start = Number(HIT) - (PEAK_AT - TRIM) / TEMPO;
    if (start < 0) { trim += -start * TEMPO; start = 0; }
  } else {
    start = Number(AT);
  }
  let playLen = Math.min((sfxLen - trim) / TEMPO, filmLen - start);
  if (LEN !== "") playLen = Math.min(playLen, Number(LEN));
  if (playLen <= 0) throw new Error("the effect lands entirely outside the film");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqsfx-"));
  const cue = path.join(tmp, "cue.wav");

  /* -ss trims in the effect's own time; the atrim after atempo is in film
   * time, which is why the length is not also set on the input. */
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(trim), "-i", SFX,
    "-af",
    (TEMPO !== 1 ? `atempo=${TEMPO},` : "") +
    `atrim=0:${playLen.toFixed(3)},asetpts=N/SR/TB,` +
    `volume=${GAIN},` +
    `afade=t=in:st=0:d=${FADE_IN},` +
    `afade=t=out:st=${Math.max(0, playLen - FADE_OUT).toFixed(3)}:d=${FADE_OUT},` +
    `adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)},` +
    `aformat=channel_layouts=stereo`,
    "-ar", "48000", "-ac", "2", cue,
  ], { stdio: "inherit" });

  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", IN, "-i", cue,
    "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]",
    "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", path.resolve(OUT),
  ], { stdio: "inherit" });

  console.log(`  ${path.basename(SFX)}  ${sfxLen.toFixed(2)}s`);
  if (trim > 0) console.log(`  head trimmed ${trim.toFixed(2)}s so the payoff lands on time`);
  if (TEMPO !== 1) {
    console.log(`  stretched x${(1 / TEMPO).toFixed(3)} (tempo ${TEMPO}) — ${sfxLen.toFixed(2)}s of cue becomes ${(sfxLen / TEMPO).toFixed(2)}s`);
  }
  console.log(`  plays ${start.toFixed(2)}s -> ${(start + playLen).toFixed(2)}s at gain ${GAIN}`);
  if (HIT !== "") console.log(`  its ${PEAK_AT}s mark lands on ${Number(HIT).toFixed(3)}s`);
  console.log(`  video stream-copied  ->  ${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(1)}MB`);
}

try { main(); } catch (e) { console.error(e.message); process.exit(1); }
