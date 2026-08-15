/**
 * The overlay renderer, extracted from the camera component.
 *
 * WHY IT LIVES HERE. It used to be inline in components/ar/fade-ar-view.tsx,
 * inside a requestAnimationFrame closure. That made a live camera the only
 * thing in the universe capable of producing a frame — so the overlay could not
 * be screenshotted, diffed, regression-tested, or looked at by anyone who was
 * not physically holding a phone in front of a head. Every judgement about
 * whether the geometry was right had to be made by reading the maths.
 *
 * Taking one canvas context and one set of landmarks, and drawing, means the
 * same code path can be driven by a camera, by a still image, or by synthetic
 * landmarks at an arbitrary pose (lib/fade-synthetic-head.ts). /ar-lab renders
 * a contact sheet from it and scripts/ar_lab_shot.js screenshots that headless.
 *
 * The rule that keeps this honest: the live view must not draw anything itself.
 * If it grows its own drawing code, the harness silently starts validating a
 * copy of the renderer instead of the renderer.
 */

import {
  buildHeadFrame,
  deriveFadePlan,
  headBand,
  toPixelSpace,
  scale,
  add,
  type FadeSpec,
  type HeadFrame,
  type Subject,
  type HeadLevels,
  type Vec3,
} from './fade-geometry'

export interface OverlayInput {
  /** Normalised landmarks exactly as MediaPipe emits them. */
  landmarks: ReadonlyArray<{ x: number; y: number; z: number }>
  width: number
  height: number
  spec: FadeSpec
  /** Ladder index to emphasise, or null to show the whole ladder evenly. */
  activeRung: number | null
  /** True for a selfie-mode feed, which is drawn flipped. */
  mirror: boolean
  /** Draw the modelled skull and the landmarks used. Off in the live view. */
  debug?: boolean
  /**
   * Whose head it is. Defaults to adult. Nothing in a face mesh reveals age, so
   * this has to be told — see EAR_TOP_ABOVE_EYE_CORNER for why it changes where
   * the floor of the fade lands.
   */
  subject?: Subject
  /**
   * A canvas whose alpha channel is per-pixel hair confidence (lib/hair-mask).
   *
   * When supplied, the band geometry is clipped to it. That is what stops the
   * ladder being painted on a cheek, an ear, or the wall behind the head — the
   * geometry decides where the fade line belongs, and this decides where the
   * overlay is allowed to exist. Optional, so the still-image and synthetic
   * paths keep working unclipped.
   */
  hairMask?: CanvasImageSource | null
}

/**
 * What the renderer worked out for this frame. Returned rather than kept
 * private so callers can show it, and so a harness can assert on it instead of
 * eyeballing a PNG — an overlay that looks plausible and puts a mid fade above
 * the temple is exactly the failure a screenshot does not catch.
 */
