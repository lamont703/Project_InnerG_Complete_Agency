---
name: ar-overlay
description: The workflow for building and verifying the AR fade overlay — how to see what the renderer draws without a camera, how to measure a skull constant instead of guessing it, and the specific ways the checks have lied. Use when touching lib/fade-geometry, lib/fade-overlay, lib/hair-mask, components/ar/, /ar-fade-trainer or /ar-lab, or when evaluating any new AR capability.
---

# The AR overlay, and how to know whether it works

`/ar-fade-trainer` takes a finished haircut and works backwards to the
procedure — where the line sits on the skull, the guard ladder underneath it,
the order of the passes — then draws that plan on a real head through the
camera. `/ar-lab` is the harness that proves it does.

Everything in this file exists because a specific thing went wrong. The
overlay is drawn over a person's head in a shop; being confidently wrong is
worse here than being visibly broken, because a student will follow it.

---

## 1. The rule the whole thing rests on

**The live camera view must not draw anything itself.** It calls
`drawFadeOverlay` in `lib/fade-overlay.ts` and nothing else.

Before that split, the renderer lived inside a `requestAnimationFrame`
closure, so a live camera was the only thing in the universe that could
produce a frame. The overlay could not be screenshotted, diffed, or looked at
by anyone not holding a phone at a head — every judgement about the geometry
was made by reading the maths and hoping.

If the camera component grows drawing code again, the harness silently starts
validating a copy of the renderer instead of the renderer.

**The second rule:** geometry decides WHERE the fade line belongs; perception
decides WHERE THE OVERLAY MAY BE DRAWN. They compose, never merge. Heights on
the skull, the parietal ridge, the ladder spacing — deterministic arithmetic,
because that is what makes them testable and lets constants be measured. A
model that emitted "put the line here" would be neither.

---

## 2. Four tiers of verification. Use the cheapest that can fail.

**Tier 1 — synthetic poses, no subject.** `lib/fade-synthetic-head.ts` emits
the nine landmarks `buildHeadFrame` reads, at any yaw/pitch/roll. `/ar-lab`
renders sweeps from it. Catches basis errors, wrap, visibility, label
collisions. Cannot catch anything about real heads.

**Tier 2 — real photographs.** `ar-fixtures/` (gitignored). Upload to
`/ar-lab`. This is where landmark assumptions meet real hairlines and real
ears.

**Tier 3 — fake webcam.** Exercises `getUserMedia`, VIDEO running mode and the
animation loop headlessly, with a real head in frame:

    FF=$(node -e "console.log(require('@ffmpeg-installer/ffmpeg').path)")
    "$FF" -loop 1 -i ar-fixtures/HEAD.jpg -t 6 -r 15 \
      -vf "scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2" \
      -pix_fmt yuv420p -f yuv4mpegpipe /tmp/head.y4m -y

    # then launch Chrome with:
    --use-fake-ui-for-media-stream --use-fake-device-for-media-stream
    --use-file-for-fake-video-capture=/tmp/head.y4m

**Tier 4 — a real phone.** The only tier that finds lighting, performance and
iOS-specific failures. Requires HTTPS; see §5.

`node scripts/ar_lab_shot.js --images ar-fixtures --out sheet.png` drives
tiers 1–2 headless and writes a PNG. **Look at the PNG.** Three separate
classes of bug in this feature were invisible to 700+ passing tests and
obvious within one second of looking.

---

## 3. Measuring a constant instead of guessing one

`/ar-lab` calibration: pick a mode, click a tracked head where the anatomy
actually is, and `measureU` solves the height back out of that frame.

It is a **search**, not algebra, and the reason matters. `u` is a dot product
against the head's up axis, which needs a 3D point; a click gives two
coordinates. The points projecting to one pixel form a line along z, and on a
pitched head `u` varies along it. What determines the answer is the assumption
that the clicked point is on the visible surface of the skull — so the solver
scans candidate heights and keeps the ring passing closest.

