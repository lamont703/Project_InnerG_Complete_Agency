#!/usr/bin/env node
/**
 * Lay b-roll cutaways over a talking head, from a plan.
 *
 *   node scripts/add_broll.js in.mp4 --plan plan.json --out out.mp4
 *   node scripts/add_broll.js in.mp4 --plan plan.json --dry
 *
 * THE PLAN IS THE INTERFACE, and that is the whole design. A plan is
 * [{ at, seconds, query }] — a list of moments and what to show at each. This
 * script is deterministic: same plan, same edit. WHO WRITES THE PLAN is the
 * separate question, and the answer is eventually the editing agent, calling
 * this as one tool among several. Keeping the judgement out of here is what
 * makes the agent's output reviewable before any pixels move.
 *
 * A --joins LIST IS WHAT MAKES THE CUTAWAYS LAND. Silence cutting leaves a jump
 * at every join; pass those timestamps and each cutaway snaps to the nearest
 * one, so it covers the artefact instead of merely sitting near it.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { planCutaways, coverage, resolveAnchors, expandHold } = require("../lib/video-editor/broll.js");
const { searchVideos, pickBest, download } = require("../lib/pixabay.js");
const { cutawayFilters, DEFAULT_DUR } = require("../lib/video-editor/transitions.js");
const whoosh = require("../lib/video-editor/whoosh.js");

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  for (const mod of ["ffmpeg-static", "@ffmpeg-installer/ffmpeg"]) {
    try {
      const r = require(mod);
      const p = typeof r === "string" ? r : r.path;
      if (p && fs.existsSync(p)) return p;
    } catch { /* next */ }
  }
  return "ffmpeg";
}
const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);

const input = process.argv[2];
if (!input || input.startsWith("--")) {
  console.error("Usage: node scripts/add_broll.js <in.mp4> --plan plan.json [--out out.mp4] [--dry]");
  process.exit(1);
}
const FF = ffmpegPath();
const planFile = arg("plan");
if (!planFile || !fs.existsSync(planFile)) { console.error("--plan <file.json> is required"); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(planFile, "utf8"));
const out = arg("out", input.replace(/\.mp4$/i, "") + ".broll.mp4");

// Probe the base clip. ffmpeg-static ships no ffprobe, so read the banner.
const probe = spawnSync(FF, ["-hide_banner", "-i", input], { encoding: "utf8" }).stderr || "";
const dm = probe.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
if (!dm) { console.error("Could not read the clip duration."); process.exit(1); }
const duration = Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]);
const sm = probe.match(/,\s*(\d{2,5})x(\d{2,5})[^,]*,/);
const W = sm ? Number(sm[1]) : 1080, H = sm ? Number(sm[2]) : 1920;
const fm = probe.match(/,\s*([\d.]+)\s*fps/);
const FPS = fm ? Number(fm[1]) : 25;

/*
 * ANCHORS BEAT TIMESTAMPS. A cutaway may say WHEN IT IS SPOKEN rather than at
 * what second; the transcript turns that into a time. Defaults to
 * <input>.words.json, which scripts/transcribe_video.py writes next to the clip.
 *
 * Without a transcript, anchored cutaways are DROPPED rather than guessed at.
 * Guessing is what produced an edit whose b-roll "felt random" — every clip
 * illustrating the sentence after the one it belonged to.
 */
const wordsFile = arg("words", input.replace(/\.mp4$/i, "") + ".words.json");
let words = [];
if (fs.existsSync(wordsFile)) {
  words = JSON.parse(fs.readFileSync(wordsFile, "utf8")).words ?? [];
  console.log(`words    ${wordsFile} (${words.length})`);
} else if ((spec.cutaways ?? spec).some((c) => c && c.anchor)) {
  console.error(`\nThis plan anchors on spoken phrases but there is no transcript at ${wordsFile}.`);
  console.error(`Run: ~/.venvs/shearquery-whisper/bin/python scripts/transcribe_video.py ${input}\n`);
  process.exit(1);
}

/*
 * `hold` is time at full opacity; the transitions are added AROUND it. A 2.5s
 * cutaway with a 0.35s dissolve each end is only 1.8s of settled picture, which
 * is why an honest-looking plan read as "about a second too short".
 */
const withHold = expandHold(spec.cutaways ?? spec, spec.transitionSecs ?? DEFAULT_DUR);
const resolved = resolveAnchors(withHold, words);
for (const c of resolved.cutaways) {
  if (c._heard) console.log(`  anchor  "${c.anchor}" -> ${c.at}s  (${(c._score * 100).toFixed(0)}% "${c._heard}")`);
}

const planned = planCutaways(resolved.cutaways, {
  duration,
  joins: spec.joins ?? [],
  /*
   * A SMALL SNAP WINDOW WHEN ANCHORED. Snapping exists to cover the jump cuts
   * silence removal leaves behind, but an anchored time is measured, and
   * dragging it a full second to reach a join puts it back off the word. Close
   * joins still win; distant ones no longer pull.
   */
  snap: spec.snap ?? (words.length ? 0.4 : 1.0),
  minGap: spec.minGap ?? 0.5,
});
const cutaways = planned.cutaways;
const dropped = [...resolved.dropped, ...planned.dropped];

console.log(`\nin       ${input}`);
console.log(`base     ${W}x${H} @ ${FPS}fps, ${duration.toFixed(2)}s`);
console.log(`plan     ${cutaways.length} cutaway(s), ${(coverage(cutaways, duration) * 100).toFixed(1)}% covered`);
for (const d of dropped) console.log(`  DROPPED  "${d.cutaway?.query ?? "?"}" — ${d.why}`);

