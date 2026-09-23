#!/usr/bin/env node
/**
 * SCRIPTED PRODUCT DEMO, RECORDED FROM INSIDE THE BROWSER.
 *
 *   node scripts/demo/record-demo.js --url=https://shearquery.com/search \
 *     --ask="how much is booth rent in houston" --out=search-demo
 *   node scripts/demo/record-demo.js --beats=scripts/demo/beats/gbp-audit.json --out=gbp-audit
 *
 * A BEAT FILE IS THE SCRIPT, so a second demo is data rather than a second
 * copy of this file: { url, beats: [ {click:{placeholder|text|selector}},
 * {type:"..."}, {wait:6}, {scroll:400}, {move:[x,y]} ] }. --ask is the shorthand
 * for the one-box case and still works.
 *
 * WHY FRAMES AND NOT page.screencast(). Puppeteer's recorder DIES AT THE FIRST
 * NAVIGATION — measured 2026-09-22: pressing Enter on the search box loaded the
 * results page, the capture ended there (4.5s of a 30s take) and rec.stop()
 * then never resolved. CDP screencast frames are taken per paint and simply
 * continue across navigations, so the beats after Enter — which are the whole
 * point of a product demo — are actually in the file.
 *
 * FRAMES ARRIVE ONLY WHEN THE PAGE PAINTS, so each is written with its arrival
 * time and the video is assembled from a concat list of real durations. Pushing
 * them through a fixed -framerate instead speeds up quiet moments and slows busy
 * ones, which is the tell that something was assembled rather than recorded.
 *
 * WHY NOT A SCREEN RECORDING. macOS screen capture is a TCC permission, and
 * when it is not in force avfoundation hands ffmpeg a device that never
 * delivers a frame — measured 2026-09-22: `frame= 0`, "More than 1000 frames
 * duplicated", and no error, so the capture HANGS rather than failing. The
 * first version of this script waited on that ffmpeg forever and left a Chrome
 * window sitting open for six minutes. Puppeteer's own screencast needs no
 * permission, cannot catch a notification or another window, and comes out at
 * device pixel ratio (2560x1440 here), which is sharper than a scaled screen
 * grab. What it costs is the browser chrome: no URL bar, no tabs.
 *
 * EVERY WAIT IS BOUNDED. The hang above is the reason. No await in the timeline
 * can outlive HARD_TIMEOUT_MS, and the process exits non-zero with a reason
 * rather than sitting there looking busy.
 *
 * SCRIPTED, NOT DRIVEN LIVE. An agent clicking a page issues one tool call at a
 * time, seconds apart, and reads as a laggy robot on video. The beats below are
 * played back at human pace — typing jitter, a cursor that eases between
 * targets, a click ripple — which is what makes a take look like somebody who
 * knows where everything is.
 *
 * ffmpeg MUST BE ON PATH for screencast(): puppeteer shells out to a bare
 * `ffmpeg` and dies with spawnSync ENOENT otherwise. ffmpeg-static's directory
 * is prepended here rather than asking anyone to install ffmpeg.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const FFMPEG = require("ffmpeg-static");

process.env.PATH = `${path.dirname(FFMPEG)}:${process.env.PATH}`;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const URL_ = arg("url", "https://shearquery.com/search");
const ASK = arg("ask", "how much is booth rent in houston");
const OUT = arg("out", "demo");
const OUTDIR = arg("outdir", "experiments/demo-recordings");
const W = Number(arg("w", 1280)), H = Number(arg("h", 720));
const ANSWER_WAIT = Number(arg("answer-wait", 12)) * 1000;
const HARD_TIMEOUT_MS = Number(arg("timeout", 180)) * 1000;
const BEATS = arg("beats", null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* Every step is bounded AND named: when one stalls the log says which, instead
   of the run simply stopping. Learned the expensive way — the first stall was
   invisible because every await looked identical from outside. */
const step = (name, promise, ms = 25000) =>
  Promise.race([
    Promise.resolve(promise),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`step stalled: ${name}`)), ms)),
  ]);
const t0 = Date.now();
const log = (m) => console.log(`  [${String((Date.now() - t0) / 1000).padStart(5)}s] ${m}`);

/* A drawn cursor: Chrome renders no pointer for synthetic events, and without
   one the page appears to operate itself, which is the clearest tell of a bot. */
