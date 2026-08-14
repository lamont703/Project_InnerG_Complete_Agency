/**
 * The backward derivation behind /ar-fade-trainer.
 *
 * The premise of the tool is that a fade is not a sequence to memorise — it is
 * a shape, and the shape determines the sequence. Pick the finished result and
 * everything else follows: where the line sits on the skull, which guards form
 * the ladder between the perimeter and that line, and what order the passes go
 * in. This file is that derivation, kept away from the DOM so it can be tested
 * without a camera.
 *
 * WHAT THIS FILE IS NOT. None of the numbers here are regulator claims. TDLR
 * does not specify guard ladders and PSI's practical rubric does not grade a
 * fade against a protractor — see CLAUDE.md on why a figure without a named
 * source is not publishable. These are craft conventions, and the page says so
 * in as many words. The anatomy is the part that is real: the parietal ridge
 * is where the side of the skull turns into the top, and a fade line placed
 * relative to it behaves the same way on every head.
 *
 * The estimates below (VERTEX_ABOVE_FOREHEAD and friends) are approximations
 * of a skull from a face mesh, which is by definition inference — the mesh
 * stops at the hairline and the rest is proportion. They are named, commented
 * and adjustable in the UI rather than buried, because a student who can see
 * the model is wrong for their head can correct it, and one who cannot will
 * trust it.
 */

// ---------------------------------------------------------------------------
// Vectors. Everything is in PIXEL space, never MediaPipe's normalised space.
//
// This matters more than it looks. Landmarks arrive normalised — x and y in
// [0,1] against the frame's width and height respectively, z on roughly the
// same scale as x. On any non-square video that makes x and y different units,
// so a "normalised" cross product yields an axis that is skewed by the aspect
// ratio and the whole head frame leans. Converting once, up front, to
// (x*W, y*H, z*W) puts all three components in the same unit and every
// downstream operation is then ordinary Euclidean geometry.
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number
  y: number
  z: number
}

export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
export const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
export const len = (a: Vec3): number => Math.sqrt(dot(a, a))

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

export function normalize(a: Vec3): Vec3 {
  const l = len(a)
  return l < 1e-9 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l)
}

export const midpoint = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5)

// ---------------------------------------------------------------------------
// Landmark indices, MediaPipe Face Landmarker (478 points).
//
// Only the face-oval and midline points are used. They are the ones whose
// identity is stable across the mesh's revisions and, more practically, the
// ones that stay put when someone has hair covering the forehead.
// ---------------------------------------------------------------------------

export const LM = {
  /** Topmost midline point of the mesh, at the upper forehead. */
  FOREHEAD: 10,
  /** Menton — the bottom of the chin, on the midline. */
  CHIN: 152,
  /** Face-oval extremes at roughly ear-canal height. The head's widest visible pair. */
  SIDE_LEFT: 234,
  SIDE_RIGHT: 454,
  /** Outer eye corners. Their height is the working proxy for the top of the ear. */
  EYE_OUTER_LEFT: 33,
  EYE_OUTER_RIGHT: 263,
  /** Upper face-oval contour, between forehead and ear — the temple corner. */
  TEMPLE_LEFT: 54,
  TEMPLE_RIGHT: 284,
  /** Subnasale, under the nose. Level with the bottom of the ear on most faces. */
  NOSE_BASE: 2,
} as const

// ---------------------------------------------------------------------------
// Skull proportions inferred above the mesh.
//
// The face mesh ends at the hairline. A fade lives above that, so the top of
// the skull has to be estimated from proportion. These ratios are expressed in
// FACE HEIGHTS (chin to forehead landmark = 1.0) so they scale with the head
// rather than the frame.
// ---------------------------------------------------------------------------

/**
 * The parietal ridge — where the side of the head stops going up and starts
 * going over. It is the single most important landmark in fading, because it
 * is the ceiling: a line placed above it reads as a high fade no matter what
 * the barber intended, and a line placed on it is what "high fade" means.
 */
export const PARIETAL_ABOVE_FOREHEAD = 0.1

/** Vertex — the crown. Only used to taper the skull model above the ridge. */
export const VERTEX_ABOVE_FOREHEAD = 0.32

/**
 * The skull is a little wider than the face oval the mesh traces, and hair
 * adds to that. Applied to the half-width so the drawn bands sit on the hair
 * rather than inside the head.
 */
