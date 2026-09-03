/* Render the v7 hairstyle Reels — buzz cuts, hawks, shags and ponytails.
   Two men's, two women's, none of them run before.

   FIFTH NEAR-COPY OF THIS FILE. v3 through v7 differ only in the batch name;
   the logic has not changed since v5. Worth collapsing into one script that
   takes --batch, but not mid-render — noted here so the next person does not
   assume the duplication was deliberate. Skips anything already rendered so an interrupted run
   resumes; a Reel is 270 puppeteer frames and takes about four minutes.

   READS THE .fit.jpg, NOT THE RAW GRID, and that matters. The v7 grids come
   from Higgsfield's Nano Banana Pro at 1792x2400 (3:4), where every earlier
   batch was 848x1264 (2:3). reel_hairstyles.html pans to fixed NORMALISED
   points, so the aspect change does not move the camera — it changes the shape
   of what the camera sees, and a 3:4 grid has relatively shorter cells, so the
   window spills into the row above and below and catches a stranger's chin.

   Cropping the width to 1610 restores the ORIGINAL CELL ASPECT exactly:
   (1610/2)/(2400/3) = 1.0063, the same as (848/2)/(1264/3). Verified by
   rendering and looking at the frames, not by arithmetic alone. */
const { execFileSync } = require("child_process");
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v7-ready.json", "utf8"));
const CTA = "Comment the number and I'll send you shops that do it.";
fs.mkdirSync("experiments/hairstyle-reels-v7", { recursive: true });
fs.mkdirSync("experiments/hairstyle-covers-v7", { recursive: true });
for (const c of cfg) {
  const grid = `experiments/hairstyle-grids-v7/${c.k}.fit.jpg`;
  if (!fs.existsSync(grid)) { console.log(`MISSING grid ${grid}`); continue; }
  const out = `experiments/hairstyle-reels-v7/${c.k}.mp4`;
  const cover = `experiments/hairstyle-covers-v7/${c.k}.jpg`;
  const common = [`--in=${grid}`, `--names=${JSON.stringify(c.n)}`, `--headline=${c.h}`, `--cta=${CTA}`];
  if (fs.existsSync(out)) console.log(`skip reel ${c.k}`);
  else {
    const t = Date.now();
    execFileSync("node", ["scripts/instagram/reel_hairstyles.js", ...common, `--out=${out}`], { stdio: "pipe" });
    console.log(`done reel ${c.k}  ${Math.round((Date.now() - t) / 1000)}s`);
  }
  if (fs.existsSync(cover)) console.log(`skip cover ${c.k}`);
  else {
    execFileSync("node", ["scripts/instagram/reel_thumbnail.js", ...common, `--out=${cover}`], { stdio: "pipe" });
    console.log(`done cover ${c.k}`);
  }
}
console.log("ALL RENDERED");
