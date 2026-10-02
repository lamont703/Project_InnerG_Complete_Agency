#!/usr/bin/env node
/**
 * DROP THE SHOW INTRO INTO A FINISHED CUT, ON AN EXISTING EDIT.
 *
 *   node scripts/insert_intro.js --at=21.433                       # whole file
 *   node scripts/insert_intro.js --at=21.433 --from=10 --to=32     # excerpt, to look at first
 *
 * THE INSERT POINT IS A CUT THAT IS ALREADY THERE, not a new one. In this file
 * the avatar's "Let's see what they say." ends at 21.14s and the picture cuts
 * to the source clip at 21.433s — so the intro goes in the 0.29s hole between
 * them, and neither line is clipped. Dropping an intro a few frames either side
 * of that would either eat the last word or step on the first one.
 *
 * IT PUSHES LEFT, BECAUSE THIS SHOW PUSHES LEFT. reaction_swipe_cut.js already
 * established the vocabulary: every switch between our avatar and the source is
 * a quick push to the left. A brand-new transition here would read as a
 * different show's graphics package spliced in, which is the opposite of what
 * an intro is for.
 *
 * xfade EATS TIME FROM BOTH SIDES, AND THAT IS NOT A BUG TO ROUTE AROUND. A
 * 0.28s blend consumes 0.28s of the outgoing clip AND 0.28s of the incoming
 * one. So the intro loses the first 0.28s of its push and the last 0.18s of its
 * music tail. Both are the parts designed to be soft; the logo is untouched.
 *
 * THE PICTURE BLENDS OUT BUT THE SOUND HARD-CUTS — a J-cut, and the one place
 * this is not symmetrical. The source speaker's first word starts BEFORE his
 * picture does, so any audio crossfade on the way out fades up his first word.
 * Coming IN there is no such problem: that side is a 0.29s silence, so the
 * audio crossfades there and the music arrives under the swipe.
 *
 * --alead EXISTS BECAUSE THE ORIGINAL CUT ALREADY HAD ONE. The picture cuts on
 * frame 644 (21.4667s) and he says "How" at 21.44 — his sound leads his image
 * by 27ms, which is an edit somebody made on purpose. Taking his audio from the
 * picture cut would shave the attack off that word and it would sound clipped
 * without being obviously wrong. So his audio is lifted `alead` seconds early
 * and the music is trimmed by the same amount, which keeps the two tracks the
 * same length as the picture.
 *
 * NORMALISE BEFORE xfade, ALWAYS. The cut is 30fps and the intro is 24fps, and
 * xfade refuses inputs that differ in fps, size, pixel format or SAR. The fps
 * filter goes on the intro, not the cut — re-timing 4½ minutes of finished
 * edit to match a 3 second graphic is the wrong way round.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const CUT = arg("cut", "experiments/Audio Reactions/renders/reaction-social-16x9.mp4");
const INTRO = arg("intro", "experiments/shearquery-intro/anim/intro-final.mp4");
const AT = Number(arg("at", 21.433));
const TIN = Number(arg("tin", 0.28));
const TOUT = Number(arg("tout", 0.18));
const TRANS = arg("trans", "smoothleft");
/* The outro is appended in the SAME pass as the intro insert, on purpose. Doing
   it as a second job would re-encode four and a half minutes of finished cut a
   second time for the sake of fifteen seconds at the end — one generation of
   loss across the whole film to add something that only touches its tail. */
const OUTRO = arg("outro", "");
/* Short, because there is only 0.22s between the last word and the end of the
   file. A 0.35s blend would eat into "think." — measured from the words file,
   not eyeballed. */
const TEND = Number(arg("tend", 0.20));
const ALEAD = Number(arg("alead", 0.067));   // 2 frames: his sound leads his picture
const FROM = arg("from", "") === "" ? null : Number(arg("from"));
const TO = arg("to", "") === "" ? null : Number(arg("to"));
const OUT = arg("out", FROM != null
  ? "experiments/Audio Reactions/renders/longform-intro-excerpt.mp4"
  : "experiments/Audio Reactions/renders/reaction-social-16x9-intro.mp4");
const FPS = Number(arg("fps", 30));
const PRESET = arg("preset", FROM != null ? "medium" : "medium");
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };

for (const f of [CUT, INTRO]) if (!fs.existsSync(f)) die(`missing ${f}`);
const dur = (f) => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", f]).toString().trim());