export const SKULL_WIDTH_RATIO = 1.08

/** A head is deeper front-to-back than it is wide. Front view hides this entirely. */
export const HEAD_DEPTH_RATIO = 1.22

/** How far the fade's bottom edge sits below the ear canal. */
export const PERIMETER_BELOW_EAR = 0.12

// ---------------------------------------------------------------------------
// The head frame
// ---------------------------------------------------------------------------

/**
 * A coordinate system attached to the skull, in pixel space.
 *
 * `u` is the useful part: a height along the head's own axis where the chin is
 * 0 and the forehead landmark is 1. Every anatomical level and every fade line
 * in this file is a `u`, which is what makes them head-relative — the same
 * number means the same place on a tall head, a tilted head, or a head three
 * feet further from the camera.
 */
export interface HeadFrame {
  up: Vec3
  right: Vec3
  /** Out of the face, towards the camera when facing it. */
  fwd: Vec3
  chin: Vec3
  /** A point on the head's central axis, from which `axisPoint` measures. */
  axisOrigin: Vec3
  axisOriginU: number
  faceHeight: number
  headWidth: number
  levels: HeadLevels
}

export interface HeadLevels {
  /** Bottom of the fade: base of the sideburn, and the nape hairline. */
  perimeter: number
  earCanal: number
  /** Top of the ear. The floor of the fade line — nothing below this is a fade. */
  earTop: number
  temple: number
  /** Where the side turns into the top. The ceiling. */
  parietal: number
  vertex: number
}

/**
 * Convert MediaPipe's normalised landmarks into pixel-space vectors.
 * See the note at the top of the file for why this is not optional.
 */
export function toPixelSpace(
  landmarks: ReadonlyArray<{ x: number; y: number; z: number }>,
  width: number,
  height: number
): Vec3[] {
  return landmarks.map((p) => ({ x: p.x * width, y: p.y * height, z: p.z * width }))
}

/**
 * Build the skull frame from one frame's landmarks.
 *
 * Returns null rather than a degenerate frame when the mesh is too small or
 * collapsed to trust — a head at the very edge of frame produces basis vectors
 * that are nearly parallel, and drawing from those puts bands in places that
 * look authoritative and are meaningless.
 */
export function buildHeadFrame(p: ReadonlyArray<Vec3>): HeadFrame | null {
  if (p.length <= LM.SIDE_RIGHT) return null

  const chin = p[LM.CHIN]
  const forehead = p[LM.FOREHEAD]
  const sideL = p[LM.SIDE_LEFT]
  const sideR = p[LM.SIDE_RIGHT]

  const faceHeight = len(sub(forehead, chin))
  const headWidth = len(sub(sideR, sideL))
  if (faceHeight < 1 || headWidth < 1) return null

  // Up from the chin to the forehead; right across the face. These two are not
  // guaranteed perpendicular on a real head, so `fwd` is taken from their cross
  // product and `right` is then rebuilt against it — that keeps the basis
  // orthonormal and lets `up` (the more reliable of the two) win the conflict.
  const up = normalize(sub(forehead, chin))
  const rightRaw = normalize(sub(sideR, sideL))
  const fwd = normalize(cross(rightRaw, up))
  if (len(fwd) < 0.5) return null
  const right = normalize(cross(up, fwd))

  const uOf = (q: Vec3) => dot(sub(q, chin), up) / faceHeight

  // The head's central axis runs up through the skull, not up the face. The
  // midpoint of the two ear-height oval points is close in width but sits on
  // the surface, so it is pushed back along -fwd into the head.
  const earMid = midpoint(sideL, sideR)
  const axisOrigin = sub(earMid, scale(fwd, 0.1 * headWidth))

  const earTop = (uOf(p[LM.EYE_OUTER_LEFT]) + uOf(p[LM.EYE_OUTER_RIGHT])) / 2
  const earCanal = uOf(earMid)
  const temple = (uOf(p[LM.TEMPLE_LEFT]) + uOf(p[LM.TEMPLE_RIGHT])) / 2

  return {
    up,
    right,
    fwd,
    chin,
    axisOrigin,
    axisOriginU: uOf(axisOrigin),
    faceHeight,
    headWidth,
    levels: {
      perimeter: earCanal - PERIMETER_BELOW_EAR,
      earCanal,
      earTop,
      temple,
      parietal: 1 + PARIETAL_ABOVE_FOREHEAD,
      vertex: 1 + VERTEX_ABOVE_FOREHEAD,
    },
  }
}