const CURSOR_JS = `
  window.__cur = (() => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;z-index:2147483647;width:20px;height:20px;border-radius:50%;" +
      "background:rgba(15,23,42,.9);box-shadow:0 0 0 3px rgba(255,255,255,.95),0 6px 14px rgba(0,0,0,.4);" +
      "left:0;top:0;pointer-events:none";
    document.body.appendChild(d);
    let x = 120, y = 520;
    const put = () => (d.style.transform = \`translate(\${x}px,\${y}px)\`);
    put();
    return {
      at: () => ({ x, y }),
      to(nx, ny, ms = 800) {
        const sx = x, sy = y, t = performance.now();
        return new Promise((res) => {
          const step = (now) => {
            const p = Math.min(1, (now - t) / ms);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            x = sx + (nx - sx) * e; y = sy + (ny - sy) * e; put();
            p < 1 ? requestAnimationFrame(step) : res();
          };
          requestAnimationFrame(step);
        });
      },
      click() {
        const r = document.createElement("div");
        r.style.cssText = \`position:fixed;z-index:2147483646;left:\${x - 16}px;top:\${y - 16}px;width:52px;height:52px;\` +
          "border-radius:50%;border:3px solid rgba(37,99,235,.95);pointer-events:none;transition:all .5s ease-out";
        document.body.appendChild(r);
        requestAnimationFrame(() => { r.style.transform = "scale(1.9)"; r.style.opacity = "0"; });
        setTimeout(() => r.remove(), 560);
      },
    };
  })();
`;

