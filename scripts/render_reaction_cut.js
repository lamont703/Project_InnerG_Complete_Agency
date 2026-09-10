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
  if (c.holdLast) continue;
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

/*
 * NO CLIP MAY ASK FOR MORE THAN ITS SOURCE HOLDS. ffmpeg does not refuse an
 * out point past the end of a file — it returns what it has and exits 0. The
 * spec asked 21s of a 20.4s b-roll clip; the beat came back 16 frames short and
 * every beat after it slid 0.6s against the narration, which is where three of
 * the six avatars live. It surfaced as lip sync drift in the back half of the
 * video, four steps removed from one wrong number in a json file.
 */
{
  let over = 0;
  for (const b of E.beats) for (const c of b.clips) {
    if (c.still || c.holdLast) continue;
    const have = dur(path.join(ROOT, c.src));
    if (c.out > have + 0.02) {
      console.error(`  ${b.beat}: ${path.basename(c.src)} is ${have.toFixed(2)}s, spec wants up to ${c.out}s`);
      over++;
    }
  }
  if (over) { console.error("\nRefusing to render: a clip would be silently truncated.\n"); process.exit(1); }
}

/* Beat clip sums, and the avatar pin — both are silent failures otherwise. */
const pins = Object.fromEntries(spec.segments.map((s) => [`${s.beat}:${path.basename(s.id)}`, s.in]));
let bad = 0;
for (const b of E.beats) {
  const total = b.clips.reduce((a, c) => a + (c.holdLast ?? (c.out - c.in)), 0);
  if (Math.abs(total - b.dur) > 0.05) { console.error(`  ${b.beat}: clips ${total.toFixed(2)}s vs narration ${b.dur}s`); bad++; }
  let at = 0;
  for (const c of b.clips) {
    if (!c.holdLast && c.src.startsWith("avatar/")) {
      const id = path.basename(c.src, ".mp4");
      const want = pins[`${b.beat}:${id}`];
      if (want === undefined) { console.error(`  ${b.beat}: ${id} is not in spec.segments`); bad++; }
      else if (Math.abs(at - want) > 0.05) {
        console.error(`  ${b.beat}: ${id} lands at ${at.toFixed(2)}s but its audio starts at ${want}s — lips would drift`);
        bad++;
      }
    }
    at += c.holdLast ?? (c.out - c.in);
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

/*
 * 2. video: normalise every clip, then join.
 *
 * FRAME COUNTS ARE COMPUTED FROM CUMULATIVE TIME, NOT PER CLIP. This is the
 * whole reason lip sync survives eight and a half minutes.
 *
 * Rounding each clip on its own looks harmless and is not, because the errors
 * are not random — they skew one way and add up. The half-second inter-beat gap
 * is the clearest case: 0.5s at 25fps is 12.5 frames, which cannot exist, so it
 * became 13 and the video gained 0.02s at every one of the eight gaps. Several
 * clips rounded up too. By the closing beats the picture ran roughly a third of
 * a second long, and because the avatar segments are pinned to positions in a
 * continuous narration, that lag landed straight on the mouth: the words
 * arrived before the lips moved. It was reported as "the voice looks a tad off"
 * — which is exactly what a slow accumulation feels like, since the early beats
 * are fine and only the late ones drift.
 *
 * Rounding the RUNNING TOTAL instead means each clip absorbs its predecessor's
 * error rather than passing it on. A clip may be a frame short or a frame long,
 * but the cut never wanders more than half a frame from the audio, anywhere.
 */
const items = [];
{
  let t = 0;
  for (const [bi, b] of E.beats.entries()) {
    for (const c of b.clips) {
      const d = c.holdLast ?? (c.out - c.in);
      items.push(c.holdLast ? { hold: true, from: t, to: t + d, beat: b.beat }
                            : { c, from: t, to: t + d, beat: b.beat });
      t += d;
    }
    if (bi < E.beats.length - 1) { items.push({ hold: true, from: t, to: t + E.beatGapSec, beat: b.beat }); t += E.beatGapSec; }
  }
}
const fr = (sec) => Math.round(sec * E.fps);

/*
 * ENCODE, THEN MAKE IT EXACT. Seeking is not frame-accurate on every codec, and
 * a one-frame miss here and there adds up across forty-four segments. Rather
 * than trust the encoder, count what came out and correct it: clone the last
 * frame to make up a shortfall, trim to drop a surplus. Costs one cheap re-mux
 * on the few segments that need it and removes a whole class of drift.
 */
function exactFrames(seg, want, label) {
  const count = (f) => Number(execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0",
    "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1:nk=1", f]).toString().trim());
  const got = count(seg);
  if (got === want) return;
  const fixed = seg.replace(/\.mp4$/, "-x.mp4");
  run(["-i", seg, "-vf", `tpad=stop_mode=clone:stop_duration=2`, "-frames:v", String(want), ...ENC, "-an", fixed], `exact ${label}`);
  const after = count(fixed);
  if (after !== want) throw new Error(`${label}: wanted ${want} frames, got ${after}`);
  fs.renameSync(fixed, seg);
}

