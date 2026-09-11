#!/usr/bin/env node
/**
 * Composite a bald stripe onto a generated still.
 *
 *   node scripts/instagram/stripe.js --in a.png --out b.png --x 0.42 --y 0.24 \
 *        --len 0.20 --wide 0.045 --angle -18
 *
 * WHY THIS EXISTS. The image model draws the stripe reliably only when the
 * stripe is the SUBJECT of the frame. In a wide shot, where it is incidental
 * detail on a small head, it gets dropped or turned into full baldness — three
 * attempts, three different wrong answers. That is the same failure as asking
 * for a clipper guard and getting nothing: generation is good at composition
 * and unreliable at a specific required detail.
 *
 * So the split is the one that has worked everywhere else in this pipeline:
 * GENERATE THE PICTURE, DRAW THE DETAIL. The stripe is four numbers and a
 * rotation, it lands in the same place every run, and it can be nudged without
 * re-rolling the whole image and losing the composition that was already right.
 *
 * The fill is SAMPLED FROM THE IMAGE rather than named. Each generation comes
 * back a slightly different sage, and a hardcoded green would sit on the head
 * like a sticker.
 *
 * TWO SHAPES, and the difference is the whole story of this film. `--shape
 * stripe` draws the clean shaved channel we started with; `--shape patch` draws
 * a ragged torn oval, which is what a guard falling off actually leaves. The
 * stripe read as a deliberate design and the patch reads as damage, so every
 * shot after the guard drops wants the patch.
 *
 * The patch edge is jittered from a SEEDED generator, so the same arguments
 * give byte-identical output every run. A random edge would shimmer between
 * shots that are supposed to show one continuous injury.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

(async () => {
  const inFile = path.resolve(arg("in", ""));
  const outFile = path.resolve(arg("out", ""));
  if (!fs.existsSync(inFile)) throw new Error(`no such file: ${inFile}`);

  const o = {
    x: Number(arg("x", 0.5)),          // centre of the stripe, 0..1 of width
    y: Number(arg("y", 0.25)),         // centre, 0..1 of height
    len: Number(arg("len", 0.18)),     // length as a fraction of image height
    wide: Number(arg("wide", 0.04)),   // width as a fraction of image width
    angle: Number(arg("angle", 0)),    // degrees, 0 = straight up the head
    ink: Number(arg("ink", 3.2)),      // outline weight in px at 1000px wide
    // Where to sample the bare-scalp colour from. Defaults to a patch of plain
    // background, which is the same sage the skin is drawn in.
    sx: Number(arg("sx", 0.06)),
    sy: Number(arg("sy", 0.06)),
    shape: String(arg("shape", "stripe")),
    seed: Number(arg("seed", 7)),      // patch only: which ragged edge you get
    jag: Number(arg("jag", 0.18)),     // patch only: 0 = smooth oval, 0.3 = torn
    smooth: Number(arg("smooth", 1)),  // patch only: 0 = star, 1 = torn, 2 = oval
  };

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const dataUrl = "data:image/png;base64," + fs.readFileSync(inFile).toString("base64");

  const png = await page.evaluate(async (src, o) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    g.drawImage(img, 0, 0);

    const px = g.getImageData(Math.round(o.sx * W), Math.round(o.sy * H), 1, 1).data;
    const fill = `rgb(${px[0]},${px[1]},${px[2]})`;

    const cx = o.x * W, cy = o.y * H;
    const len = o.len * H, half = (o.wide * W) / 2;

    g.save();
    g.translate(cx, cy);
    g.rotate((o.angle * Math.PI) / 180);

    if (o.shape === "patch") {
      /*
       * A torn oval. Points are laid around an ellipse and pushed in and out by
       * a seeded generator, then joined through their midpoints so the outline
       * curves instead of showing the polygon corners.
       */
      let s = o.seed * 9301 + 49297;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      const N = 16;
      /*
       * The radii are SMOOTHED before use. Independent jitter per point makes a
       * star, because neighbouring points swing opposite ways and the curve has
       * to spike between them. Averaging each radius with its neighbours around
       * the ring leaves the same amount of deviation spread over lobes, which
       * is what a torn edge actually looks like.
       */
      let k = [];
      for (let i = 0; i < N; i++) k.push(1 + (rnd() - 0.5) * 2 * o.jag);
      for (let pass = 0; pass < o.smooth; pass++) {
        k = k.map((v, i) => (k[(i - 1 + N) % N] + v * 2 + k[(i + 1) % N]) / 4);
      }
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push([Math.cos(a) * half * k[i], Math.sin(a) * (len / 2) * k[i]]);
      }
      g.beginPath();
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      let m = mid(pts[N - 1], pts[0]);
      g.moveTo(m[0], m[1]);
      for (let i = 0; i < N; i++) {
        const nx = mid(pts[i], pts[(i + 1) % N]);
        g.quadraticCurveTo(pts[i][0], pts[i][1], nx[0], nx[1]);
      }
      g.closePath();
    } else {
      /*
       * Rounded ends. A stripe with square ends reads as a rectangle stuck on the
       * head; a shaved channel is bounded by the curve of the clipper head.
       */
      g.beginPath();
      g.moveTo(-half, -len / 2 + half);
      g.quadraticCurveTo(-half, -len / 2, 0, -len / 2);
      g.quadraticCurveTo(half, -len / 2, half, -len / 2 + half);
      g.lineTo(half, len / 2 - half);
      g.quadraticCurveTo(half, len / 2, 0, len / 2);
      g.quadraticCurveTo(-half, len / 2, -half, len / 2 - half);
      g.closePath();
    }

    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = "#1a1a1a";
    g.lineWidth = (o.ink * W) / 1000;
    g.lineJoin = "round";
    g.stroke();
    g.restore();

    return cv.toDataURL("image/png");
  }, dataUrl, o);

  await browser.close();
  fs.writeFileSync(outFile, Buffer.from(png.split(",")[1], "base64"));
  console.log(`  ${path.basename(inFile)} -> ${path.basename(outFile)}  (${o.shape} x ${o.x} y ${o.y} len ${o.len} wide ${o.wide} angle ${o.angle})`);
})();
