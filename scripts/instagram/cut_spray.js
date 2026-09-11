#!/usr/bin/env node
/**
 * Cut the eighteen clips into The Spray Bottle.
 *
 *   node scripts/instagram/cut_spray.js
 *
 * IT OPENS ON THE CAPE GOING ON, and it plays straight through in order.
 *
 * An earlier version cold-opened on the client already drenched and then cut
 * back to the start, on the theory that a Short has two seconds to earn
 * attention. It was dropped: the flash-forward spends the best image of the
 * film before the audience has any reason to care about it, and the escalation
 * works better when nobody knows where it is going. The arriving and sitting
 * shots went too — four seconds of a man entering a room. A caped man in a
 * chair with dry hair explains itself.
 *
 * EVERY CLIP IS FIVE SECONDS AND ALMOST NONE OF IT IS USED. Kling's minimum is
 * 5s and these beats want one to three, so the cut is mostly deciding WHERE in
 * each clip the beat lives. Generated motion ramps in over roughly the first
 * second, so most beats start around 0.6s — starting at zero gives a held frame
 * that reads as a freeze.
 *
 * THE WHOLE FILM WAS SLOWED BY ROUGHLY HALF AGAIN, and it cost nothing. Every
 * clip is 5s and the first cut used one to three seconds of each, so there was
 * always two to four seconds of unused footage sitting in every file. Pacing is
 * an in-point and a length, not a render.
 *
 * THE LONG HOLDS:
 *   spray-more  4.0s — the joke IS that it goes on too long. Cut at a normal
 *                     beat length there is no joke, just a man spraying.
 *   pour        3.4s — the climax.
 *   final       3.4s — a punchline cut at the same rhythm as its setup does not
 *                     land as a punchline.
 *
 * THE REACH IS USED TWICE, for bottle two and bottle three, and reusing the
 * identical gesture is the point rather than a shortcut: a runner gag is funny
 * because it is the SAME thing happening again.
 *
 * The two in-points are not interchangeable. THE NEW BOTTLE ONLY ARRIVES IN HIS
 * HAND ONLY IN THE LAST HALF SECOND of that clip, so bottle two starts at 1.4
 * and runs to 4.9 — nearly the whole file. A first pass ended it at 4.5 and the
 * arm went out and never came back, which is not the joke. Check the payoff is
 * actually inside the segment, not just inside the clip. Bottle three starts at 2.6 and skips
 * straight to the reach, because by then the audience knows what is coming and
 * the setup is dead weight.
 *
 * AND THE FASTEST IS 13 GRAB AT 1.0s, right before 13b unscrew at 1.4s. The
 * snatch is a snap and the unscrewing is slow; that contrast is what makes him
 * read as decided rather than as flailing.
 *
 * SIX SHOTS ARE MIRRORED, and that is not a stylistic choice. The stills were
 * generated one at a time and nothing held the staging, so the client ended up
 * seated on the RIGHT in half of them and on the LEFT in the other half. Cut
 * together that is six side-swaps in half a minute and it reads as the two of
 * them trading places rather than as coverage. The convention here is BARBER
 * LEFT, CLIENT RIGHT, and `flip` mirrors the shots that came back the other
 * way.
 *
 * 01 IS NOT MIRRORED even though the client is on the left in it: he is in the
 * DOORWAY walking toward a chair on the right, so he is already moving into the
 * seat he occupies for the rest of the film. Mirroring it would have him walk
 * away from where he ends up.
 *
 * The set is a bare wall, so mirroring costs nothing readable. It is done here
 * rather than on disk so the clips stay untouched and the decision is visible.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");
const C = "experiments/spray-clips";
const W = 1080, H = 1920, FPS = 30;
const work = ".cache/spray-cut";

/* file, in-point, length, flip, note */
const CUT = [
  ["03-cape",       0.7, 1.8, true,  "DRY. this is earlier — the cape settles"],
  ["04-comb",       0.8, 1.6, true,  "combing. all normal"],
  ["05-spray1",     0.7, 1.6, false, "one polite spray"],
  ["06-spray-more", 0.6, 4.0, true,  "and he does not stop"],
  ["07-drenched",   0.6, 3.0, true,  "we catch up to the cold open"],
  ["08-empty",      0.6, 3.0, false, "sputter. nothing comes out"],
  ["09-relief",     0.7, 2.8, false, "relief. it is over"],
  ["10-reach",      1.4, 3.5, false, "BOTTLE TWO — lowers the empty, reaches out, comes back full"],
  ["11-sad",        0.7, 2.2, false, "defeated"],
  ["12-anger",      0.8, 2.0, false, "rage"],
  ["13-grab",       0.5, 1.4, true,  "the snatch — fastest cut in the film"],
  ["13b-unscrew",   0.7, 2.2, false, "slow. deliberate"],
  ["14-pour",       0.6, 3.4, false, "he does it to himself"],
  ["15-throw",      0.6, 1.8, true,  "and throws it"],
  ["16-huff",       0.8, 2.4, false, "breathing. ready"],
  ["10-reach",      2.6, 2.0, false, "BOTTLE THREE — straight to the reach. same gesture"],
  ["17-final",      0.6, 3.4, false, "one more spray. hold."],
];

fs.mkdirSync(work, { recursive: true });
const pieces = [];
let total = 0;

CUT.forEach(([name, ss, len, flip, note], i) => {
  const src = path.join(C, `${name}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  /* Indexed by POSITION, not by name — shot 7 appears twice and would
   * otherwise overwrite its own first segment. */
  const out = path.join(work, `${String(i).padStart(2, "0")}-${name}.mp4`);
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", String(ss), "-i", src, "-t", String(len),
    /*
     * Re-encoded to one ladder, not stream-copied. Kling returns slightly
     * different frame sizes across a batch, and concat demuxing mismatched
     * streams plays the first segment then stalls.
     */
    "-vf", `${flip ? "hflip," : ""}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1`,
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", out,
  ], { stdio: "inherit" });
  pieces.push(out);
  total += len;
  console.log(`  ${String(len.toFixed(1)).padStart(4)}s  ${flip ? "[mirrored] " : "           "}${note}`);
});

const list = path.join(work, "concat.txt");
fs.writeFileSync(list, pieces.map((p) => `file '${path.resolve(p)}'`).join("\n") + "\n");
fs.mkdirSync("experiments/films", { recursive: true });
const out = "experiments/films/the-spray-bottle-silent.mp4";
execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", list,
  "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", out,
], { stdio: "inherit" });

console.log(`\ndone  ${out}  ${total.toFixed(1)}s  ${(fs.statSync(out).size / 1e6).toFixed(2)}MB`);