/** The point on the head's central axis at height `u`. */
export function axisPoint(frame: HeadFrame, u: number): Vec3 {
  return add(frame.axisOrigin, scale(frame.up, (u - frame.axisOriginU) * frame.faceHeight))
}

/**
 * Half-width of the skull at height `u`.
 *
 * Constant up to the parietal ridge, then falling away as an ellipse to the
 * vertex. That two-part shape is the whole reason a fade line above the ridge
 * behaves differently from one below it — above the ridge the surface is
 * turning away from the clipper, so an evenly-spaced ladder stops reading as
 * even. Modelling it is what lets the overlay show that instead of asserting it.
 */
export function skullRadius(frame: HeadFrame, u: number): number {
  const base = (frame.headWidth / 2) * SKULL_WIDTH_RATIO
  const { parietal, vertex } = frame.levels
  if (u <= parietal) return base
  if (u >= vertex) return 0
  const t = (u - parietal) / (vertex - parietal)
  return base * Math.sqrt(Math.max(0, 1 - t * t))
}

export interface BandPoint {
  point: Vec3
  /** Outward surface normal at this point, unit length. */
  normal: Vec3
  /** False when the point is on the far side of the head from the camera. */
  visible: boolean
}

/**
 * One horizontal ring around the skull at height `u`, as projected points.
 *
 * Drawn as an ellipse rather than a circle because a head is deeper than it is
 * wide, and the `visible` flag lets the caller draw the near arc solid and the
 * far arc faint — which is the detail that makes the overlay read as wrapped
 * around a head instead of pasted on top of one.
 */
export function headBand(frame: HeadFrame, u: number, segments = 72): BandPoint[] {
  const a = skullRadius(frame, u)
  const b = a * HEAD_DEPTH_RATIO
  const centre = axisPoint(frame, u)
  const out: BandPoint[] = []

  for (let i = 0; i < segments; i++) {
    const th = (i / segments) * Math.PI * 2
    const point = add(centre, add(scale(frame.right, a * Math.cos(th)), scale(frame.fwd, b * Math.sin(th))))
    // Ellipse normal, before normalising: (cos/a, sin/b) in the local basis.
    const normal = normalize(
      add(scale(frame.right, Math.cos(th) / Math.max(a, 1e-6)), scale(frame.fwd, Math.sin(th) / Math.max(b, 1e-6)))
    )
    // MediaPipe's z grows away from the camera, so an outward normal with a
    // negative z component is pointing back at the viewer.
    out.push({ point, normal, visible: normal.z < 0 })
  }
  return out
}

// ---------------------------------------------------------------------------
// The derivation: target in, procedure out
// ---------------------------------------------------------------------------

/** Where the fade line sits. Composable with the bottom — "low skin", "high taper". */
export type FadeHeight = 'taper' | 'low' | 'mid' | 'high'

/** How short the shortest point goes. The other half of the name. */
export type FadeBottom = 'skin' | 'shadow' | 'one'

export interface Guard {
  id: string
  label: string
  inches: number
}

/**
 * Clipper guards in the sizes a ladder is actually built from. Lengths are the
 * conventional eighth-inch series; half sizes exist because the gap between
 * consecutive whole guards is the gap a blend has to hide.
 */
export const GUARDS: readonly Guard[] = [
  { id: 'bald', label: 'Bald / foil', inches: 0 },
  { id: '0', label: '#0', inches: 1 / 16 },
  { id: '0.5', label: '#0.5', inches: 3 / 32 },
  { id: '1', label: '#1', inches: 1 / 8 },
  { id: '1.5', label: '#1.5', inches: 3 / 16 },
  { id: '2', label: '#2', inches: 1 / 4 },
  { id: '2.5', label: '#2.5', inches: 5 / 16 },
  { id: '3', label: '#3', inches: 3 / 8 },
  { id: '3.5', label: '#3.5', inches: 7 / 16 },
  { id: '4', label: '#4', inches: 1 / 2 },
]

export const guardById = (id: string): Guard | undefined => GUARDS.find((g) => g.id === id)

const BOTTOM_GUARD: Record<FadeBottom, string> = {
  skin: 'bald',
  shadow: '0.5',
  one: '1',
}

