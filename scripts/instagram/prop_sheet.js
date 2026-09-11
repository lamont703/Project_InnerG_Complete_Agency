#!/usr/bin/env node
/**
 * Contact sheet for the props and the camera, drawn by the reel's own code.
 *
 *   node scripts/instagram/prop_sheet.js --out experiments/faces/props.png
 *
 * Top row is the guard doing the only thing the film needs it to do: seated,
 * slipping, gone, then lying on the floor. Bottom row is the same scene at
 * three camera zooms, which is the claim the camera has to survive — one world,
 * three shots, nothing redrawn.
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
  const out = arg("out", "experiments/faces/props.png");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await p.goto("file://" + path.resolve("scripts/instagram/stickman_reel.html"), { waitUntil: "domcontentloaded" });

  await p.evaluate(() => {
    const cv = document.getElementById("c");
    cv.width = 1440; cv.height = 1000;
    g.fillStyle = "#f2efe9"; g.fillRect(0, 0, 1440, 1000);
    g.strokeStyle = "#1e2430";

    const label = (t, x, y) => {
      g.save(); g.fillStyle = "#1e2430";
      g.font = "600 22px Helvetica, Arial, sans-serif"; g.textAlign = "center";
      g.fillText(t, x, y); g.restore();
    };

    // ---- top row: the guard's whole arc
    const S = 120, y0 = 210;
    clippers(180, y0, S, 0, { guard: true });        label("seated", 180, y0 + 190);
    clippers(460, y0, S, 0, { guard: 0.55 });        label("slipping", 460, y0 + 190);
    clippers(740, y0, S, 0, { guard: false });       label("gone", 740, y0 + 190);
    guardComb(1010, y0 + 40, S, 0.9);                label("fallen", 1010, y0 + 190);
    handMirror(1270, y0 + 20, S, 0, {
      reflect: (rx, ry) => {
        // A HEAD in the glass, not just features. drawFace draws no outline, so
        // without this circle the mirror's own rim becomes the skull and the
        // whole prop reads as a face on a stick.
        const hy = -ry * 1.6;
        g.beginPath(); g.arc(0, hy, ry * 0.95, 0, Math.PI * 2); g.stroke();
        drawFace(0, hy, ry * 0.95, 0, EXPR.horror);
      },
    });
    label("mirror + reflection", 1270, y0 + 190);

    // ---- bottom row: one scene, three zooms
    const zooms = [1, 2.4, 5.5];
    zooms.forEach((z, i) => {
      const ox = 60 + i * 460, oy = 470, bw = 400, bh = 460;
      g.save();
      g.beginPath(); g.rect(ox, oy, bw, bh); g.clip();
      g.strokeStyle = "#c9c3b8"; g.lineWidth = 2;
      g.strokeRect(ox + 0.5, oy + 0.5, bw - 1, bh - 1);

      // draw the tiny scene in its own space, then let the camera choose the frame
      g.save();
      g.translate(ox, oy);
      g.beginPath(); g.rect(0, 0, bw, bh); g.clip();
      const cam = { x: 150, y: 235, zoom: z };
      g.save();
      // Use the shipping camera, not a copy of its maths.
      const _W = W, _H = H;
      g.translate(bw / 2 - _W / 2, bh / 2 - _H / 2);
      applyCamera(cam);
      g.strokeStyle = "#1e2430"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 330); g.lineTo(400, 330); g.stroke();   // floor
      figure(150, 330, 105, POSES.cut, 0, { expr: EXPR.calm, color: "#1e2430", weight: 0.030 });
      clippers(150, 235, 30, 0.35, { guard: 0.4 });
      g.restore();
      g.restore();
      g.restore();
      label(`camera zoom ${z}x`, ox + bw / 2, oy + bh + 34);
    });
  });

  await p.screenshot({ path: out });
  await browser.close();
  console.log(`  -> ${out}`);
})();