That assumption is why `dist` comes back with `u`. **A click into empty space
still has a nearest ring.** Without the residual it would report a confident
number and produce a fabricated constant.

### The gate, which is not optional

- Below **n=3** the summary refuses to report. It says NOT A MEASUREMENT YET.
- Above it, actionable only when the mean delta clears **2 standard errors**.
- Residual over ~5% of head width means the click missed. Not a measurement.
- **Repeated measures of one head are not independent samples.** Average them
  into a single head before aggregating, or n and the confidence both inflate.

### Tag the population. Never pool.

A child is not a small adult. The braincase reaches near-adult size years
before the face does, so a child's face is proportionally short against their
skull — and every level in `fade-geometry` is denominated in face heights.

That splits the constants in two, and the data behaves as the split predicts:

- **Cranium-to-cranium** (forehead landmark to parietal ridge) held to within
  0.02 on adults *and* on the child.
- **Cranium-to-face** (the ear-top proxy, ear against eye corner) diverged:
  two adults at ~+0.10, the child at −0.004.

So face-referenced levels are the fragile ones. `PERIMETER_BELOW_EAR` hangs
off `earCanal`, which comes from face-oval landmarks, and is unmeasured.

### Label constants by how they were established

Three kinds live in `fade-geometry.ts` and they must not look alike:

| Kind | Example | Rule |
|---|---|---|
| **Measured** | `PARIETAL_ABOVE_FOREHEAD`, `EAR_TOP_ABOVE_EYE_CORNER` | marks, residuals and sem written next to it |
| **Fitted to observation** | `EAR_DEPTH_RATIO` | say so explicitly; it cannot be calibrated |
| **Named guess** | `HEAD_DEPTH_RATIO`, `SKULL_WIDTH_RATIO` | awaiting measurement, and says so |

A guess relabelled as a measurement is worse than the guess, because nobody
re-examines it.

---

## 4. How the checks have lied. All of these actually happened.

**A test that cannot fail.** The yaw sweep ran at zero pitch, where a level
band projects to a straight line regardless of yaw — seven tiles rendered
identically and all reported "ok". It now carries 15° of pitch.

**A symmetric subject hiding an asymmetric bug.** The hair mask was composited
unmirrored against mirrored geometry, clipping the left of the head against
the right. The test subject was a symmetric mannequin facing the camera, where
a flipped mask is very nearly the right mask. **Test asymmetric heads at
three-quarter.**

**Blocking the wrong API.** Verifying the GPU→CPU fallback by disabling WebGL
on `HTMLCanvasElement` still reported GPU — MediaPipe builds its context on
`OffscreenCanvas`. Patch both, or the fallback is never exercised.

**A diagnostic behind a stale closure.** `onFiles` carried an empty dependency
array, so the new toggles lit up and changed nothing, and the readout built to
prove whether the mask worked rendered nothing at all. Two rounds went into
debugging the model before the obstacle turned out to be upstream of it. **A
broken diagnostic and a broken subject present identically.**

**Frozen frames already contain an overlay.** Re-processing one draws a second
overlay on top — doubled labels. Fine for marking a real ear, useless for
judging fit. Use clean photos.

**A grep against the wrong host.** Searching the dev sitemap for `https://`
when it emits `http://localhost` "proved" a route was missing. It was the
third entry.

---

## 5. Facts that cost real time to establish

**WebXR `immersive-ar` is not in Safari on iPhone.** Confirmed 2026-08. The
usable paths are `getUserMedia` + MediaPipe, `<model-viewer>`/AR Quick Look,
or a paid SLAM SDK. Do not design around WebXR on iOS.

