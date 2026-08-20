/* Render the remaining v2 hairstyle Reels. Skips any that already exist so a
   re-run after an interruption picks up where it stopped. */
const {execFileSync}=require("child_process");
const fs=require("fs");
const cfg=JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts.json","utf8"));
const CTA="Comment the number and I'll send you shops that do it.";
for(const c of cfg){
  const out=`experiments/hairstyle-reels-v2/${c.k}.mp4`;
  if(fs.existsSync(out)){ console.log(`skip ${c.k}`); continue; }
  const t=Date.now();
  execFileSync("node",["scripts/instagram/reel_hairstyles.js",
    `--in=experiments/hairstyle-grids-v2/${c.k}.jpg`,`--out=${out}`,
    `--names=${JSON.stringify(c.n)}`,`--headline=${c.h}`,`--cta=${CTA}`],{stdio:"pipe"});
  console.log(`done ${c.k}  ${Math.round((Date.now()-t)/1000)}s`);
}
console.log("ALL RENDERED");
