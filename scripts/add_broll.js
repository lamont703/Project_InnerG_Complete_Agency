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
const { planCutaways, coverage } = require("../lib/video-editor/broll.js");
const { searchVideos, pickBest, download } = require("../lib/pixabay.js");

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

const { cutaways, dropped } = planCutaways(spec.cutaways ?? spec, {
  duration,
  joins: spec.joins ?? [],
  minGap: spec.minGap ?? 0.5,
});

console.log(`\nin       ${input}`);
console.log(`base     ${W}x${H} @ ${FPS}fps, ${duration.toFixed(2)}s`);
console.log(`plan     ${cutaways.length} cutaway(s), ${(coverage(cutaways, duration) * 100).toFixed(1)}% covered`);
for (const d of dropped) console.log(`  DROPPED  "${d.cutaway?.query ?? "?"}" — ${d.why}`);

(async () => {
  const clips = [];
  for (const c of cutaways) {
    const hits = await searchVideos(c.query, { perPage: 20 });
    const pick = pickBest(hits, { seconds: c.seconds });
    if (!pick) {
      // NO FALLBACK to a random clip: showing unrelated footage is worse than
      // showing the speaker, and a silent substitution is unreviewable.
      console.log(`  ${String(c.at).padStart(6)}s  NO CLIP for "${c.query}" — leaving the speaker on screen`);
      continue;
    }
    const got = has("dry") ? { path: "(not downloaded)", credit: { id: pick.hit.id, author: pick.hit.user, resolution: `${pick.file.width}x${pick.file.height}`, pageUrl: pick.hit.pageURL, source: "Pixabay", license: "Pixabay Content License" } }
                           : await download(pick, path.join(".cache", "broll"));
    console.log(`  ${String(c.at).padStart(6)}s  ${String(c.seconds) + "s"}  "${c.query}" -> #${got.credit.id} ${got.credit.resolution} by ${got.credit.author}`);
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
  let last = "0:v";
  clips.forEach((c, i) => {
    const { at, seconds } = c.cutaway;
    parts.push(
      `[${i + 1}:v]trim=start=0:duration=${seconds},setpts=PTS-STARTPTS+${at}/TB,` +
      `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[b${i}]`
    );
    parts.push(`[${last}][b${i}]overlay=0:0:enable='between(t,${at},${(at + seconds).toFixed(3)})'[v${i}]`);
    last = `v${i}`;
  });

  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", input];
  for (const c of clips) args.push("-i", c.path);
  args.push(
    "-filter_complex", parts.join(";"),
    "-map", `[${last}]`, "-map", "0:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "copy", "-movflags", "+faststart", out,
  );
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
