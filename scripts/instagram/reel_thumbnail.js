#!/usr/bin/env node
/**
 * The cover image for a HairStyles Reel, rendered from the same source grid.
 *
 *   node scripts/instagram/reel_thumbnail.js --in=grid.jpg --out=cover.jpg \
 *     --names='[...]' --headline="Six fades, explained."
 *
 * WHY RENDER RATHER THAN GRAB A FRAME. ffmpeg could pull frame 40 out of the
 * finished MP4 in one command. It would also be a JPEG of an H.264 frame -
 * softer than the source, and permanently tied to a video that has to exist
 * first. Re-rendering the opening beat from the original grid gives a clean
 * 1080x1920 at full quality, and it can be made before the Reel is.
 *
 * t=0.15 IS THE END OF THE OPENING BEAT. The template holds the whole grid
 * wide for the first 1.4 of its 9 seconds while the headline fades up; by the
 * end of that beat everything is on screen and nothing has started moving.
 * Later frames are mid-zoom on a single cut, which makes a cover that shows one
 * haircut instead of six and misrepresents the post.
 *
 * JPEG BECAUSE INSTAGRAM REQUIRES IT. "Format: JPEG" for a Reels cover photo,
 * 8MB max, sRGB - and the PNG this template would otherwise emit is the same
 * mistake that made a publish fail once already, just one step further down.
 */
const fs=require("fs"), path=require("path");
const puppeteer=require("puppeteer");

const arg=(n,d)=>{const m=process.argv.find(a=>a.startsWith(`--${n}=`));return m?m.split("=").slice(1).join("="):d;};
const W=1080, H=1920, HERE=__dirname;
const IN=arg("in", path.join(HERE,"source.jpg"));
const OUT=arg("out", path.join(HERE,"cover.jpg"));
const NAMES=arg("names",null), HEADLINE=arg("headline",null), CTA=arg("cta",null);
const T=Number(arg("t","0.15"));
const FILL=arg("fill","1")!=="0";

(async()=>{
  const browser=await puppeteer.launch({headless:"new",
    args:["--no-sandbox","--force-color-profile=srgb"]});
  const page=await browser.newPage();
  page.on("pageerror",e=>console.error("  page error:",String(e).slice(0,180)));
  await page.setViewport({width:W,height:H});

  const qp=new URLSearchParams({w:String(W),h:String(H)});
  if(NAMES) qp.set("names",NAMES);
  if(HEADLINE) qp.set("headline",HEADLINE);
  if(CTA) qp.set("cta",CTA);
  await page.goto(`file://${path.join(HERE,"reel_hairstyles.html")}?${qp}`,{waitUntil:"networkidle0"});

  const src="data:image/jpeg;base64,"+fs.readFileSync(IN).toString("base64");
  const dims=await page.evaluate((s)=>window.__load(s), src);
  await page.evaluate((t)=>window.__setT(t), T);

  /*
   * FILL THE FRAME. The Reel template fits the grid's WIDTH, which is right for
   * a 3:4 source in motion - the whole grid is visible and the bars top and
   * bottom read as letterboxing that the next beat zooms past. Held still as a
   * cover, that same bar at the top reads as a rendering fault.
   *
   * So the cover re-places the image to COVER instead: scaled until both axes
   * are filled, centred, cropping a little off each side. The heads sit well
   * inside their columns, so the crop takes background rather than hair - which
   * is worth checking by eye on a new grid, because it is a property of how the
   * image was generated and not something this can guarantee.
   */
  if(FILL){
    await page.evaluate(({W,H})=>{
      const el=document.querySelector(".viewport img");
      const nw=el.naturalWidth, nh=el.naturalHeight;
      const s=Math.max(W/nw, H/nh);
      el.style.transform=`translate(${(W-nw*s)/2}px, ${(H-nh*s)/2}px) scale(${s})`;
    },{W,H});
  }

  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  await page.screenshot({path:OUT, type:"jpeg", quality:92});
  await browser.close();

  const kb=Math.round(fs.statSync(OUT).size/1024);
  console.log(`  ${dims.w}x${dims.h} -> ${W}x${H} @ t=${T}   ${path.basename(OUT)}  ${kb}KB`);
  if(kb>8*1024) console.error("  WARNING: over Instagram's 8MB cover limit");
})();
