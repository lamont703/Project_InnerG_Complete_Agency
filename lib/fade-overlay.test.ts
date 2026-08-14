import { describe, it, expect } from "vitest"
import { measureU } from "./fade-overlay"
import { syntheticHeadLandmarks } from "./fade-synthetic-head"
import { buildHeadFrame, headBand, toPixelSpace } from "./fade-geometry"

/**
 * The calibration solver has to be trustworthy before any constant is tuned
 * with it, and it is the one piece of this feature whose output is a NUMBER
 * someone will act on rather than a picture someone will judge. A solver that
 * quietly returns a plausible height for every click would move
 * PARIETAL_ABOVE_FOREHEAD from an honest guess to a fabricated measurement,
 * which is strictly worse.
 *
 * So: project a point of known height, feed its screen coordinates back, and
 * require the height to come out again.
 */
const W = 600
const H = 600

/** Screen position of a point on the ring at height `u`, on the visible side. */
function screenPointAt(pose: Parameters<typeof syntheticHeadLandmarks>[0], u: number) {
  const lm = syntheticHeadLandmarks(pose)
  const frame = buildHeadFrame(toPixelSpace(lm, W, H))!
  const visible = headBand(frame, u, 144, { full: true }).filter((b) => b.visible)
  // Mid-run: away from the silhouette, where neighbouring heights crowd together.
  const bp = visible[Math.floor(visible.length / 2)]
  return { lm, x: bp.point.x, y: bp.point.y }
}

describe("measureU", () => {
  it("recovers the height of a point it was given, head-on", () => {
    for (const u of [0.4, 0.6, 0.8, 1.0, 1.2]) {
      const { lm, x, y } = screenPointAt({}, u)
      const m = measureU(lm, W, H, false, x, y)!
      expect(m).not.toBeNull()
      expect(m.u).toBeCloseTo(u, 1)
    }
  })

  it("recovers the height under yaw, pitch and roll", () => {
    for (const pose of [{ yaw: 40 }, { yaw: -60, pitch: 12 }, { pitch: 25 }, { roll: 18, yaw: 20 }]) {
      for (const u of [0.6, 0.9, 1.15]) {
        const { lm, x, y } = screenPointAt(pose, u)
        const m = measureU(lm, W, H, false, x, y)!
        expect(Math.abs(m.u - u), `pose ${JSON.stringify(pose)} u ${u}`).toBeLessThan(0.06)
      }
    }
  })

  it("lands on the ring it matched, so a good click reports a small residual", () => {
    const { lm, x, y } = screenPointAt({ yaw: 30 }, 0.9)
    const m = measureU(lm, W, H, false, x, y)!
    expect(m.dist).toBeLessThan(m.headWidthPx * 0.03)
  })

  it("reports a large residual for a click nowhere near the head", () => {
    // The honest-degradation property. Without it, a stray click produces a
    // confident number and a fabricated constant.
    const lm = syntheticHeadLandmarks({})
    const m = measureU(lm, W, H, false, 5, 5)!
    expect(m.dist).toBeGreaterThan(m.headWidthPx * 0.25)
  })

  it("accounts for a mirrored canvas rather than measuring the wrong side", () => {
    const { lm, x, y } = screenPointAt({ yaw: 35 }, 0.85)
    const mirrored = measureU(lm, W, H, true, W - x, y)!
    expect(Math.abs(mirrored.u - 0.85)).toBeLessThan(0.06)
  })

  it("returns null when there is no usable head", () => {
    expect(measureU([], W, H, false, 10, 10)).toBeNull()
    expect(measureU(Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 })), W, H, false, 10, 10)).toBeNull()
  })
})