/**
 * The guard the shortest point is taken with. Exported so the picker can offer
 * only top lengths that are actually longer — the alternative is letting
 * someone select a target with no fade in it and reading an error.
 */
export const bottomGuardId = (bottom: FadeBottom): string => BOTTOM_GUARD[bottom]

/**
 * How far up the ear-to-parietal span the line sits, per height.
 *
 * Expressed as a fraction of that span rather than as an absolute height,
 * which is the point: the same fraction lands on the equivalent place on a
 * long head and a round one. `taper` is 0 because a taper does not raise a
 * line up the side at all — it only shortens the perimeter.
 */
export const LINE_FRACTION: Record<FadeHeight, number> = {
  taper: 0,
  low: 0.15,
  mid: 0.5,
  high: 0.85,
}

export const HEIGHT_LABEL: Record<FadeHeight, string> = {
  taper: 'Taper',
  low: 'Low fade',
  mid: 'Mid fade',
  high: 'High fade',
}

export const BOTTOM_LABEL: Record<FadeBottom, string> = {
  skin: 'Skin (bald)',
  shadow: 'Shadow (#0.5)',
  one: '#1',
}

export interface FadeSpec {
  height: FadeHeight
  bottom: FadeBottom
  /** The length the fade blends up into — i.e. what is left on top. */
  topGuard: string
}

export interface LadderRung {
  guard: Guard
  /** The band this guard owns, in head-relative `u`. */
  uFrom: number
  uTo: number
}

export interface FadeStep {
  title: string
  detail: string
  /** Index into the ladder this step highlights, or null for whole-head steps. */
  rung: number | null
}

export interface FadePlan {
  spec: FadeSpec
  /** Height of the fade line, in `u`. Only meaningful with a HeadFrame. */
  uLine: number
  uPerimeter: number
  perimeterOnly: boolean
  ladder: LadderRung[]
  steps: FadeStep[]
  /** One sentence naming where the line lands, in anatomy rather than numbers. */
  placement: string
}

/**
 * The guards between bottom and top, inclusive.
 *
 * Half sizes are dropped once the ladder would run past six rungs. A ladder
 * that long is not a teaching aid — nobody changes guard eight times on one
 * side — and the half sizes are the rungs a barber reaches for to fix a line
 * that showed up, not ones planned in advance.
 */
export function buildLadder(bottomId: string, topId: string): Guard[] {
  const lo = GUARDS.findIndex((g) => g.id === bottomId)
  const hi = GUARDS.findIndex((g) => g.id === topId)
  if (lo < 0 || hi < 0 || hi <= lo) return []

  const full = GUARDS.slice(lo, hi + 1)
  if (full.length <= 6) return full

  const trimmed = full.filter((g, i) => i === 0 || i === full.length - 1 || !g.id.includes('.5'))
  return trimmed.length >= 3 ? trimmed : full
}

/**
 * The whole point of the tool: finished shape in, ordered procedure out.
 *
 * `levels` is optional so the plan — ladder, steps, guard sequence — can be
 * shown and read before the camera has ever seen a head. Only the two heights
 * need a frame, and they fall back to the same fractions against a nominal
 * skull so the preview diagram is proportionally right.
 */