async function run() {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const mp4 = path.join(OUTDIR, `${OUT}.mp4`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--window-size=${W},${H + 120}`, "--window-position=40,60", "--no-first-run",
      "--no-default-browser-check", "--hide-crash-restore-bubble", "--disable-features=Translate"],
  });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  const startUrl = BEATS ? (JSON.parse(fs.readFileSync(BEATS, "utf8")).url || URL_) : URL_;
  log(`opening ${startUrl}`);
  await step("goto", page.goto(startUrl, { waitUntil: "networkidle2", timeout: 45000 }), 50000);
  await page.evaluate(CURSOR_JS);
  await sleep(600);

  const framesDir = path.join(OUTDIR, `.${OUT}-frames`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const frames = [];
  let client = await page.createCDPSession();
  const startCast = async () => {
    await client.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 2560, maxHeight: 1440, everyNthFrame: 1 });
  };
  client.on("Page.screencastFrame", async ({ data, sessionId }) => {
    const f = path.join(framesDir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, "base64"));
    frames.push({ file: f, t: Date.now() });
    try { await client.send("Page.screencastFrameAck", { sessionId }); } catch {}
  });
  /* A navigation detaches the old session; a fresh one keeps the take going. */
  page.on("framenavigated", async (fr) => {
    if (fr !== page.mainFrame()) return;
    try { client = await page.createCDPSession(); client.on("Page.screencastFrame", async ({ data, sessionId }) => {
      const f = path.join(framesDir, `f${String(frames.length).padStart(5, "0")}.jpg`);
      fs.writeFileSync(f, Buffer.from(data, "base64"));
      frames.push({ file: f, t: Date.now() });
      try { await client.send("Page.screencastFrameAck", { sessionId }); } catch {}
    }); await startCast(); log("capture resumed after navigation"); } catch (e) { log(`capture resume failed: ${e.message}`); }
  });
  await startCast();
  log("recording (CDP frames)");
  await sleep(1200);

  /* ---- beat file: the general case ---- */
  if (BEATS) {
    const spec = JSON.parse(fs.readFileSync(BEATS, "utf8"));
    for (const [i, beat] of (spec.beats || []).entries()) {
      const label = Object.keys(beat).join("+");
      log(`beat ${i + 1}/${spec.beats.length}: ${label}`);
      if (beat.click) {
        /*
         * TWO PHASES, AND THE ORDER IS THE BUG THIS FIXES. Scrolling an element
         * into view and measuring it in the same tick returns the rect from
         * BEFORE the scroll, so the click lands somewhere else and the demo
         * records an empty form with a confident cursor — measured 2026-09-22.
         * Scroll, let it settle, then measure.
         */
        const find = (sel) => page.evaluate((s2) => {
          const vis = (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
          const fields = [...document.querySelectorAll("input,textarea")].filter(vis);
          let el = null;
          if (s2.selector) el = document.querySelector(s2.selector);
          else if (s2.placeholder) el = fields.find((e) => (e.placeholder || "").toLowerCase().includes(s2.placeholder.toLowerCase()));
          else {
            /* ANY visible element, not just buttons and links: result rows here are
               plain divs, and restricting the search to controls made beat 8 fail
               on a row that was plainly on screen. The SMALLEST match wins, so a
               click lands on the row rather than on the section that contains it. */
            const want = (s2.text || "").toLowerCase();
            const hits = [...document.querySelectorAll("*")].filter((e) =>
              vis(e) && (e.innerText || "").toLowerCase().includes(want) && e.children.length <= 6);
            el = hits.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0] || null;
          }
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const onScreen = r.top >= 0 && r.bottom <= innerHeight;
          if (!onScreen) el.scrollIntoView({ block: "center" });
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), onScreen,
                   tag: el.tagName, ph: el.placeholder || (el.innerText || "").slice(0, 24) };
        }, sel);
        let t = await step(`find ${label}`, find(beat.click));
        if (!t) throw new Error(`beat ${i + 1}: nothing matched ${JSON.stringify(beat.click)}`);
        if (!t.onScreen) { await sleep(700); t = await step(`re-measure ${label}`, find(beat.click)); }
        log(`   -> ${t.tag} "${t.ph}" at ${t.x},${t.y}`);
        await step("cursor", page.evaluate((b) => window.__cur?.to(b.x, b.y, 850), t).catch(() => {}));
        await sleep(900);
        await page.evaluate(() => window.__cur?.click()).catch(() => {});
        await page.mouse.click(t.x, t.y);
        await sleep(400);
      }
      if (beat.type !== undefined) {
        for (const ch of String(beat.type)) await page.keyboard.type(ch, { delay: 55 + Math.random() * 80 });
        await sleep(400);
      }
      if (beat.press) { await page.keyboard.press(beat.press); await sleep(300); }
      if (beat.scroll) { await page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), beat.scroll).catch(() => {}); await sleep(1400); }
      if (beat.move) { await page.evaluate((m) => window.__cur?.to(m[0], m[1], 800), beat.move).catch(() => {}); await sleep(900); }
      if (beat.wait) await sleep(beat.wait * 1000);
    }
  } else {

  /* The search box, found by what it says rather than by a brittle selector. */
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll("input,textarea")]
      .find((e) => /ask anything|search/i.test(e.placeholder || "") && e.offsetParent !== null);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  if (!box) throw new Error("no search box on the page — nothing to demo");

  await page.evaluate((b) => window.__cur.to(b.x, b.y, 900), box);
  await sleep(950);
  await page.evaluate(() => window.__cur.click());
  await page.mouse.click(box.x, box.y);
  await sleep(400);
  log("typing the question");
  for (const ch of ASK) await page.keyboard.type(ch, { delay: 55 + Math.random() * 80 });
  await sleep(650);
  await page.keyboard.press("Enter");
  log(`asked — waiting ${ANSWER_WAIT / 1000}s for the answer`);
  await sleep(ANSWER_WAIT);
  }

  /* The answer may arrive on a NEW page (Enter navigates), which drops the
     injected cursor. Re-inject rather than assume it survived. */
  log("re-injecting cursor after any navigation");
  await step("cursor re-inject", page.evaluate(CURSOR_JS).catch(() => {}));
  log("scrolling the answer");
  await step("scroll 1", page.evaluate(() => window.scrollBy({ top: 360, behavior: "smooth" })).catch(() => {}));
  await sleep(2200);
  await step("scroll 2", page.evaluate(() => window.scrollBy({ top: 360, behavior: "smooth" })).catch(() => {}));
  await sleep(2200);

  log("stopping the capture");
  try { await client.send("Page.stopScreencast"); } catch {}
  await step("browser close", browser.close(), 20000).catch(() => {});

  if (frames.length < 10) throw new Error(`only ${frames.length} frames captured — nothing to assemble`);
  /* Real durations, so the take plays back at the speed it happened. */
  const list = path.join(framesDir, "list.txt");
  const lines = [];
  frames.forEach((fr, i) => {
    const next = frames[i + 1]?.t ?? fr.t + 80;
    lines.push(`file '${path.resolve(fr.file)}'`, `duration ${Math.max(0.02, (next - fr.t) / 1000).toFixed(3)}`);
  });
  lines.push(`file '${path.resolve(frames[frames.length - 1].file)}'`);
  fs.writeFileSync(list, lines.join("\n"));
  const secs = ((frames[frames.length - 1].t - frames[0].t) / 1000).toFixed(1);
  log(`${frames.length} frames over ${secs}s`);

  const { execFileSync } = require("child_process");
  execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "scale=1920:-2:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "medium",
    "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "ignore" });
  log(`wrote ${mp4}`);
  return mp4;
}

const bail = setTimeout(() => {
  console.error(`\n  HARD TIMEOUT after ${HARD_TIMEOUT_MS / 1000}s — killing the run rather than hanging.\n`);
  process.exit(2);
}, HARD_TIMEOUT_MS);

run().then((f) => { clearTimeout(bail); console.log(`\n  done: ${f}\n`); process.exit(0); })
  .catch((e) => { clearTimeout(bail); console.error(`\n  FAILED: ${e.message}\n`); process.exit(1); });
