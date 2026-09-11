#!/usr/bin/env node
/**
 * Fade a film to black and append a ShearQuery end card.
 *
 *   node scripts/instagram/end_card.js --in=film.mp4 --out=film-credits.mp4
 *   node scripts/instagram/end_card.js --in=... --secs=5 --fade=0.9 \
 *        --cast="THE BARBER:himself,THE CLIENT:himself"
 *
 * THE WORDMARK IS THE ONE FIXED THING. "Shear" in #ffffff and "Query" in
 * #00b2de, the same split brand_image.js and reel_hairstyles.html use. A
 * single-colour ShearQuery is not the logo, and an end card is the last thing
 * a viewer sees, so it is the worst place to get it wrong.
 *
 * WHY PUPPETEER AND NOT drawtext. The bundled ffmpeg here is built WITHOUT
 * libfreetype — `drawtext` does not exist and fails with "No such filter",
 * which reads like a syntax error rather than a missing feature. Chrome has the
 * system fonts and gives real kerning, and this is typography rather than a
 * label.
 *
 * THE FILM FADES TO BLACK BEFORE THE CARD, and the card fades UP FROM black
 * rather than cutting in. A hard cut from the last shot to a credits card reads
 * as the file being joined; a fade reads as the show ending. That is the whole
 * point of doing this rather than pasting a title on the end.
 *
 * THE CARD IS SILENT ON PURPOSE. Whatever plays over it — laughter, music — is
 * laid on afterwards with add_sfx.js so it can START INSIDE THE FILM and carry
 * across the join. Sound that begins exactly where the picture changes draws
 * attention to the join instead of hiding it.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");
const puppeteer = require("puppeteer");

const FF = path.join(__dirname, "..", "..", "node_modules", "ffmpeg-static", "ffmpeg");
const FG = "#ffffff";
const ACCENT = "#00b2de";

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const IN = arg("in");
const OUT = arg("out");
const SECS = Number(arg("secs", 5));
const FADE = Number(arg("fade", 0.9));
const CAST = arg("cast", "THE BARBER:himself,THE CLIENT:himself");
const TAGLINE = arg("tagline", "shearquery.com");

function dimensions(file) {
  const r = spawnSync(FF, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const s = r.stderr || "";
  const m = s.match(/Video:.*?,\s*(\d+)x(\d+)/);
  const d = s.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const f = s.match(/,\s*([\d.]+) fps/);
  if (!m || !d) throw new Error(`could not read ${file}`);
  return {
    w: Number(m[1]), h: Number(m[2]),
    duration: Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]),
    fps: f ? Number(f[1]) : 30,
    hasAudio: /Stream #\d+:\d+.*: Audio:/.test(s),
  };
}

async function renderCard(w, h, file) {
  const S = Math.min(w, h);
  /*
   * "--" as an entry inserts a gap. Cast and crew are different KINDS of credit
   * and running them as one list of four makes the producer look like a
   * character in the film.
   */
  const rows = CAST.split(",").filter(Boolean).map((pair) => {
    if (pair.trim() === "--") return `<div class="gap"></div>`;
    const [role, who] = pair.split(":");
    return `<div class="row"><span class="role">${role.trim()}</span>
              <span class="dots"></span>
              <span class="who">${(who || "").trim()}</span></div>`;
  }).join("");

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#000;height:${h}px;width:${w}px}
  .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:${h}px;font-family:"Helvetica Neue",Inter,system-ui,sans-serif;color:${FG}}
  .mark{font-size:${S * 0.108}px;font-weight:700;letter-spacing:-0.02em;line-height:1}
  .mark .q{color:${ACCENT}}
  .rule{width:${S * 0.42}px;height:${Math.max(1, S * 0.002)}px;
        background:rgba(255,255,255,.28);margin:${S * 0.055}px 0 ${S * 0.05}px}
  /*
   * The dotted leader is a real flex spacer, not typed dots. Typed dots do not
   * line up when the two role names differ in length, which is exactly the
   * thing a credits list is supposed to get right.
   */
  .row{display:flex;align-items:baseline;width:${S * 0.80}px;
       font-size:${S * 0.036}px;letter-spacing:0.04em;margin:${S * 0.017}px 0}
  .role{white-space:nowrap;opacity:.92}
  .dots{flex:1;margin:0 ${S * 0.014}px;
        border-bottom:${Math.max(1, S * 0.0022)}px dotted rgba(255,255,255,.34);
        transform:translateY(-${S * 0.006}px)}
  .who{white-space:nowrap;opacity:.75;font-style:italic}
  .gap{height:${S * 0.034}px}
  /* Sized for a phone held at arm's length, not for a desktop preview. At the
   * first pass the type sat in the middle third of a 9:16 frame with dead black
   * above and below, which reads as a placeholder rather than as an end card. */
  .tag{margin-top:${S * 0.070}px;font-size:${S * 0.029}px;
       letter-spacing:0.16em;color:rgba(255,255,255,.55)}
</style>
<div class="wrap">
  <div class="mark">Shear<span class="q">Query</span></div>
  <div class="rule"></div>
  ${rows}
  <div class="tag">${TAGLINE}</div>
</div>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: "png" });
  await browser.close();
}

async function main() {
  if (!IN || !OUT) throw new Error("--in and --out are both required");
  if (!fs.existsSync(IN)) throw new Error(`no such file: ${IN}`);
  if (path.resolve(IN) === path.resolve(OUT)) {
    throw new Error("--out must differ from --in; refusing to overwrite the source");
  }

  const { w, h, duration, fps, hasAudio } = dimensions(IN);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sqcard-"));
  const png = path.join(tmp, "card.png");
  await renderCard(w, h, png);

  /* The film, fading to black over its last FADE seconds. Re-encoded — a fade
   * is a picture change, so there is no stream-copy path. Audio is copied. */
  const faded = path.join(tmp, "faded.mp4");
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", IN,
    "-vf", `fade=t=out:st=${(duration - FADE).toFixed(3)}:d=${FADE}`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "copy", faded], { stdio: "inherit" });

  /* The card, fading UP from black so the join is a dissolve, not a cut. */
  const card = path.join(tmp, "card.mp4");
  /*
   * EVERY INPUT BEFORE ANY OUTPUT OPTION. ffmpeg rejects a -vf that appears
   * between two -i flags with "you are trying to apply an input option to an
   * output file or vice versa", which names the symptom rather than the
   * ordering rule. Inputs first, then the filter and the codecs.
   */
  const cardArgs = ["-y", "-hide_banner", "-loglevel", "error",
    "-loop", "1", "-t", String(SECS), "-i", png];
  /* Silent audio of matching layout, or concat drops the film's track. */
  if (hasAudio) cardArgs.push("-f", "lavfi", "-t", String(SECS), "-i", "anullsrc=r=48000:cl=stereo");
  cardArgs.push(
    "-vf", `fade=t=in:st=0:d=0.6,fps=${fps},format=yuv420p`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18");
  if (hasAudio) cardArgs.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  cardArgs.push(card);
  execFileSync(FF, cardArgs, { stdio: "inherit" });

  const list = path.join(tmp, "concat.txt");
  fs.writeFileSync(list, `file '${faded}'\nfile '${card}'\n`);
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : []),
    "-movflags", "+faststart", path.resolve(OUT)], { stdio: "inherit" });

  console.log(`  ${w}x${h}  film ${duration.toFixed(1)}s + card ${SECS}s, ${FADE}s fade to black`);
  console.log(`  -> ${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(1)}MB`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