export function deriveFadePlan(spec: FadeSpec, levels?: HeadLevels): FadePlan {
  const l: HeadLevels = levels ?? {
    perimeter: 0.55,
    earCanal: 0.67,
    earTop: 0.74,
    temple: 0.93,
    parietal: 1 + PARIETAL_ABOVE_FOREHEAD,
    vertex: 1 + VERTEX_ABOVE_FOREHEAD,
  }

  const perimeterOnly = spec.height === 'taper'
  const uLine = l.earTop + LINE_FRACTION[spec.height] * (l.parietal - l.earTop)
  const uPerimeter = l.perimeter

  const placement = perimeterOnly
    ? 'The line never leaves the perimeter. A taper shortens the sideburn and nape only — the side keeps its length, which is why it grows out without a shelf.'
    : spec.height === 'high'
      ? 'The line sits just under the parietal ridge — the corner where the side of the skull turns into the top. Above that corner there is no side left to fade, which is why a high fade has nowhere to go if it is set too high.'
      : spec.height === 'mid'
        ? 'The line sits halfway between the top of the ear and the parietal ridge, roughly level with the temple.'
        : 'The line sits just above the top of the ear, well below the temple. Most of the side keeps its length.'

  const bottomId = BOTTOM_GUARD[spec.bottom]
  const guards = buildLadder(bottomId, spec.topGuard)

  // Bottom and top are the same length, or inverted. There is no blend zone to
  // divide and no ladder to climb, so say that instead of emitting a procedure
  // whose steps point at rungs that do not exist. The picker also filters the
  // top guard to lengths above the bottom; this is the second line of defence,
  // because a plan is also derivable from a saved or shared spec that never
  // went through the picker.
  if (guards.length === 0) {
    return {
      spec,
      uLine,
      uPerimeter,
      perimeterOnly,
      ladder: [],
      placement,
      steps: [
        {
          title: 'This target has no fade in it',
          detail: `The shortest point (${guardById(bottomId)?.label ?? bottomId}) is not shorter than the length on top (${guardById(spec.topGuard)?.label ?? spec.topGuard}). A fade is the transition between two different lengths — pick a longer top, or take the bottom shorter, and the ladder appears.`,
          rung: null,
        },
      ],
    }
  }

  const span = Math.max(uLine - uPerimeter, 1e-6)
  const h = span / Math.max(guards.length, 1)
  const ladder: LadderRung[] = guards.map((guard, i) => ({
    guard,
    uFrom: uPerimeter + i * h,
    uTo: uPerimeter + (i + 1) * h,
  }))

  const top = ladder[ladder.length - 1]
  const bottom = ladder[0]

  const steps: FadeStep[] = [
    {
      title: 'Name the finished shape first',
      detail: `${HEIGHT_LABEL[spec.height]}, ${BOTTOM_LABEL[spec.bottom].toLowerCase()} at the bottom, blending into ${guardById(spec.topGuard)?.label ?? spec.topGuard}. ${placement}`,
      rung: null,
    },
    {
      title: 'Cut the top before you fade',
      detail:
        'The fade has to blend into a length that already exists. Cutting the top afterwards changes the target the blend was matched to and reopens the line you just closed.',
      rung: null,
    },
    {
      title: `Set the baseline with ${bottom?.guard.label ?? 'the bottom guard'}`,
      detail: perimeterOnly
        ? 'Take the perimeter down at the sideburn and around the nape. This is the shortest point and everything else is measured from it.'
        : 'Take the shortest point in around the whole perimeter. This is the floor of the fade and the reference for every rung above it.',
      rung: 0,
    },
    {
      title: `Set the ceiling with ${top?.guard.label ?? 'the top guard'}`,
      detail:
        'Run the longest guard of the ladder up to the fade line and no further. Establishing both edges before filling the middle is what keeps a fade from creeping up the head as you work.',
      rung: ladder.length - 1,
    },
    ...ladder.slice(1, Math.max(ladder.length - 1, 1)).map((rung, i) => ({
      title: `Fill in ${rung.guard.label}`,
      detail:
        'Work up to the top of this band and flick the clipper out — arcing away from the head at the top of the pass rather than stopping dead. A pass that stops flat is what leaves a line.',
      rung: i + 1,
    })),
    {
      title: 'Erase the transitions',
      detail:
        'Half guards and lever play between the bands, not new passes through them. At this stage you are removing the edges between rungs, not re-cutting the rungs.',
      rung: null,
    },
    {
      title: 'Check from three angles and in different light',
      detail:
        'A blend that reads clean straight on will still show a line from below. Move around the head — front, both profiles — and change the light before you call it finished.',
      rung: null,
    },
    {
      title: 'Detail last',
      detail: 'Outline, edge-up and nape. Detailing before the blend is finished means detailing twice.',
      rung: null,
    },
  ]

  return { spec, uLine, uPerimeter, perimeterOnly, ladder, steps, placement }
}

/**
 * A human name for the target, matching how it would be asked for in a chair.
 */
export function fadeName(spec: FadeSpec): string {
  if (spec.height === 'taper') {
    return spec.bottom === 'skin' ? 'Skin taper' : `${HEIGHT_LABEL.taper} (${BOTTOM_LABEL[spec.bottom]})`
  }
  const bottomWord = spec.bottom === 'skin' ? 'skin ' : spec.bottom === 'shadow' ? 'shadow ' : ''
  return `${HEIGHT_LABEL[spec.height].replace(' fade', '')} ${bottomWord}fade`.replace(/\s+/g, ' ')
}