const vlist = [];
let n = 0, lastReal = null;
for (const it of items) {
  const frames = fr(it.to) - fr(it.from);
  const seg = path.join(work, `v${String(n++).padStart(3, "0")}.mp4`);
  if (it.hold) {
    /*
     * A held frame across the gap, not black. The narration pauses between
     * beats; cutting to black for half a second there reads as a mistake
     * rather than a breath, and it happens eight times.
     */
    run(["-sseof", "-0.08", "-i", lastReal, "-vf", `${VF},tpad=stop_mode=clone:stop_duration=2`,
      "-frames:v", String(frames), ...ENC, "-an", seg], "gap hold");
  } else {
    const src = path.join(ROOT, it.c.src);
    if (it.c.still) run(["-loop", "1", "-i", src, "-vf", VF, "-frames:v", String(frames), ...ENC, "-an", seg], `still ${it.c.src}`);
    else run(["-ss", String(it.c.in), "-i", src, "-vf", VF, "-frames:v", String(frames), ...ENC, "-an", seg], `clip ${it.c.src}`);
    lastReal = seg;
  }
  exactFrames(seg, frames, it.hold ? `${it.beat} gap` : path.basename(it.c.src));
  vlist.push(seg);
}
console.log(`  ${vlist.length} segments`);

/*
 * THE OUTRO IS PART OF THE VIDEO AND NOT PART OF THE NARRATION, which is the
 * only reason the length assert below has a term added to it. The last thing on
 * screen is him finishing the sentence; then it goes to black. No cutaway after
 * the close — it disqualifies part of the audience on purpose and a b-roll
 * button on the end undercuts that.
 */
const OUTRO = E.outro?.fadeSec ?? 0;
if (OUTRO > 0) {
  const tail = path.join(work, `v${String(n++).padStart(3, "0")}.mp4`);
  run(["-sseof", "-0.08", "-i", lastReal, "-vf",
    `${VF},tpad=stop_mode=clone:stop_duration=${OUTRO + 1},fade=t=out:st=0:d=${OUTRO}`,
    "-frames:v", String(Math.round(OUTRO * E.fps)), ...ENC, "-an", tail], "outro fade");
  vlist.push(tail);
}

const vtxt = path.join(work, "v.txt");
fs.writeFileSync(vtxt, vlist.map((f) => `file '${f}'`).join("\n"));
const videoOnly = path.join(work, "video.mp4");
run(["-f", "concat", "-safe", "0", "-i", vtxt, "-c", "copy", videoOnly], "video concat");
const VID_LEN = dur(videoOnly);
console.log(`  video      ${Math.floor(VID_LEN / 60)}:${String(Math.round(VID_LEN % 60)).padStart(2, "0")}`);
if (Math.abs(VID_LEN - (NARR_LEN + OUTRO)) > 0.5) {
  throw new Error(`video ${VID_LEN.toFixed(1)}s vs narration+outro ${(NARR_LEN + OUTRO).toFixed(1)}s — out of sync`);
}

