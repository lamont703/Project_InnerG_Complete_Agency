#!/usr/bin/env node
/**
 * Look at what a b-roll query actually returns, before paying to render it.
 *
 *   node scripts/broll_preview.js "barber cutting hair" "counting money"
 *
 * WHY THIS EXISTS. A query's TAGS can be perfectly relevant while the footage is
 * useless. "hair clippers" returns a clip tagged "hair clipper, hair cutter,
 * vintage, manual" that is an unrecognisable metal close-up; "bank building"
 * returns a city skyline at dusk, which says nothing about a lender. Both pass
 * every automated check there is, and both were only caught by looking.
 *
 * So this downloads the clip the picker WOULD choose and writes a mid-clip
 * frame to /tmp/pv-N.jpg. Choosing b-roll is a visual decision and there is no
 * substitute for seeing it — which is the same reason the plan is reviewed
 * before it renders rather than after.
 */
require("dotenv").config({ path: ".env.local" });
const { execFileSync } = require("child_process");
const FF = require("ffmpeg-static");
const { searchVideos, pickBest, download } = require("../lib/pixabay.js");

(async () => {
  const queries = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!queries.length) {
    console.error('Usage: node scripts/broll_preview.js "query one" "query two" ...');
    process.exit(1);
  }
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      const hits = await searchVideos(q, { perPage: 20 });
      const pick = pickBest(hits, { seconds: 3, query: q });
      if (!pick) { console.log(`${i}  "${q}"  -> nothing relevant`); continue; }
      const got = await download(pick, ".cache/broll");
      const mid = Math.min(3, (pick.hit.duration || 6) / 2);
      execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(mid),
        "-i", got.path, "-frames:v", "1", "-vf", "scale=300:-1", `/tmp/pv-${i}.jpg`]);
      console.log(`${i}  "${q}"  -> #${pick.hit.id} ${pick.file.height}p  ${String(pick.hit.tags).slice(0, 46)}`);
    } catch (e) {
      console.log(`${i}  "${q}"  -> error: ${e.message.slice(0, 70)}`);
    }
  }
  console.log(`\nFrames at /tmp/pv-0.jpg ...\n`);
})();
