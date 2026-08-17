#!/usr/bin/env node
/**
 * Synthesises a breaking-news music bed with ffmpeg. No sample, no download,
 * no rights holder — every waveform here is generated from an equation.
 *
 * WHY SYNTHESISE RATHER THAN SOURCE A TRACK. Background music on a published
 * video is a licence question, and it is the one asset class where getting it
 * wrong is expensive: YouTube's Content ID matches audio automatically, and a
 * match can demonetise or block a video without anyone reviewing it. Pulling a
 * "free" news-sting off the web and hoping is not a plan. This produces
 * something we unambiguously own, which makes it safe for a SAMPLE.
 *
 * APPROVED FOR PRODUCTION USE (site owner, 2026-08-17). It was written as a
 * placeholder and the owner listened and kept it, which makes it the channel's
 * sound rather than a stand-in. Do not "upgrade" it to a licensed track on the
 * assumption it was temporary.
 *
 * The licensing advantage is now a real one rather than a consolation: because
 * every waveform is generated here, there is no Content ID surface at all. A
 * licensed bed would reintroduce a matching risk this has none of.
 *
 * If a richer bed is ever wanted, render_short_video.js takes any file via
 * --audio — add to it rather than replacing this.
 *
 * THE ARRANGEMENT, such as it is:
 *   PULSE   82 Hz hit on every beat, exponential decay. The urgency.
 *   SUB     55 Hz drone under everything, very low. The weight.
 *   TICK    1800 Hz click on the off-beat, fast decay. The clock.
 *   RISER   a slow sweep that arrives at the end, timed to land on the card's
 *           final state so the music resolves when the question appears.
 *
 * BPM 120 gives a beat every 0.5s, which lines up with the card's reveals
 * without anyone having to sync anything by hand.
 *
 * Usage:
 *   node scripts/make_news_bed.js                       # 8s, default
 *   node scripts/make_news_bed.js --seconds 15 --out bed15.m4a
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", "Shorts");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

function main() {
  const seconds = Number(arg("seconds", 8));
  const out = path.join(OUT_DIR, arg("out", "news-bed.m4a"));
  const beat = 0.5; // 120 BPM

  fs.mkdirSync(OUT_DIR, { recursive: true });

  /**
   * `mod(t,beat)` restarts the decay envelope on every beat, so one expression
   * produces a repeating hit without any sequencing. `exp(-k*x)` is the decay;
   * bigger k is a shorter, tighter sound.
   */
  const pulse = `aevalsrc='0.55*sin(2*PI*82*t)*exp(-7*mod(t\\,${beat}))':d=${seconds}:s=48000`;
  const sub = `aevalsrc='0.22*sin(2*PI*55*t)':d=${seconds}:s=48000`;
  const tick = `aevalsrc='0.13*sin(2*PI*1800*t)*exp(-55*mod(t+${beat / 2}\\,${beat}))':d=${seconds}:s=48000`;
  // Sweeps up over the last third and lands on the final beat.
  const riser = `aevalsrc='0.16*sin(2*PI*(220+520*max(0\\,(t-${(seconds * 0.62).toFixed(2)})/${(seconds * 0.38).toFixed(2)}))*t)*max(0\\,(t-${(seconds * 0.62).toFixed(2)})/${(seconds * 0.38).toFixed(2)})':d=${seconds}:s=48000`;

  const filter =
    `${pulse}[p];${sub}[s];${tick}[k];${riser}[r];` +
    `[p][s][k][r]amix=inputs=4:duration=first:dropout_transition=0[m];` +
    // Lowpass tames the synthetic edge; the fades stop it starting and ending
    // on a hard discontinuity, which reads as a click.
    `[m]lowpass=f=7000,volume=1.6,afade=t=in:st=0:d=0.15,afade=t=out:st=${(seconds - 0.5).toFixed(2)}:d=0.5[a]`;

  execFileSync(
    ffmpeg,
    ["-y", "-filter_complex", filter, "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-t", String(seconds), out],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`  wrote  ${path.relative(process.cwd(), out)}  ${seconds}s  ${kb} KB`);
  console.log(`  Synthesised here — no third-party rights. Licence a real bed before production.`);
}

if (require.main === module) main();
