#!/usr/bin/env node
/**
 * Screenshot the AR overlay lab, headless.
 *
 * WHY. The overlay could previously only be observed by a person holding a
 * phone in front of a head. That is a feedback loop with a human in it, which
 * means it does not run when nobody is looking — and every geometry change was
 * reviewed by reading the maths rather than by looking at the result.
 *
 * This renders /ar-lab in Chrome and writes a PNG. The picture can then be
 * opened by anyone, attached to a review, diffed against a previous run, or
 * read by an assistant with no camera.
 *
 *   node scripts/ar_lab_shot.js                       # pose grids only
 *   node scripts/ar_lab_shot.js --image path/to.jpg   # also run a real photo
 *   node scripts/ar_lab_shot.js --images ar-fixtures        # a whole fixture set
 *   node scripts/ar_lab_shot.js --profile .ar-lab-profile   # keep calibration marks
 *   node scripts/ar_lab_shot.js --port 3400 --out x.png
 *
 * CALIBRATION. Marks are made by clicking heads in the browser and are stored in
 * localStorage, so they belong to whichever profile made them. Pass --profile to
 * give headless runs somewhere durable; otherwise measure in a real browser and
 * read the summary off the page.
 *
 * The dev server must already be running — this script deliberately does not
 * start one. /ar-lab 404s in production builds (app/ar-lab/layout.tsx), so
 * pointing this at a production deployment gets you a picture of a 404 page,
 * which is the correct outcome rather than a bug to work around.
 *
 * The --image path is read from local disk by the browser's file input. It is
 * never uploaded and must not be committed: fixture photographs of real heads
 * do not belong in this repository. Keep them somewhere gitignored.
 */

const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const PORT = arg('port', '3400')
const IMAGE = arg('image', null)
const IMAGES = arg('images', null)
const OUT = path.resolve(arg('out', 'ar-lab-shot.png'))
// Calibration marks live in the browser's localStorage. Puppeteer makes a fresh
// throwaway profile per launch, so without a persistent one every headless run
// starts with nothing measured and the calibration block is always empty.
const PROFILE = arg('profile', null)
const URL = `http://localhost:${PORT}/ar-lab`

;(async () => {
  // --images <dir> is the normal way to run this: the real-head question is
  // comparative, and one fixture only tells you the overlay landed somewhere
  // plausible on one head.
  let files = []
  if (IMAGES) {
    if (!fs.existsSync(IMAGES)) {
      console.error(`No such directory: ${IMAGES}`)
      process.exit(1)
    }
    files = fs
      .readdirSync(IMAGES)
      .filter((f) => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f))
      .sort()
      .map((f) => path.resolve(IMAGES, f))
    if (!files.length) {
      console.error(`No images in ${IMAGES}`)
      process.exit(1)
    }
  } else if (IMAGE) {
    if (!fs.existsSync(IMAGE)) {
      console.error(`No such image: ${IMAGE}`)
      process.exit(1)
    }
    files = [path.resolve(IMAGE)]
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    ...(PROFILE ? { userDataDir: path.resolve(PROFILE) } : {}),
    // The lab draws to 2D canvases and, for the real-image panel, asks
    // MediaPipe for a GPU delegate. Headless Chrome falls back to CPU on its
    // own; these flags just stop it complaining about a missing sandbox in
    // container environments.
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1400, height: 1200, deviceScaleFactor: 2 })

    const problems = []
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
    page.on('pageerror', (e) => problems.push(String(e)))

    const res = await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
    if (!res || !res.ok()) {
      throw new Error(`${URL} returned ${res ? res.status() : 'no response'} — is the dev server up on ${PORT}?`)
    }

    // The tiles render in an effect after mount. Wait for the measured-yaw
    // readouts to appear rather than for a fixed delay, which would be a race
    // that passes on a fast machine and writes a blank sheet on a slow one.
    await page.waitForFunction(
      () => document.body.innerText.split('measured').length > 8,
      { timeout: 30000 }
    )

    if (files.length) {
      const input = await page.$('#ar-lab-file')
      if (!input) throw new Error('File input not found on the page.')
      await input.uploadFile(...files)
      // MediaPipe fetches ~16MB of wasm and model on first use, then each image
      // is fast. Waits for the panel to report a terminal status rather than
      // for a fixed delay, which would truncate the set on a slow machine.
      await page.waitForFunction(
        () => /Done — |Failed: /.test(document.body.innerText),
        { timeout: 180000 }
      )
    }

    await page.screenshot({ path: OUT, fullPage: true })

    // Pull the self-check out as text too. A drift line in the terminal is
    // greppable and diffable in a way a PNG is not, and it is the thing that
    // catches a sheet that looks fine and is measuring the wrong angles.
    const readouts = await page.$$eval('p.font-mono', (ps) => ps.map((p) => p.innerText.trim()))
    const drifting = readouts.filter((r) => r.includes('drift'))

    console.log(`Wrote ${OUT}`)
    console.log(`${readouts.length} readouts, ${drifting.length} drifting`)
    for (const d of drifting) console.log(`  DRIFT  ${d}`)
    if (files.length) {
      // Print the per-fixture ordering verdicts. These are the assertions that
      // survive a picture looking fine: an ear landing above a temple on a real
      // head means the landmark indices are wrong for that head, and no amount
      // of squinting at the overlay makes that obvious.
      const rows = await page.$$eval('section:last-of-type .grid > div', (cards) =>
        cards.map((c) => c.innerText.split('\n').filter(Boolean).join(' | '))
      )
      console.log(`  ${rows.length} fixtures:`)
      for (const r of rows) console.log(`    ${r}`)
    }
    // Calibration marks live in localStorage, so they survive between runs and
    // this prints whatever has been measured so far. A mean that exists only as
    // pixels in a screenshot cannot be pasted into a constant.
    const calibration = await page
      .$eval('#calibration-summary', (el) => (el.value ?? el.innerText ?? '').trim())
      .catch(() => null)
    if (calibration && !/^Parietal ridge — no marks yet/.test(calibration)) {
      console.log('\n' + calibration + '\n')
    }

    for (const p of problems.slice(0, 10)) console.log(`  console error: ${p}`)

    process.exitCode = drifting.length ? 1 : 0
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