/*
 * WHERE EACH AVATAR ACTUALLY LANDED, measured from the encoded segments rather
 * than from the plan. The plan was right last time and the encode still drifted.
 */
{
  let frames = 0, worst = 0;
  for (const it of items) {
    if (!it.hold && it.c.src.startsWith("avatar/")) {
      const off = frames / E.fps;
      const err = off - it.from;
      worst = Math.max(worst, Math.abs(err));
      console.log(`  ${path.basename(it.c.src, ".mp4")} at ${off.toFixed(3)}s, planned ${it.from.toFixed(3)}s  ${err >= 0 ? "+" : ""}${err.toFixed(3)}s`);
    }
    frames += fr(it.to) - fr(it.from);
  }
  if (worst > 1 / E.fps) throw new Error(`an avatar is ${worst.toFixed(3)}s off — lips would drift`);
  console.log(`  worst avatar offset ${(worst * 1000).toFixed(0)}ms (under one frame)`);
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

/*
 * 4. mix, then MASTER, then mux.
 *
 * amix WITH normalize=0 SUMS RATHER THAN AVERAGES, which is what keeps the
 * voice at full level — but it also means voice plus bed can exceed 0 dBFS.
 * The first full render came out at -17.8 LUFS with a +0.7 dBFS peak: quieter
 * than YouTube's -14 target AND already clipping, so the platform would have
 * turned up a signal that was over. Both numbers are invisible unless measured.
 *
 * loudnorm runs on the MIX, never on the pieces — levelling the bed and the
 * voice separately and then adding them lands somewhere else entirely.
 *
 * AND IT RUNS TWICE, WHICH IS NOT OPTIONAL. Single-pass loudnorm is a dynamic
 * normaliser: it does not hit the target it is given. Asked for -14 it returned
 * -17.0, and asking again returned -15.8. Two-pass measures the programme first
 * and applies a computed linear gain, which lands where it says it will.
 *
 * JUDGE CLIPPING BY FLAT FACTOR, NOT BY PEAK. ebur128 reported +0.5 dBFS after
 * mastering and that looked like clipping; astats gave flat factor 0.000000,
 * meaning no runs of samples pinned at full scale. The overshoot is isolated
 * AAC decode behaviour, not a clipped signal, and chasing it costs a generation
 * of processing for nothing audible. The peak alone would have sent someone
 * re-rendering the whole cut.
 */
const out = path.join(OUT, PROOF ? "proof.mp4" : `${spec.slug}.mp4`);
const out_words = () => out.replace(/\.mp4$/, ".words.json");
const MIX = "[1:a]aresample=48000[v];[2:a]aresample=48000[m];" +
            "[v][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0," +
            (OUTRO > 0 ? `apad=pad_dur=${OUTRO},afade=t=out:st=${NARR_LEN.toFixed(3)}:d=${OUTRO}` : "anull") +
            "[mix]";

/* pass 1 — measure the mix, decoding only */
const probe = spawnSync(FF, ["-nostdin", "-hide_banner", "-i", videoOnly, "-i", narration, "-i", music,
  "-filter_complex", `${MIX};[mix]loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[a]`,
  "-map", "[a]", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const json = (probe.stderr || "").match(/\{[\s\S]*?\}/g)?.pop();
if (!json) throw new Error("loudnorm measurement produced no json");
const M = JSON.parse(json);
console.log(`  measured   ${M.input_i} LUFS, peak ${M.input_tp} dBTP`);

/* pass 2 — apply it linearly, which actually lands on the target */
run(["-i", videoOnly, "-i", narration, "-i", music,
  "-filter_complex",
  `${MIX};[mix]loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${M.input_i}:measured_TP=${M.input_tp}` +
  `:measured_LRA=${M.input_lra}:measured_thresh=${M.input_thresh}:offset=${M.target_offset}:linear=true[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", out], "mux");

/*
 * WORD TIMINGS REBASED ONTO THE ASSEMBLED TIMELINE, written beside the mp4 so
 * add_captions.js finds them by name.
 *
 * THREE THINGS MAKE A CAPTION PASS FAIL SILENTLY, all of them recorded from the
 * News Desk and all of them live here:
 *   - add_captions.js reads `.words` off an OBJECT; the per-beat files are
 *     `{duration, word_timestamps}`, a different shape under a different key.
 *   - those files carry `<start>` and `<end>` marker tokens, which would be
 *     rendered on screen as literal text.
 *   - their clocks are per beat. Beat nine's words start at zero in its own
 *     file and at 452.3s in the cut; captioning off the raw files puts every
 *     line after beat one in the wrong place.
 * Each one produces a video that encodes fine and exits 0.
 */
{
  const out = [];
  let at = 0;
  for (const [i, b] of E.beats.entries()) {
    const d = JSON.parse(fs.readFileSync(path.join(NARR, `${b.beat}.words.json`), "utf8"));
    for (const w of d.word_timestamps || []) {
      const tok = String(w.word ?? "").trim();
      if (!tok || tok === "<start>" || tok === "<end>") continue;
      out.push({ word: tok, start: +(w.start + at).toFixed(3), end: +(w.end + at).toFixed(3) });
    }
    at += b.dur + (i < E.beats.length - 1 ? E.beatGapSec : 0);
  }
  const wf = out.length ? out[out.length - 1].end : 0;
  if (Math.abs(wf - NARR_LEN) > 2) throw new Error(`last caption word at ${wf}s but narration is ${NARR_LEN}s`);
  fs.writeFileSync(out_words(), JSON.stringify({ words: out }, null, 2));
  console.log(`  captions   ${out.length} words rebased, last at ${wf.toFixed(1)}s`);
}

fs.rmSync(work, { recursive: true, force: true });
const L = dur(out);
console.log(`\n  ${out}  ${Math.floor(L / 60)}:${String(Math.round(L % 60)).padStart(2, "0")}  ${(fs.statSync(out).size / 1e6).toFixed(1)} MB\n`);
