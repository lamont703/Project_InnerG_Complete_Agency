#!/usr/bin/env node
/**
 * Render a silent stick-figure film, then lay the sound under it.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *        scripts/instagram/film_reel.mjs --film=the-guard
 *
 * It drives the SAME page the card reel drives, through the same window.__setT
 * seam, so there is one copy of the figure, face, prop and camera code. A second
 * renderer would be a second place for the drawing to drift.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { findFilm, filmSeconds, validateFilm, FILMS } from "@/lib/carousel/films";

const FF = path.join("node_modules", "ffmpeg-static", "ffmpeg");
const HERE = path.resolve("scripts/instagram");
const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const id = String(arg("film", ""));
const film = findFilm(id);
if (!film) {
  console.error(`pass --film=<id>. ids: ${FILMS.map((f) => f.id).join(", ")}`);
  process.exit(1);
}
const problems = validateFilm(film);
if (problems.length) {
  for (const p of problems) console.error(`REFUSED ${film.id}: ${p}`);
  process.exit(1);
}

const W = 1080, H = 1920, FPS = Number(arg("fps", 30));
const total = Math.round(filmSeconds(film) * FPS);
const outDir = arg("outdir", "experiments/films");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${film.id}.mp4`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "film-"));

console.log(`${film.title} — ${film.shots.length} shots, ${filmSeconds(film).toFixed(1)}s, ${total} frames`);

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const qp = new URLSearchParams({ w: String(W), h: String(H), film: JSON.stringify(film) });
await page.goto(`file://${path.join(HERE, "stickman_reel.html")}?${qp}`, { waitUntil: "domcontentloaded" });

process.stdout.write(`  rendering `);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.__setT(t), i / total);
  await page.screenshot({ path: path.join(tmp, String(i).padStart(5, "0") + ".png") });
  if (i % 60 === 0) process.stdout.write(".");
}
process.stdout.write(" done\n");
await browser.close();

const silent = path.join(tmp, "silent.mp4");
execFileSync(FF, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-framerate", String(FPS), "-i", path.join(tmp, "%05d.png"),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", silent,
], { stdio: "inherit" });

/*
 * The sound is a separate artefact rendered by sfx_demo.js, not something this
 * script synthesises. Keeping them apart is what let the audio be judged before
 * a single frame existed — and it means swapping in a recorded clipper later is
 * a file change, not a code change.
 */
const bed = "experiments/sfx/guard-moment.wav";
if (fs.existsSync(bed)) {
  execFileSync(FF, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", silent, "-i", bed,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", out,
  ], { stdio: "inherit" });
  console.log(`  sound: ${bed}`);
} else {
  fs.copyFileSync(silent, out);
  console.log(`  NO SOUND — ${bed} is missing; run scripts/instagram/sfx_demo.js`);
}
console.log(`\ndone  ${out}  ${(fs.statSync(out).size / 1e6).toFixed(2)}MB`);
