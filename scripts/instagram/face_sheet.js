#!/usr/bin/env node
/**
 * Contact sheet of every expression, drawn by the reel's OWN figure().
 *
 *   node scripts/instagram/face_sheet.js --out experiments/faces.png
 *
 * It calls into the page rather than reimplementing the rig, because a test
 * that draws its own faces proves nothing about the one that ships.
 */
const path = require("path");
const puppeteer = require("puppeteer");

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

(async () => {
  const out = arg("out", "experiments/faces.png");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await p.goto("file://" + path.resolve("scripts/instagram/stickman_reel.html"), { waitUntil: "domcontentloaded" });

  const names = await p.evaluate(() => {
    const names = Object.keys(EXPR);
    // Heads only, drawn LARGE. The thing under test is the face, and judging it
    // inside a 40px skull at the end of a full figure is how a bad expression
    // ships looking fine.
    const cv = document.getElementById("c");
    cv.width = 1440; cv.height = 900;
    g.fillStyle = "#f2efe9"; g.fillRect(0, 0, 1440, 900);

    const cols = 3, R = 140;
    names.forEach((n, i) => {
      const cx = 240 + (i % cols) * 480;
      const cy = 250 + Math.floor(i / cols) * 420;
      g.strokeStyle = "#1e2430";
      g.lineWidth = 7;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      drawFace(cx, cy, R, 0, EXPR[n]);
      g.fillStyle = "#1e2430";
      g.font = "600 30px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText(n, cx, cy + R + 52);
    });
    return names;
  });

  await p.screenshot({ path: out });
  await browser.close();
  console.log(`  ${names.length} expressions: ${names.join(", ")}`);
  console.log(`  -> ${out}`);
})();
