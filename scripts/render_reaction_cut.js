#!/usr/bin/env node
/**
 * REACTION CUT — assemble the long-form video from the spec.
 *
 *   node scripts/render_reaction_cut.js --proof   # 480x270, fast, for timing
 *   node scripts/render_reaction_cut.js           # 1920x1080 final
 *
 * READS reaction.spec.json, WHICH IS THE ARTIFACT'S TIMELINE. Nothing here
 * decides what goes where. Change the edit in the spec, or change the artifact
 * and then the spec; this file only executes.
 *
 * THE AVATAR CLIPS ARE PINNED AND EVERYTHING ELSE FLOWS AROUND THEM. Each
 * avatar file contains him speaking an exact slice of its beat's narration, so
 * if it lands even half a second off, the lips stop matching the voice — and
 * that is the one defect a viewer notices instantly. The non-avatar clips in a
 * beat exist partly to land the avatar on its mark, so the assert below
 * compares each avatar's computed offset against the `in` recorded in the
 * segments list and refuses to render on a mismatch.
 *
 * NORMALISE BEFORE CONCAT, ALWAYS. The sources are 1920x1080 and 3840x2160
 * Pixabay clips, 1920x1080 HeyGen renders, 1920x1080 HyperFrames output and one
 * PNG still, at assorted frame rates. The concat demuxer does not resample: fed
 * mixed geometry it produces a file that plays, with clips stretched or the
 * stream breaking partway. So every clip is re-encoded to one geometry and one
 * frame rate first, and only then joined.
 *
 * MUSIC IS FIVE TRACKS SEQUENCED, NOT ONE LOOPED. Measured, not chosen by name
 * — see scripts/analyze_music_beds.js. Each is loudnorm'd to the spec's target
 * so a quiet track and a loud one sit at the same level under the voice, and
 * the cuts land on beat boundaries so the bed changes where the argument does.
 *
 * --proof RENDERS AT 480x270 WITH ultrafast. Timing, sync and clip order are
 * all visible at that size and it costs a fraction of the wall clock. Check the
 * proof before spending twenty minutes on a full encode.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const ROOT = path.join("reference", "reaction-one-person-ai");
const SPEC = path.join(ROOT, "reaction.spec.json");
const NARR = path.join(ROOT, "script", "narration");
const OUT = path.join(ROOT, "cut");

const PROOF = process.argv.includes("--proof");
const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));
const E = spec.edit;
const W = PROOF ? 480 : E.width;
const H = PROOF ? 270 : E.height;

const run = (args, label) => {
  const r = spawnSync(FF, ["-nostdin", "-y", "-hide_banner", "-loglevel", "error", ...args],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${label} failed:\n${(r.stderr || "").slice(-1200)}`);
};
const dur = (f) => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", f]).toString().trim());

/* ---------- validate before doing any work ---------- */

const missing = [];
for (const b of E.beats) for (const c of b.clips) {
  const p = path.join(ROOT, c.src);
  if (!fs.existsSync(p)) missing.push(c.src);
}
for (const m of spec.edit.music.segments) {
  const p = path.join(E.music.dir, m.file);
  if (!fs.existsSync(p)) missing.push(m.file);
}
for (const b of E.beats) {
  const w = path.join(NARR, `${b.beat}.wav`);
  if (!fs.existsSync(w)) missing.push(`${b.beat}.wav`);
}
if (missing.length) { console.error("missing sources:\n  " + missing.join("\n  ")); process.exit(1); }