export interface OverlayReport {
  yawDeg: number
  levels: HeadLevels
  uLine: number
  uPerimeter: number
  ladder: number
  headWidthPx: number
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

interface P2 {
  x: number
  y: number
  visible: boolean
}

/**
 * Sequential ramp for the ladder: darkest at the shortest guard.
 *
 * Ordinal data, so one hue with a lightness ramp. A categorical palette here
 * would imply the guards are unrelated categories when they are a sequence, and
 * the sequence is the entire thing being taught.
 */
export function rungColour(i: number, n: number): string {
  const t = n <= 1 ? 0 : i / (n - 1)
  return `hsl(196 ${88 - t * 26}% ${34 + t * 44}%)`
}

/**
 * Project a head-space point to canvas pixels.
 *
 * Orthographic on purpose. MediaPipe's landmarks already arrive in a
 * screen-aligned space, so taking x and y directly keeps the overlay locked to
 * the mesh without reconstructing the camera intrinsics and matching them
 * exactly — the usual source of an overlay that tracks at centre frame and
 * slides off at the edges.
 */
const project = (p: Vec3, mirror: boolean, w: number) => ({
  x: mirror ? w - p.x : p.x,
  y: p.y,
})

/**
 * The fade-zone arc of one ring around the skull, in drawing order.
 *
 * headBand already omits the front of the face (FADE_FRONT_HALF_ANGLE), so this
 * is a single open arc running from one temple, round the back, to the other —
 * not a closed loop. Everything below works on index runs rather than on a
 * filtered point list for that reason.
 */
export function ring(frame: HeadFrame, u: number, mirror: boolean, w: number, segments = 96): P2[] {
  return headBand(frame, u, segments).map((bp) => ({
    ...project(bp.point, mirror, w),
    // Points on the ear are undrawable for the same reason as points on the far
    // side of the head: there is no fade there. Folding both into one flag lets
    // visibleRuns split the arc around the ear without knowing why.
    visible: bp.visible && !bp.onEar,
  }))
}

/**
 * Index ranges of consecutive camera-facing points.
 *
 * The far side of the head is dropped entirely rather than drawn dashed. On a
 * head turned towards the camera the hidden arc projects across the middle of
 * the face, so drawing it — in any style — paints guide lines over the features
 * of the person being worked on. Two runs is the normal case for a front view:
 * a sliver of fade zone visible at each temple, which is exactly how much of a
 * fade you can actually see from straight ahead.
 */
function visibleRuns(pts: P2[]): Array<[number, number]> {
  const runs: Array<[number, number]> = []
  let start = -1
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].visible && start < 0) start = i
    if ((!pts[i].visible || i === pts.length - 1) && start >= 0) {
      const end = pts[i].visible ? i : i - 1
      if (end - start >= 1) runs.push([start, end])
      start = -1
    }
  }
  return runs
}

