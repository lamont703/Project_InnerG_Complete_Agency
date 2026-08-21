#!/usr/bin/env node
/**
 * Extend a 4:5 photo to 9:16 by generating ONLY the strips above and below.
 *
 *   node experiments/depth-outpaint/outpaint.js
 *
 * THE ORIGINAL IS NEVER TOUCHED. The source is composited back over the model's
 * output at full resolution and exact position after generation, so whatever
 * the model did inside that rectangle is discarded. The haircut, the face, the
 * line work and the shop are the photograph, byte for byte; only ceiling and
 * floor are invented.
 *
 * WHY THIS BEATS CROPPING, which is the honest comparison. Fitting 1440x1800
 * into 9:16 by cropping throws away 44% of the picture - and it crops the
 * SIDES, where the barber, the chair and the shop are. Outpainting keeps all of
 * it and invents the two least informative bands in any barbershop photo.
 *
 * RISK IS CONTAINED BY CONSTRUCTION. A bad generation is bad at the extreme top
 * and bottom, behind a vignette, in the part of a vertical video that the UI
 * covers with a caption and a username anyway.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const HERE = __dirname;
const SRC = path.join(HERE, "source.jpg");
const MODEL = process.argv.find((a) => a.startsWith("--model="))?.split("=")[1] || "gemini-3-pro-image";
const W = 1080, H = 1920;

/** Source scaled to the full 9:16 WIDTH, centred; the gap is what gets invented. */
function layout(srcW, srcH) {
  const drawW = W;
  const drawH = Math.round((srcH / srcW) * W);
  const top = Math.round((H - drawH) / 2);
  return { drawW, drawH, top, bottom: H - drawH - top };
}

(async () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  // `ffmpeg -i` with no output is the standard way to probe, and it exits
  // non-zero by design - so the dimensions have to be read off the thrown
  // error's stderr rather than from a successful run.
  let stderr = "";
  try { execFileSync(ffmpeg, ["-i", SRC], { stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { stderr = String(e.stderr || ""); }
  const dim = /,\s(\d{3,5})x(\d{3,5})[\s,]/.exec(stderr);
  if (!dim) throw new Error("could not read source dimensions");
  const [srcW, srcH] = [+dim[1], +dim[2]];
  const L = layout(srcW, srcH);
  console.log(`  source ${srcW}x${srcH} -> fills ${L.drawW}x${L.drawH} of ${W}x${H}`);
  console.log(`  to generate: ${L.top}px above, ${L.bottom}px below  (${Math.round((L.top+L.bottom)/H*100)}% of the frame)`);

  // Canvas: the photo centred on a 9:16 field, with the strips left grey so the
  // model can see exactly what it is being asked to fill.
  const canvas = path.join(HERE, "_canvas.png");
  execFileSync(ffmpeg, [
    "-y", "-i", SRC,
    "-vf", `scale=${L.drawW}:${L.drawH},pad=${W}:${H}:0:${L.top}:color=0x7f7f7f`,
    canvas,
  ], { stdio: "pipe" });

  const b64 = fs.readFileSync(canvas).toString("base64");
  const prompt = [
    "This is a photograph of a barbershop interior, centred on a taller canvas.",
    "The grey bands at the top and bottom are empty and must be filled in.",
    "Extend the scene naturally into those bands only: ceiling, lighting and upper wall above;",
    "the barber chair, cape and floor below.",
    "Match the existing lighting, colour temperature, grain and perspective exactly.",
    "Do not alter, redraw or move anything in the photographed area.",
    "Do not add people, faces, text, logos or signage.",
    "Photorealistic, same camera, same depth of field.",
  ].join(" ");

  console.log(`  model: ${MODEL}`);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: "image/png", data: b64 } } ] }],
      }),
    }
  );
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);

  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  if (!part) {
    console.log("  no image returned:", JSON.stringify(j).slice(0, 300));
    return;
  }
  const raw = path.join(HERE, "_generated.png");
  fs.writeFileSync(raw, Buffer.from((part.inlineData || part.inline_data).data, "base64"));
  console.log(`  generated: ${Math.round(fs.statSync(raw).size/1024)}KB`);

  /*
   * THE STEP THAT MAKES THIS SAFE. Whatever the model produced inside the
   * photograph's rectangle is thrown away and replaced with the original at
   * full resolution. Skip this and you are trusting the model not to have
   * touched the haircut - and it will have, subtly, every time.
   */
  const out = path.join(HERE, "outpainted.png");
  execFileSync(ffmpeg, [
    "-y",
    "-i", raw, "-i", SRC,
    "-filter_complex",
      `[0:v]scale=${W}:${H}[bg];[1:v]scale=${L.drawW}:${L.drawH}[fg];[bg][fg]overlay=0:${L.top}`,
    out,
  ], { stdio: "pipe" });

  console.log(`\n  ${out}`);
  console.log("  original re-composited on top: every photographed pixel is the photograph.");
})();