/* Beat clip sums, and the avatar pin — both are silent failures otherwise. */
const pins = Object.fromEntries(spec.segments.map((s) => [`${s.beat}:${path.basename(s.id)}`, s.in]));
let bad = 0;
for (const b of E.beats) {
  const total = b.clips.reduce((a, c) => a + (c.out - c.in), 0);
  if (Math.abs(total - b.dur) > 0.05) { console.error(`  ${b.beat}: clips ${total.toFixed(2)}s vs narration ${b.dur}s`); bad++; }
  let at = 0;
  for (const c of b.clips) {
    if (c.src.startsWith("avatar/")) {
      const id = path.basename(c.src, ".mp4");
      const want = pins[`${b.beat}:${id}`];
      if (want === undefined) { console.error(`  ${b.beat}: ${id} is not in spec.segments`); bad++; }
      else if (Math.abs(at - want) > 0.05) {
        console.error(`  ${b.beat}: ${id} lands at ${at.toFixed(2)}s but its audio starts at ${want}s — lips would drift`);
        bad++;
      }
    }
    at += c.out - c.in;
  }
}
if (bad) { console.error("\nRefusing to render.\n"); process.exit(1); }

/* ---------- build ---------- */

const work = fs.mkdtempSync(path.join(os.tmpdir(), "reaction-cut-"));
fs.mkdirSync(OUT, { recursive: true });
const VF = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${E.fps},format=yuv420p`;
const ENC = PROOF ? ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "30"]
                  : ["-c:v", "libx264", "-preset", "medium", "-crf", "18"];

console.log(`\n${PROOF ? "PROOF" : "FINAL"} ${W}x${H} @ ${E.fps}fps\n`);

/*
 * 1. narration: nine takes joined with a beat of air between them.
 *
 * DECODE EVERY PIECE TO ONE FORMAT FIRST. The narration files are named .wav
 * and are MP3 INSIDE — HeyGen's audio_url serves mp3 and the download script
 * chose the extension. So a pcm silence generated to sit between them does not
 * match, and the concat DEMUXER does not complain about that: it dropped all
 * eight gaps and returned 8:29 instead of 8:33, with nothing on stderr. The
 * video happened to be built without gaps too, so even the length assert below
 * agreed with it.
 *
 * The extension is worth distrusting generally. Re-encoding each input to one
 * explicit pcm form costs a second and makes the join deterministic.
 */
const AR = "48000";
const norm = [];
for (const [i, b] of E.beats.entries()) {
  const seg = path.join(work, `n${i}.wav`);
  run(["-i", path.join(NARR, `${b.beat}.wav`), "-c:a", "pcm_s16le", "-ar", AR, "-ac", "1", seg], `narration ${b.beat}`);
  norm.push(seg);
}
const silence = path.join(work, "gap.wav");
run(["-f", "lavfi", "-i", `anullsrc=r=${AR}:cl=mono`, "-t", String(E.beatGapSec),
  "-c:a", "pcm_s16le", "-ar", AR, "-ac", "1", silence], "silence");
const nlist = path.join(work, "narr.txt");
fs.writeFileSync(nlist, norm.flatMap((f, i) =>
  [`file '${f}'`, ...(i < norm.length - 1 ? [`file '${path.resolve(silence)}'`] : [])]
).join("\n"));
const narration = path.join(work, "narration.wav");
run(["-f", "concat", "-safe", "0", "-i", nlist, "-c:a", "pcm_s16le", "-ar", AR, "-ac", "1", narration], "narration concat");

/* The gaps are the whole reason this step is fiddly, so prove they are there. */
{
  const want = E.beats.reduce((a, b) => a + b.dur, 0) + E.beatGapSec * (E.beats.length - 1);
  const got = dur(narration);
  if (Math.abs(got - want) > 0.3) {
    throw new Error(`narration is ${got.toFixed(2)}s, expected ${want.toFixed(2)}s — the inter-beat gaps did not survive the concat`);
  }
}
const NARR_LEN = dur(narration);
console.log(`  narration  ${Math.floor(NARR_LEN / 60)}:${String(Math.round(NARR_LEN % 60)).padStart(2, "0")}`);

/* 2. video: normalise every clip, then join */
const vlist = [];
let n = 0;
for (const b of E.beats) {
  for (const c of b.clips) {
    const seg = path.join(work, `v${String(n++).padStart(3, "0")}.mp4`);
    const src = path.join(ROOT, c.src);
    const len = (c.out - c.in).toFixed(3);
    if (c.still) {
      run(["-loop", "1", "-t", len, "-i", src, "-vf", VF, ...ENC, "-an", seg], `still ${c.src}`);
    } else {
      run(["-ss", String(c.in), "-t", len, "-i", src, "-vf", VF, ...ENC, "-an", seg], `clip ${c.src}`);
    }
    vlist.push(seg);
  }
  /*
   * A held frame across the gap, not black. The narration pauses between beats;
   * cutting to black for half a second there reads as a mistake rather than a
   * breath, and it happens eight times.
   */
  if (b !== E.beats[E.beats.length - 1]) {
    const last = vlist[vlist.length - 1];
    const hold = path.join(work, `hold${n++}.mp4`);
    run(["-sseof", "-0.04", "-i", last, "-vf", `${VF},tpad=stop_mode=clone:stop_duration=${E.beatGapSec}`,
      "-t", String(E.beatGapSec), ...ENC, "-an", hold], "gap hold");
    vlist.push(hold);
  }
  process.stdout.write(".");
}
console.log("");
const vtxt = path.join(work, "v.txt");
fs.writeFileSync(vtxt, vlist.map((f) => `file '${f}'`).join("\n"));
const videoOnly = path.join(work, "video.mp4");
run(["-f", "concat", "-safe", "0", "-i", vtxt, "-c", "copy", videoOnly], "video concat");
const VID_LEN = dur(videoOnly);
console.log(`  video      ${Math.floor(VID_LEN / 60)}:${String(Math.round(VID_LEN % 60)).padStart(2, "0")}`);
if (Math.abs(VID_LEN - NARR_LEN) > 0.5) {
  throw new Error(`video ${VID_LEN.toFixed(1)}s vs narration ${NARR_LEN.toFixed(1)}s — out of sync`);
}

/* 3. music: five tracks, each levelled, cut on beat boundaries */
const bounds = [];
let t = 0;
for (const b of E.beats) { bounds.push([t, t + b.dur]); t += b.dur + E.beatGapSec; }
const mlist = [];
for (const m of E.music.segments) {
  const [a, z] = m.beats.split("-").map(Number);
  const from = bounds[a - 1][0];
  const to = bounds[(z || a) - 1][1] + (z === E.beats.length ? 0 : E.beatGapSec);
  const seg = path.join(work, `m${a}.wav`);
  run(["-t", (to - from).toFixed(3), "-i", path.join(E.music.dir, m.file),
    "-af", `loudnorm=I=${E.music.targetLufs}:TP=-2:LRA=11,afade=t=in:d=1.5,afade=t=out:st=${(to - from - 2).toFixed(2)}:d=2`,
    "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", seg], `music ${m.file}`);
  mlist.push(seg);
  console.log(`  music      beats ${m.beats}  ${(to - from).toFixed(1)}s  ${m.file.split(" - ")[0]}`);
}
const mtxt = path.join(work, "m.txt");
fs.writeFileSync(mtxt, mlist.map((f) => `file '${f}'`).join("\n"));
const music = path.join(work, "music.wav");
run(["-f", "concat", "-safe", "0", "-i", mtxt, "-c:a", "pcm_s16le", music], "music concat");

/* 4. mix and mux */
const out = path.join(OUT, PROOF ? "proof.mp4" : `${spec.slug}.mp4`);
run(["-i", videoOnly, "-i", narration, "-i", music,
  "-filter_complex", "[1:a]aresample=48000[v];[2:a]aresample=48000[m];[v][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], "mux");

fs.rmSync(work, { recursive: true, force: true });
const L = dur(out);
console.log(`\n  ${out}  ${Math.floor(L / 60)}:${String(Math.round(L % 60)).padStart(2, "0")}  ${(fs.statSync(out).size / 1e6).toFixed(1)} MB\n`);