(async () => {
  const clips = [];
  for (const c of cutaways) {
    /*
     * TRY THE ALTERNATES BEFORE GIVING UP. The picker is deliberately strict —
     * every word of a two-word query must appear in a clip's tags, which is what
     * stops "signing paper" matching a paper boat — and strictness costs recall:
     * "hair clippers" finds nothing even though clipper footage exists under
     * "barber haircut". The agent proposes two fallbacks per moment so the
     * filter can stay strict without the edit losing a beat.
     */
    let pick = null;
    let used = c.query;
    for (const q of [c.query, ...(c.alternates ?? [])]) {
      const hits = await searchVideos(q, { perPage: 20 });
      pick = pickBest(hits, { seconds: c.seconds, query: q });
      if (pick) { used = q; break; }
      if (q !== c.query) console.log(`  ${String(c.at).padStart(6)}s  "${q}" found nothing either`);
    }
    c.query = used;
    if (!pick) {
      // NO FALLBACK to a random clip: showing unrelated footage is worse than
      // showing the speaker, and a silent substitution is unreviewable.
      console.log(`  ${String(c.at).padStart(6)}s  NO CLIP for "${c.query}" — leaving the speaker on screen`);
      continue;
    }
    const got = has("dry") ? { path: "(not downloaded)", credit: { id: pick.hit.id, author: pick.hit.user, resolution: `${pick.file.width}x${pick.file.height}`, pageUrl: pick.hit.pageURL, source: "Pixabay", license: "Pixabay Content License" } }
                           : await download(pick, path.join(".cache", "broll"));
    console.log(`  ${String(c.at).padStart(6)}s  ${String(c.seconds) + "s"}  ${String(c.transition ?? "dissolve").padEnd(11)} "${c.query}" -> #${got.credit.id} ${got.credit.resolution} by ${got.credit.author}`);
    clips.push({ cutaway: c, ...got });
  }

  if (!clips.length) { console.log("\nNothing to lay down.\n"); return; }
  if (has("dry")) { console.log("\nDry run — nothing rendered.\n"); return; }

  /*
   * Each cutaway becomes: trim the source to length, restamp it to start at the
   * cutaway's moment, fill the frame, then overlay gated to that window.
   *
   * SCALE-THEN-CROP fills 9:16 from whatever shape the stock clip is. fps is
   * forced to the base clip's rate first — a 60fps source overlaid on 25fps
   * stutters, and it looks like a broken render rather than a rate mismatch.
   */
  const parts = [];
  const args_lavfi = [];
  let last = "0:v";
  clips.forEach((c, i) => {
    const { chain, label } = cutawayFilters(i, c.cutaway, { W, H, FPS, prevLabel: last });
    parts.push(...chain);
    last = label;
  });

  /*
   * TRANSITION STINGS, SYNTHESIZED AS EXTRA INPUTS. Each one is a lavfi source
   * shaped and delayed to its cutaway, then mixed under the voice. They are
   * generated rather than fetched because a whoosh is cheaper to make than to
   * licence, and because every sourced sound carries a licence to check —
   * Freesound's vary per sound and CC-BY-NC would poison a monetised video.
   */
  const sfxChains = [];
  const sfxLabels = [];
  let idx = 1 + clips.length;
  for (const c of clips) {
    const sfx = c.cutaway.sfx;
    if (!sfx) continue;
    const spec2 = typeof sfx === "string" ? { type: sfx } : sfx;
    const secs = spec2.seconds ?? 0.45;
    // Lead the sting slightly, so it peaks ON the cut rather than after it.
    const at = Math.max(0, c.cutaway.at - secs * 0.35);
    args_lavfi.push(whoosh.source({ ...spec2, seconds: secs }));
    const { chain, label } = whoosh.shape(idx, { ...spec2, seconds: secs, at });
    sfxChains.push(chain);
    sfxLabels.push(label);
    idx++;
  }
  const mixChain = whoosh.mix(sfxLabels);

  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", input];
  for (const c of clips) args.push("-i", c.path);
  for (const src of args_lavfi) args.push("-f", "lavfi", "-i", src);

  const graph = [...parts, ...sfxChains, ...(mixChain ? [mixChain] : [])].join(";");
  args.push("-filter_complex", graph, "-map", `[${last}]`);
  args.push("-map", mixChain ? "[aout]" : "0:a");
  args.push(
    "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
    // Stings mean the audio is re-encoded; without them the original is kept.
    "-c:a", mixChain ? "aac" : "copy", ...(mixChain ? ["-b:a", "160k"] : []),
    "-movflags", "+faststart", out,
  );
  if (sfxLabels.length) console.log(`  ${sfxLabels.length} transition sting(s) mixed under the voice`);
  console.log(`\nrendering ${clips.length} cutaway(s)...`);
  execFileSync(FF, args, { stdio: "inherit" });

  // Provenance, written next to the output. Attribution is not required by the
  // Pixabay licence; being able to trace a clip a year from now is.
  const manifest = out.replace(/\.mp4$/i, "") + ".credits.json";
  fs.writeFileSync(manifest, JSON.stringify({
    video: path.basename(out),
    generated: "see git history",
    clips: clips.map((c) => ({ at: c.cutaway.at, seconds: c.cutaway.seconds, query: c.cutaway.query, ...c.credit })),
  }, null, 2));

  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
  console.log(`\nout      ${out}  ${mb(input)}MB -> ${mb(out)}MB`);
  console.log(`credits  ${manifest}\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