function strokeRing(ctx: CanvasRenderingContext2D, pts: P2[], colour: string, width: number) {
  ctx.save()
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [a, b] of visibleRuns(pts)) {
    ctx.beginPath()
    for (let i = a; i <= b; i++) (i === a ? ctx.moveTo : ctx.lineTo).call(ctx, pts[i].x, pts[i].y)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Fill the strip between two rings — one rung of the ladder.
 *
 * The mask is the INTERSECTION of the two rings: a column is filled only where
 * both its lower and upper edge are drawable. Taking it from the lower ring
 * alone leaves the fill hazing straight over the ear on any rung whose bottom
 * edge passes below the lobe — the strokes stop correctly at the cut-out while
 * the translucent band carries on across it, which looks like a rendering
 * smudge rather than the deliberate gap it is.
 *
 * The two rings share a sampling and a head frame, so their indices correspond
 * and the intersection is a straight element-wise AND.
 */
function fillBetween(ctx: CanvasRenderingContext2D, lower: P2[], upper: P2[], colour: string, alpha: number) {
  const both = lower.map((p, i) => ({ ...p, visible: p.visible && (upper[i]?.visible ?? false) }))
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = colour
  for (const [a, b] of visibleRuns(both)) {
    if (b - a < 1 || b >= upper.length) continue
    ctx.beginPath()
    for (let i = a; i <= b; i++) (i === a ? ctx.moveTo : ctx.lineTo).call(ctx, lower[i].x, lower[i].y)
    for (let i = b; i >= a; i--) ctx.lineTo(upper[i].x, upper[i].y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Labels are collected during drawing and placed in one pass at the end.
 *
 * WHY NOT JUST DRAW THEM WHERE THEY BELONG. Because two of them belong in the
 * same place. On a low fade the line sits a few pixels above the top of the
 * ear, so "fade line" and "top of ear" are asking for the same row and one ends
 * up unreadable on top of the other. And a head near the edge of frame pushes
 * its labels off the canvas entirely — which the maths cannot notice, because
 * from the geometry's point of view the label was placed correctly.
 *
 * Both were found by rendering /ar-lab and looking at it. Neither is visible in
 * a unit test, and neither would have been visible at all before the renderer
 * was extracted from the camera component.
 *
 * Placement is priority-ordered: the fade line is the one thing that must be
 * legible, so it is placed first and everything else moves around it.
 */
interface LabelRequest {
  text: string
  x: number
  y: number
  colour: string
  size: number
  align: 'left' | 'right'
  /** Lower is placed first and keeps its position. */
  priority: number
}

type Box = { x0: number; y0: number; x1: number; y1: number }

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

function placeLabels(ctx: CanvasRenderingContext2D, reqs: LabelRequest[], W: number, H: number) {
  const placed: Box[] = []
  const pad = 4

  for (const r of [...reqs].sort((a, b) => a.priority - b.priority)) {
    ctx.font = `600 ${r.size}px ui-sans-serif, system-ui, sans-serif`
    const tw = ctx.measureText(r.text).width
    const bw = tw + 12
    const bh = r.size * 1.56

    // Horizontal: keep the chip on the canvas, flipping which side of the
    // anchor it hangs off rather than letting it slide across the head.
    let left = r.align === 'right' ? r.x - tw : r.x
    if (left - 6 < pad) left = pad + 6
    if (left - 6 + bw > W - pad) left = W - pad - bw + 6

    // Vertical: nudge down (then up) until it stops sitting on something else.
    let y = Math.min(Math.max(r.y, bh / 2 + pad), H - bh / 2 - pad)
    const boxAt = (yy: number): Box => ({ x0: left - 6, y0: yy - bh / 2, x1: left - 6 + bw, y1: yy + bh / 2 })
    let box = boxAt(y)
    for (let guard = 0; guard < 24 && placed.some((p) => overlaps(box, p)); guard++) {
      const hit = placed.find((p) => overlaps(box, p))!
      const down = hit.y1 + bh / 2 + 2
      const up = hit.y0 - bh / 2 - 2
      y = down + bh / 2 < H - pad ? down : up
      y = Math.min(Math.max(y, bh / 2 + pad), H - bh / 2 - pad)
      box = boxAt(y)
    }
    placed.push(box)

    ctx.save()
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(2,6,23,0.72)'
    ctx.beginPath()
    // roundRect is Safari 16+. Older engines get square corners rather than an
    // exception that kills the whole frame.
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(box.x0, box.y0, bw, bh, r.size * 0.4)
    } else {
      ctx.rect(box.x0, box.y0, bw, bh)
    }
    ctx.fill()
    ctx.fillStyle = r.colour
    ctx.fillText(r.text, left, y)
    ctx.restore()
  }
}

/** The rightmost / leftmost visible point of a ring, for hanging a label off. */
function edgeOf(pts: P2[], side: 'left' | 'right'): P2 | null {
  const vis = pts.filter((p) => p.visible)
  if (!vis.length) return null
  return vis.reduce((m, p) => ((side === 'right' ? p.x > m.x : p.x < m.x) ? p : m), vis[0])
}

/**
 * The elevation protractor, anchored to the skull's own surface normal.
 *
 * This is the instrument the tool is really for. Elevation is measured against
 * the curve of the head, not against the floor or the mirror, which is why it
 * is so hard to feel and so easy to get wrong — and why drawing it on the head,
 * in the right plane, is something a book cannot do. Anchored near the
 * silhouette so the arc is seen close to edge-on rather than foreshortened into
 * a line.
 */
function drawProtractor(
  ctx: CanvasRenderingContext2D,
  frame: HeadFrame,
  u: number,
  mirror: boolean,
  w: number,
  size: number,
  labels: LabelRequest[]
) {
  const band = headBand(frame, u, 96)
  let best = -1
  let bestScore = -Infinity
  band.forEach((bp, i) => {
    if (!bp.visible) return
    const score = Math.abs(bp.normal.x)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  if (best < 0) return

  const anchor = band[best]
  const p0 = project(anchor.point, mirror, w)
  const nEnd = project(add(anchor.point, scale(anchor.normal, frame.headWidth * 0.42)), mirror, w)
  const tEnd = project(add(anchor.point, scale(frame.up, frame.headWidth * 0.42)), mirror, w)

  const aN = Math.atan2(nEnd.y - p0.y, nEnd.x - p0.x)
  const aT = Math.atan2(tEnd.y - p0.y, tEnd.x - p0.x)
  const r = frame.headWidth * 0.3

  ctx.save()
  ctx.lineWidth = Math.max(2, size * 0.14)

  // 0° — flat against the head, the direction of the pass.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(tEnd.x, tEnd.y)
  ctx.stroke()
  ctx.setLineDash([])

  // 90° — straight off the surface.
  ctx.strokeStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(nEnd.x, nEnd.y)
  ctx.stroke()

  // The sweep between them, drawn the short way round.
  let delta = aN - aT
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  ctx.strokeStyle = '#f59e0b'
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(p0.x, p0.y, r, aT, aT + delta, delta < 0)
  ctx.stroke()
  ctx.globalAlpha = 1

  for (const f of [0, 0.5, 1]) {
    const a = aT + delta * f
    ctx.beginPath()
    ctx.moveTo(p0.x + Math.cos(a) * r * 0.86, p0.y + Math.sin(a) * r * 0.86)
    ctx.lineTo(p0.x + Math.cos(a) * r * 1.1, p0.y + Math.sin(a) * r * 1.1)
    ctx.stroke()
  }
  ctx.restore()

  const mid = aT + delta * 0.5
  labels.push({
    text: 'flick out',
    x: p0.x + Math.cos(mid) * r * 1.35 - size,
    y: p0.y + Math.sin(mid) * r * 1.35,
    colour: '#fde68a',
    size: size * 0.82,
    align: 'left',
    priority: 3,
  })
}

/** The modelled skull and the landmarks it was built from. Harness only. */
function drawDebugSkull(ctx: CanvasRenderingContext2D, frame: HeadFrame, pts: Vec3[], mirror: boolean, w: number) {
  // Built as one polygon down the left silhouette and back up the right, from
  // the rings themselves. The first version filled an axis-aligned rect between
  // each ring's extremes, which looked fine head-on and sheared the skull into
  // a parallelogram the moment the head rolled — a debug view that lies about
  // the pose is worse than none, because it gets believed.
  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []
  for (let u = -0.05; u < frame.levels.vertex; u += 0.03) {
    const r = ring(frame, u, mirror, w, 48)
    const lo = edgeOf(r, 'left')
    const hi = edgeOf(r, 'right')
    if (lo && hi) {
      left.push(lo)
      right.push(hi)
    }
  }
  if (left.length > 1) {
    ctx.save()
    ctx.globalAlpha = 0.16
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    left.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  ctx.fillStyle = '#f472b6'
  for (const p of pts) {
    const q = project(p, mirror, w)
    ctx.beginPath()
    ctx.arc(q.x, q.y, Math.max(2, frame.headWidth * 0.012), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * A reusable scratch canvas for the clipped-geometry pass.
 *
 * Module-level and resized in place. Allocating one per frame at 30fps is a
 * garbage-collection pause every few seconds, which reads as the overlay
 * stuttering and gets blamed on the tracker.
 */
let scratch: HTMLCanvasElement | null = null

function scratchContext(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w
    scratch.height = h
  }
  const c = scratch.getContext('2d')
  c?.clearRect(0, 0, w, h)
  return c
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

export interface Measurement {
  /** Head-relative height of the clicked point. */
  u: number
  /** Distance in pixels from the click to the best-matching ring. */
  dist: number
  /** Head width in pixels, so `dist` can be judged relative to the head. */
  headWidthPx: number
}

/**
 * Work out which head-relative height `u` a point on the image corresponds to.
 *
 * WHY THIS IS A SEARCH AND NOT ALGEBRA. `u` is a dot product against the head's
 * up axis, which needs a 3D point, and a click gives two coordinates. The set of
 * 3D points projecting to one pixel is a line along z, and on a pitched head `u`
 * varies along that line — so a click does not determine a height on its own.
 *
 * What does determine it is the assumption that the clicked point lies on the
 * visible surface of the skull. So this scans candidate heights, projects each
 * ring, and keeps the height whose ring passes closest to the click. That is
 * well defined at any pose, and it degrades honestly: `dist` comes back with the
 * answer, so a click into empty space next to the head reports a large residual
 * instead of a confident number.
 *
 * The whole point is to stop PARIETAL_ABOVE_FOREHEAD being a guess. It is the
 * ceiling the entire high/mid/low derivation is measured against, and it is
 * currently the one constant in the model with nothing behind it.
 */
export function measureU(
  landmarks: ReadonlyArray<{ x: number; y: number; z: number }>,
  width: number,
  height: number,
  mirror: boolean,
  sx: number,
  sy: number,
  subject?: Subject
): Measurement | null {
  // Same population as the drawing, or a mark would be solved against a
  // different skull from the one on screen.
  const frame = buildHeadFrame(toPixelSpace(landmarks, width, height), { subject })
  if (!frame) return null

  const lo = -0.3
  const hi = frame.levels.vertex + 0.35
  const STEPS = 400

  let bestU = 0
  let bestDist = Infinity
  for (let i = 0; i <= STEPS; i++) {
    const u = lo + ((hi - lo) * i) / STEPS
    for (const bp of headBand(frame, u, 72, { full: true })) {
      // Only the near surface — the far side of the head is not clickable, and
      // letting it match would silently resolve a click on the front of the
      // forehead to a height measured round the back.
      if (!bp.visible) continue
      const p = project(bp.point, mirror, width)
      const d = Math.hypot(p.x - sx, p.y - sy)
      if (d < bestDist) {
        bestDist = d
        bestU = u
      }
    }
  }
  return { u: bestU, dist: bestDist, headWidthPx: frame.headWidth }
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/**
 * Draw the fade plan onto `ctx`, over whatever is already there.
 *
 * Returns null when the landmarks do not yield a trustworthy head frame, which
 * the caller should treat as "no overlay this frame" rather than as an error.
 */
export function drawFadeOverlay(ctx: CanvasRenderingContext2D, input: OverlayInput): OverlayReport | null {
  const { landmarks, width: W, height: H, spec, activeRung: active, mirror, debug, subject, hairMask } = input
  if (!landmarks?.length) return null

  const pts = toPixelSpace(landmarks, W, H)
  const frame = buildHeadFrame(pts, { subject })
  if (!frame) return null

  const plan = deriveFadePlan(spec, frame.levels)
  const size = Math.max(13, W * 0.023)

  if (debug) drawDebugSkull(ctx, frame, pts, mirror, W)

  /**
   * With a hair mask, the band geometry is drawn to a scratch canvas, clipped,
   * and then composited — rather than drawn straight onto the frame.
   *
   * Labels deliberately stay OUT of this. They hang off the edge of the head by
   * design, so clipping them to hair would delete most of them, and a label is
   * not a claim about the head's surface the way a band is.
   */
  const geo = hairMask ? scratchContext(W, H) : null
  const g = geo ?? ctx

  const labels: LabelRequest[] = []

  // Anatomy first, underneath everything — the reference points the line is
  // placed against, so a student can see the reasoning and not just the answer.
  for (const [u, text] of [
    [frame.levels.earTop, 'top of ear'],
    [frame.levels.parietal, 'parietal ridge'],
  ] as const) {
    const pr = ring(frame, u, mirror, W)
    strokeRing(g, pr, 'rgba(226,232,240,0.55)', Math.max(1.5, size * 0.09))
    const e = edgeOf(pr, 'right')
    if (e) labels.push({ text, x: e.x + size * 0.5, y: e.y, colour: '#e2e8f0', size: size * 0.78, align: 'left', priority: 2 })
  }

  plan.ladder.forEach((rung, i) => {
    const lower = ring(frame, rung.uFrom, mirror, W)
    const upper = ring(frame, rung.uTo, mirror, W)
    const colour = rungColour(i, plan.ladder.length)
    const isActive = active === i
    fillBetween(g, lower, upper, colour, isActive ? 0.5 : active === null ? 0.28 : 0.12)
    strokeRing(g, lower, colour, Math.max(1.5, size * (isActive ? 0.14 : 0.08)))

    if (isActive || active === null) {
      const e = edgeOf(lower, 'left')
      if (e) {
        labels.push({
          text: rung.guard.label,
          x: e.x - size * 0.8,
          y: e.y,
          colour: isActive ? '#fde68a' : '#e0f2fe',
          size: size * 0.8,
          align: 'right',
          /**
           * Rungs are placed from the TOP of the ladder downwards, and that
           * ordering is load-bearing rather than cosmetic.
           *
           * The collision resolver nudges a clashing label DOWN. Placing the
           * rungs in ladder order means the shortest guard is placed first and
           * everything longer gets pushed below it — inverting the ladder. On a
           * head facing the camera, where the visible fade zone is two narrow
           * slivers and all six labels want the same rows, that produced
           * "#3, #1, Bald/foil, #0, #2" top to bottom on a live camera frame.
           *
           * A guard ladder is a sequence. Displaying it out of order in a tool
           * whose entire subject is the order of the passes is worse than not
           * displaying it.
           *
           * The active rung takes its place in the same ordering rather than
           * jumping the queue; it is already distinguished by colour, and
           * letting it win placement would break the sequence again. Rungs sit
           * below the anatomy and the fade line in priority, but never collide
           * with them — those hang off the opposite side of the head.
           */
          priority: 10 + (plan.ladder.length - 1 - i),
        })
      }
    }
  })

  // The fade line itself — the target, and the one thing that must be
  // unmistakable at a glance. Placed first, so everything else moves for it.
  const line = ring(frame, plan.uLine, mirror, W)
  g.save()
  g.shadowColor = 'rgba(2,6,23,0.9)'
  g.shadowBlur = size * 0.5
  strokeRing(g, line, '#ffffff', Math.max(2.5, size * 0.2))
  g.restore()

  const le = edgeOf(line, 'right')
  if (le) {
    labels.push({
      text: plan.perimeterOnly ? 'perimeter' : 'fade line',
      x: le.x + size * 0.5,
      y: le.y,
      colour: '#ffffff',
      size: size * 0.9,
      align: 'left',
      priority: 0,
    })
  }

  if (active !== null && plan.ladder[active]) {
    const rung = plan.ladder[active]
    drawProtractor(g, frame, (rung.uFrom + rung.uTo) / 2, mirror, W, size, labels)
  }

  if (geo && hairMask) {
    // Keep only the geometry that landed on hair, then stamp it onto the frame.
    geo.save()
    geo.globalCompositeOperation = 'destination-in'
    geo.drawImage(hairMask, 0, 0, W, H)
    geo.restore()
    ctx.drawImage(geo.canvas, 0, 0)
  }

  placeLabels(ctx, labels, W, H)

  // `fwd` points out of the face and the camera looks down -z, so a head square
  // to the lens reads 0.
  const yawDeg = (Math.atan2(frame.fwd.x, -frame.fwd.z) * 180) / Math.PI

  return {
    yawDeg,
    levels: frame.levels,
    uLine: plan.uLine,
    uPerimeter: plan.uPerimeter,
    ladder: plan.ladder.length,
    headWidthPx: frame.headWidth,
  }
}
