#!/usr/bin/env node
/**
 * The HairStyles Reel template.
 *
 *   node scripts/instagram/reel_hairstyles.js --in=public/grid.jpg --out=out.mp4
 *   node scripts/instagram/reel_hairstyles.js --in=... --audio="path/to/track.m4a"
 *
 * THE MOTION IS THE CAPTION'S ARGUMENT. The post asks for a NUMBER in the
 * comments, so the edit walks the six cuts in order with the number on screen
 * while each is held. A generic push-in would look nicer and would teach the
 * viewer nothing about what they are being asked to do.
 *
 * NINE SECONDS BECAUSE THE BED IS NINE SECONDS. Cutting to the audio you
 * actually have beats picking a length and fading the track awkwardly.
 *
 * The bed is trimmed to the clip's exact length with a short fade at each end,
 * the same treatment render_short_video.js gives its audio, so a track never
 * ends mid-phrase.
 */
const fs=require("fs"), path=require("path"), os=require("os");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const arg=(n,d)=>{const m=process.argv.find(a=>a.startsWith(`--${n}=`));return m?m.split("=").slice(1).join("="):d;};
const FPS=Number(arg("fps",30)), W=1080, H=1920, HERE=__dirname;
const AUDIO=arg("audio", path.join("reference","Podcast Visuals","Shorts","_bed-9s.m4a"));
const IN=arg("in", path.join(HERE,"source.jpg"));
const OUT=arg("out", path.join(HERE,"hairstyles-reel.mp4"));
const SECONDS=9.0;   // matches the bed

(async()=>{
  const browser=await puppeteer.launch({headless:"new",
    args:["--no-sandbox","--force-color-profile=srgb"]});
  const page=await browser.newPage();
  page.on("pageerror",e=>console.error("  page error:",String(e).slice(0,180)));
  await page.setViewport({width:W,height:H});
  await page.goto(`file://${path.join(HERE,"reel_hairstyles.html")}?w=${W}&h=${H}`,{waitUntil:"networkidle0"});

  const src="data:image/jpeg;base64,"+fs.readFileSync(IN).toString("base64");
  const dims=await page.evaluate((s)=>window.__load(s), src);
  console.log(`  source ${dims.w}x${dims.h} -> ${W}x${H}, ${SECONDS}s`);

  const total=Math.round(SECONDS*FPS);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"reel-"));
  for(let i=0;i<total;i++){
    await page.evaluate((t)=>window.__setT(t), i/total);
    await page.screenshot({path:path.join(tmp,String(i).padStart(5,"0")+".png")});
    if((i+1)%60===0) process.stdout.write(`    ${i+1}/${total}\n`);
  }
  await browser.close();

  const silent=OUT.replace(/\.mp4$/,"")+"._silent.mp4";
  execFileSync(ffmpeg,["-y","-framerate",String(FPS),"-i",path.join(tmp,"%05d.png"),
    "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","medium",
    "-movflags","+faststart",silent],{stdio:"pipe"});
  fs.rmSync(tmp,{recursive:true,force:true});

  const out=OUT;
  fs.mkdirSync(path.dirname(out),{recursive:true});
  if(AUDIO && fs.existsSync(AUDIO)){
    execFileSync(ffmpeg,["-y","-i",silent,"-i",AUDIO,
      // Trim to the video, fade in and out so it never ends mid-phrase.
      "-filter_complex",`[1:a]atrim=0:${SECONDS},afade=t=in:st=0:d=0.4,afade=t=out:st=${SECONDS-0.6}:d=0.6[a]`,
      "-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-b:a","128k","-shortest",
      "-movflags","+faststart",out],{stdio:"pipe"});
    console.log(`  audio: ${path.basename(AUDIO)}`);
  } else {
    fs.copyFileSync(silent,out);
    console.log("  no audio bed found - silent");
  }
  fs.rmSync(silent,{force:true});
  console.log(`  ${out}  ${Math.round(fs.statSync(out).size/1024)}KB`);
})();
