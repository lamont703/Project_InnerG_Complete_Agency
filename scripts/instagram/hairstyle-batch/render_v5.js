/* Render the v5 hairstyle Reels (two beard grids and one colour-placement grid).
   Skips any that already exist so an interrupted run resumes rather than
   starting over — a Reel is 270 screenshots and costs about four minutes. */
const {execFileSync}=require("child_process");
const fs=require("fs");
const cfg=JSON.parse(fs.readFileSync("scripts/instagram/hairstyle-batch/concepts-v5-ready.json","utf8"));
const CTA="Comment the number and I'll send you shops that do it.";
fs.mkdirSync("experiments/hairstyle-reels-v5",{recursive:true});
fs.mkdirSync("experiments/hairstyle-covers-v5",{recursive:true});
for(const c of cfg){
  const grid=`experiments/hairstyle-grids-v5/${c.k}.jpg`;
  const out=`experiments/hairstyle-reels-v5/${c.k}.mp4`;
  const cover=`experiments/hairstyle-covers-v5/${c.k}.jpg`;
  const common=[`--in=${grid}`,`--names=${JSON.stringify(c.n)}`,`--headline=${c.h}`,`--cta=${CTA}`];
  if(fs.existsSync(out)){ console.log(`skip reel ${c.k}`); }
  else{
    const t=Date.now();
    execFileSync("node",["scripts/instagram/reel_hairstyles.js",...common,`--out=${out}`],{stdio:"pipe"});
    console.log(`done reel ${c.k}  ${Math.round((Date.now()-t)/1000)}s`);
  }
  if(fs.existsSync(cover)){ console.log(`skip cover ${c.k}`); }
  else{
    execFileSync("node",["scripts/instagram/reel_thumbnail.js",...common,`--out=${cover}`],{stdio:"pipe"});
    console.log(`done cover ${c.k}`);
  }
}
console.log("ALL RENDERED");
