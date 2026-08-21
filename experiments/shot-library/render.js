#!/usr/bin/env node
/**
 * Render a named grammar, or a named shot, from the library.
 *
 *   node experiments/shot-library/render.js --list
 *   node experiments/shot-library/render.js --grammar=detailFirst
 *   node experiments/shot-library/render.js --shot=rackToSubject
 *
 * IDEATION BECOMES SELECTION. The point of the library is that you stop
 * inventing camera moves and start choosing from a menu where every entry says
 * what it communicates. Rendering one is a flag, not an edit.
 */
const fs=require("fs"), path=require("path"), os=require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const { SHOTS, GRAMMARS } = require("./shots.js");

const arg=(n,d)=>{const m=process.argv.find(a=>a.startsWith(`--${n}=`));return m?m.split("=")[1]:d;};
const FPS=Number(arg("fps",30)), W=1080, H=1920, HERE=__dirname;

if (process.argv.includes("--list")) {
  console.log("\nSHOTS");
  for (const [k,s] of Object.entries(SHOTS)) console.log(`  ${k.padEnd(16)} ${String(s.seconds).padStart(4)}s  ${s.says}\n                        ${s.use}`);
  console.log("\nGRAMMARS");
  for (const [k,g] of Object.entries(GRAMMARS)) console.log(`  ${k.padEnd(16)} ${g.shots.join(" -> ")}\n                   ${g.says}`);
  process.exit(0);
}

(async () => {
  const gName = arg("grammar", null), sName = arg("shot", null);
  let names, label;
  if (sName) { if(!SHOTS[sName]) throw new Error("no shot "+sName); names=[sName]; label="shot-"+sName; }
  else { const g = GRAMMARS[gName || "reveal"]; if(!g) throw new Error("no grammar "+gName); names=g.shots; label="grammar-"+(gName||"reveal"); }

  // The library entry IS the scene. No translation layer, which is the point.
  const scenes = names.map((n) => {
    const s = SHOTS[n];
    return { seconds:s.seconds, move:s.path, zoom:s.zoom, focus:s.focus, blur:s.blur, warmth:s.warmth, vig:s.vig };
  });

  const browser = await puppeteer.launch({ headless:"new",
    args:["--no-sandbox","--force-color-profile=srgb","--use-gl=swiftshader","--enable-webgl","--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  page.on("pageerror", e => console.error("  page error:", String(e).slice(0,180)));
  await page.setViewport({ width:W, height:H });
  await page.goto(`file://${path.join(HERE,"render.html")}?w=${W}&h=${H}`, { waitUntil:"networkidle0" });
  await page.evaluate((s)=>{ window.__SCENES = s; }, scenes);

  const b64=(p)=>"data:image/"+(p.endsWith(".png")?"png":"jpeg")+";base64,"+fs.readFileSync(p).toString("base64");
  await page.evaluate((a,b)=>window.__load(a,b), b64(path.join(HERE,"source.jpg")), b64(path.join(HERE,"source-depth.png")));

  const seconds = scenes.reduce((s,x)=>s+x.seconds,0);
  const total = Math.round(seconds*FPS);
  console.log(`  ${label}  ${names.join(" -> ")}`);
  console.log(`  ${seconds.toFixed(1)}s, ${total} frames`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),"shotlib-"));
  for (let i=0;i<total;i++){
    await page.evaluate((t)=>window.__setT(t), i/total);
    await page.screenshot({ path: path.join(tmp, String(i).padStart(5,"0")+".png") });
  }
  await browser.close();

  const out = path.join(HERE, label+".mp4");
  execFileSync(ffmpeg, ["-y","-framerate",String(FPS),"-i",path.join(tmp,"%05d.png"),
    "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","medium","-movflags","+faststart",out],{stdio:"pipe"});
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log(`  ${out}  ${Math.round(fs.statSync(out).size/1024)}KB`);
})();