const cutDur = dur(CUT);
const introDur = dur(INTRO);
const outroDur = OUTRO ? dur(OUTRO) : 0;
if (OUTRO && !fs.existsSync(OUTRO)) die(`missing outro ${OUTRO}`);
const aStart = FROM != null ? FROM : 0;
const bEnd = TO != null ? TO : cutDur;
if (AT <= aStart || AT >= bEnd) die(`--at=${AT} is outside ${aStart}..${bEnd}`);

const aLen = AT - aStart;                 // outgoing piece
const bLen = bEnd - AT;                   // incoming piece
if (aLen <= TIN) die(`only ${aLen.toFixed(2)}s before the cut — not enough for a ${TIN}s blend`);

const off1 = (aLen - TIN).toFixed(4);                        // blend into the intro
const mid = aLen + introDur - TIN;                           // length after the first blend
const off2 = (mid - TOUT).toFixed(4);                        // blend out of the intro
const audioCut = (mid - TOUT - ALEAD).toFixed(4);            // where sound hard-cuts to the source
const bAudioFrom = (AT - ALEAD).toFixed(4);

const mid2 = mid + bLen - TOUT;                              // length after the intro insert
const off3 = (mid2 - TEND).toFixed(4);                       // where the outro blends in

const vTail = OUTRO ? "[vmain]" : "[v]";
const aTail = OUTRO ? "[amain]" : "[a]";
const filter = [
  `[0:v]trim=${aStart}:${AT},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1[va]`,
  `[0:v]trim=${AT}:${bEnd},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1[vb]`,
  `[1:v]fps=${FPS},format=yuv420p,setsar=1[vi]`,
  `[va][vi]xfade=transition=${TRANS}:duration=${TIN}:offset=${off1}[v1]`,
  `[v1][vb]xfade=transition=${TRANS}:duration=${TOUT}:offset=${off2}${vTail}`,

  `[0:a]atrim=${aStart}:${AT},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aa]`,
  `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[ai]`,
  `[0:a]atrim=${bAudioFrom}:${bEnd},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,`
    + `afade=t=in:st=0:d=0.02[ab]`,
  /* IN: crossfade, because that side is silence. OUT: butt-join, because his
     first word is 7ms into his own clip and a crossfade would fade it up. */
  `[aa][ai]acrossfade=d=${TIN}:c1=tri:c2=tri[a1]`,
  `[a1]atrim=0:${audioCut},asetpts=PTS-STARTPTS[a1t]`,
  `[a1t][ab]concat=n=2:v=0:a=1${aTail}`,
  ...(OUTRO ? [
    /* Normalised the same way the cut's own halves are — xfade refuses inputs
       that differ in fps, pixel format or SAR, and the outro is authored
       separately from this file. */
    `[2:v]fps=${FPS},format=yuv420p,setsar=1[vo]`,
    `${vTail}[vo]xfade=transition=${TRANS}:duration=${TEND}:offset=${off3}[v]`,
    `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[ao]`,
    `${aTail}[ao]acrossfade=d=${TEND}:c1=tri:c2=tri[a]`,
  ] : []),
].join(";");

console.log(`\n  cut    ${path.basename(CUT)}  ${cutDur.toFixed(2)}s`);
console.log(`  intro  ${path.basename(INTRO)}  ${introDur.toFixed(2)}s`);
console.log(`  insert at ${AT}s   push-left  in ${TIN}s / out ${TOUT}s   audio lead ${ALEAD}s`);
if (FROM != null) console.log(`  EXCERPT ${aStart}s..${bEnd}s of the source`);
const finalLen = aLen + introDur + bLen - TIN - TOUT + (OUTRO ? outroDur - TEND : 0);
if (OUTRO) console.log(`  outro  ${path.basename(OUTRO)}  ${outroDur.toFixed(2)}s, blended in at ${off3}s over ${TEND}s`);
console.log(`  new length ${finalLen.toFixed(2)}s\n`);

execFileSync(FF, [
  "-y", "-i", CUT, "-i", INTRO, ...(OUTRO ? ["-i", OUTRO] : []),
  "-filter_complex", filter, "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", PRESET, "-crf", "18",
  "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
  path.resolve(OUT),
], { stdio: ["ignore", "ignore", "pipe"] });

console.log(`  wrote ${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB\n`);
