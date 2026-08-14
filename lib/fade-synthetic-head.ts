/**
 * A head with no person attached to it.
 *
 * WHY THIS EXISTS. To look at the overlay you need landmarks, and landmarks
 * normally come from a camera pointed at somebody's face. That makes the
 * feedback loop depend on a human being present, and makes any committed
 * fixture a photograph of a real person's head — which is not something to put
 * in a git repository for the convenience of a rendering test.
 *
 * So the poses that get checked automatically come from here: the nine
 * landmarks buildHeadFrame actually reads, placed at anthropometrically
 * ordinary positions and rotated to an arbitrary pose. Nothing else in the
 * 478-point mesh is consulted by the frame builder, so nine is not a
 * simplification — it is the whole input.
 *
 * WHAT IT CANNOT TELL YOU. Only whether the geometry downstream of the
 * landmarks behaves: bands wrapping correctly, visibility flipping at the right
 * yaw, the protractor not inverting, labels not colliding. It says nothing
 * about whether MediaPipe puts landmark 10 where this file assumes it does on a
 * real head with hair over the forehead. That question needs real images, and
 * /ar-lab takes them from local disk without uploading or committing anything.
 */

import { LM } from './fade-geometry'

export interface Pose {
  /** Turn left/right, degrees. Face tracking gives out somewhere past ±70. */
  yaw?: number
  /** Nod, degrees. */
  pitch?: number
  /** Head tilt toward a shoulder, degrees. */
  roll?: number
}

/**
 * Base positions in a head-centred frame, y DOWN to match image convention.
 *
 * Same numbers as the unit-test fixture in fade-geometry.test.ts, deliberately:
 * that fixture is verified to produce an orthonormal basis with `fwd` pointing
 * at the camera, so anything rendered from these is being rendered from a frame
 * already known to be correctly oriented. Getting the y sign wrong here would
 * put a fade line under the chin, and it would look plausible enough in a
 * thumbnail to survive review.
 */
const BASE: Record<number, [number, number, number]> = {
  [LM.CHIN]: [0, 100, 0],
  [LM.FOREHEAD]: [0, -100, 0],
  [LM.SIDE_LEFT]: [-80, 0, 0],
  [LM.SIDE_RIGHT]: [80, 0, 0],
  [LM.EYE_OUTER_LEFT]: [-50, -40, -20],
  [LM.EYE_OUTER_RIGHT]: [50, -40, -20],
  [LM.TEMPLE_LEFT]: [-70, -75, -10],
  [LM.TEMPLE_RIGHT]: [70, -75, -10],
  [LM.NOSE_BASE]: [0, 20, -40],
}

const rad = (d: number) => (d * Math.PI) / 180

/**
 * Landmarks for a head at `pose`, normalised the way MediaPipe emits them.
 *
 * `scale` is the head's half-extent as a fraction of the frame, so 0.32 fills a
 * comfortable portion of a square canvas. Assumes a square target: on a
 * non-square canvas x and y would be normalised against different dimensions
 * and the head would come out stretched, which is the same aspect-ratio trap
 * toPixelSpace exists to undo.
 */
export function syntheticHeadLandmarks(pose: Pose = {}, scale = 0.32): { x: number; y: number; z: number }[] {
  const { yaw = 0, pitch = 0, roll = 0 } = pose
  // Negated so a positive `yaw` asked for here comes back as the same positive
  // number the overlay reports. Rotating about +Y in this coordinate system
  // produces the opposite sign to atan2(fwd.x, -fwd.z), and a harness whose
  // tiles say "asked +75°, measured −75°" about the same picture is worse than
  // no harness — it trains you to ignore the one number that is checking it.
  const cy = Math.cos(rad(-yaw))
  const sy = Math.sin(rad(-yaw))
  const cp = Math.cos(rad(pitch))
  const sp = Math.sin(rad(pitch))
  const cr = Math.cos(rad(roll))
  const sr = Math.sin(rad(roll))

  // Enough entries that the frame builder's bounds check passes; only the nine
  // it reads carry meaning, and the filler sits at the head's centre so a debug
  // render does not show a cloud of dots at the origin of the frame.
  const out = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))

  for (const [idxStr, [bx, by, bz]] of Object.entries(BASE)) {
    // Pitch about X, then yaw about Y, then roll about Z.
    const y1 = by * cp - bz * sp
    const z1 = by * sp + bz * cp
    const x2 = bx * cy + z1 * sy
    const z2 = -bx * sy + z1 * cy
    const x3 = x2 * cr - y1 * sr
    const y3 = x2 * sr + y1 * cr

    const k = scale / 100
    out[Number(idxStr)] = { x: 0.5 + x3 * k, y: 0.5 + y3 * k, z: z2 * k }
  }
  return out
}