**`navigator.mediaDevices` requires a secure context.** On `http://<lan-ip>`
the property is undefined and the naive call dies with "undefined is not an
object". For phone testing:

    openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout certificates/lan-key.pem -out certificates/lan-cert.pem -days 365 \
      -subj "/CN=<LAN-IP>" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:<LAN-IP>"

    npx next dev -p 3000 --experimental-https \
      --experimental-https-key certificates/lan-key.pem \
      --experimental-https-cert certificates/lan-cert.pem

`--experimental-https` alone runs `mkcert -install`, which writes a CA into the
system trust store and needs a password — and **falls back to plain HTTP on
failure while still printing a success banner**. A self-signed cert avoids the
system change and gives the phone the identical warning either way, because it
never trusts the laptop's CA regardless. `allowedDevOrigins` in
`next.config.mjs` must list the LAN IP; these are DHCP and will move.

**MediaPipe specifics.** WASM and model URLs are pinned in
`lib/face-landmarker.ts` — one copy, because two copies of a version-pinned
URL is one upgrade from a runtime that does not match its model. Always
GPU-then-CPU: WebGL context creation is refused on mobile Safari under memory
pressure, and there is an open issue where the segmenter's GPU delegate
returns wrong categories on iOS specifically.

**`MPMask` must be `close()`d every frame.** Skipping it leaks a texture per
frame; on a phone that is seconds to a crash, not a slow drift.

**Detection is throttled to new video frames; drawing must not be.**
`detectForVideo` throws on a repeat frame, so it only runs when `currentTime`
advances — but a 30fps camera against a 60Hz loop then draws the overlay on
half the frames. Keep the last good landmarks and redraw between them.

**Tracking envelope: about ±70° of yaw.** Full profile and back-of-head return
nothing. This is the ceiling of the whole approach, not a bug. The reference
photos barbers actually use are back-of-head shots, and those track at 0%.

**Hair segmentation does not work for fades — negative result, verified.**
The model finds hair as a visible mass, so a skin fade reads as skin. Measured
coverage on well-lit heads: **2.3% and 2.6%**, all of it on top, none on the
faded sides. Clipping to it erases precisely the region the ladder belongs in.
It is kept behind `/ar-lab`'s toggle so the finding can be re-checked rather
than taken on trust. **The face oval (`FACE_OVAL`) is the correct boundary** —
exact per head, per pose, no model, no download, and it cannot be confused by
short hair because it is not looking for hair.

---

## 6. Route hygiene

`/ar-fade-trainer` is public: metadata in a sibling `layout.tsx` (the page is
`"use client"`), canonical, sitemap, `.md` twin. See the `publish-page` skill.

`/ar-lab` calls `notFound()` when `NODE_ENV` is production and is listed in
`SITEMAP_EXCLUDE_PREFIXES`. It is deliberately **not** auth-gated like
`INTERNAL_TOOL_ROUTES`, because the point is that a headless browser can reach
it. Its footer link is development-only for the same reason.
`lib/ar-routes.test.ts` pins that the two prefixes cannot swallow each other.

**Nothing in this feature is a regulator claim.** Guard ladders, line placement
and pass order are craft convention. No board specifies them and no practical
exam grades a fade against a protractor. The page says so; keep it saying so.

---

## 7. Open, with the evidence

- **Child population is n=1.** The child offset is 0 because that is the
  conservative default, not because it was measured. Three child heads settle it.
- **`HEAD_DEPTH_RATIO` / `SKULL_WIDTH_RATIO` are unmeasured guesses.** A live
  frame once showed bands running past the back of the head onto the wall; it
  stopped appearing without explanation, which is not the same as fixed.
- **No grading.** The tool has no opinion on whether the blend was achieved.
  That needs a labelled dataset of good and bad blends — a data-collection
  project, not a model choice.
- **Best AI opportunity: reference photo → fade spec.** A VLM reads a picture
  of a wanted haircut and returns the three parameters the picker already
  takes. Zero-shot, no training data, feeds the deterministic derivation rather
  than replacing it, and lands as three visible selections a human can correct.
