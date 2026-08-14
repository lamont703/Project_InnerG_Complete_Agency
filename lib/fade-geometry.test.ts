import { describe, it, expect } from "vitest"
import {
  LM,
  GUARDS,
  buildHeadFrame,
  buildLadder,
  deriveFadePlan,
  headBand,
  skullRadius,
  axisPoint,
  toPixelSpace,
  dot,
  len,
  sub,
  normalize,
  guardById,
  type Vec3,
  type FadeSpec,
} from "./fade-geometry"
import { syntheticHeadLandmarks } from "./fade-synthetic-head"

/**
 * A synthetic head in a known pose, so the geometry can be checked against
 * numbers worked out by hand. Only the indices the frame actually reads are
 * meaningful; the rest of the 478 exist so array bounds behave like the real
 * mesh.
 *
 * Laid out in image convention — y grows downward — because that is what
 * arrives from MediaPipe, and getting the sign wrong here is exactly the class
 * of bug that puts a fade line under someone's chin.
 */
function syntheticFace(): Vec3[] {
  const pts: Vec3[] = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }))
  pts[LM.CHIN] = { x: 0, y: 100, z: 0 }
  pts[LM.FOREHEAD] = { x: 0, y: -100, z: 0 }
  pts[LM.SIDE_LEFT] = { x: -80, y: 0, z: 0 }
  pts[LM.SIDE_RIGHT] = { x: 80, y: 0, z: 0 }
  pts[LM.EYE_OUTER_LEFT] = { x: -50, y: -40, z: -20 }
  pts[LM.EYE_OUTER_RIGHT] = { x: 50, y: -40, z: -20 }
  pts[LM.TEMPLE_LEFT] = { x: -70, y: -75, z: -10 }
  pts[LM.TEMPLE_RIGHT] = { x: 70, y: -75, z: -10 }
  pts[LM.NOSE_BASE] = { x: 0, y: 20, z: -40 }
  return pts
}

/** Rotate about X then Y, so a test pose is tilted in two axes at once. */
function rotate(p: Vec3, rx: number, ry: number): Vec3 {
  const y1 = p.y * Math.cos(rx) - p.z * Math.sin(rx)
  const z1 = p.y * Math.sin(rx) + p.z * Math.cos(rx)
  const x2 = p.x * Math.cos(ry) + z1 * Math.sin(ry)
  const z2 = -p.x * Math.sin(ry) + z1 * Math.cos(ry)
  return { x: x2, y: y1, z: z2 }
}

describe("toPixelSpace", () => {
  it("scales x and z by width but y by height, so a wide frame does not skew the basis", () => {
    // The whole reason this function exists. On a 1280x720 frame, treating the
    // normalised coordinates as if they shared a unit tilts every axis derived
    // from them.
    const [p] = toPixelSpace([{ x: 0.5, y: 0.5, z: 0.25 }], 1280, 720)
    expect(p.x).toBe(640)
    expect(p.y).toBe(360)
    expect(p.z).toBe(320)
  })
})

describe("buildHeadFrame", () => {
  it("returns an orthonormal basis", () => {
    const f = buildHeadFrame(syntheticFace())!
    expect(f).not.toBeNull()
    for (const v of [f.up, f.right, f.fwd]) expect(len(v)).toBeCloseTo(1, 6)
    expect(dot(f.up, f.right)).toBeCloseTo(0, 6)
    expect(dot(f.up, f.fwd)).toBeCloseTo(0, 6)
    expect(dot(f.right, f.fwd)).toBeCloseTo(0, 6)
  })

  it("points fwd out of the face, towards the camera", () => {
    // MediaPipe's z grows away from the viewer, so 'towards the camera' is
    // negative z. headBand's visibility test depends on this sign.
    const f = buildHeadFrame(syntheticFace())!
    expect(f.fwd.z).toBeLessThan(0)
  })

  it("anchors u at 0 on the chin and 1 on the forehead", () => {
    const f = buildHeadFrame(syntheticFace())!
    const uOf = (q: Vec3) => dot(sub(q, f.chin), f.up) / f.faceHeight
    expect(uOf(f.chin)).toBeCloseTo(0, 6)
    expect(uOf({ x: 0, y: -100, z: 0 })).toBeCloseTo(1, 6)
  })

  it("orders the anatomy up the head", () => {
    const { levels } = buildHeadFrame(syntheticFace())!
    expect(levels.perimeter).toBeLessThan(levels.earCanal)
    expect(levels.earCanal).toBeLessThan(levels.earTop)
    expect(levels.earTop).toBeLessThan(levels.temple)
    expect(levels.temple).toBeLessThan(levels.parietal)
    expect(levels.parietal).toBeLessThan(levels.vertex)
  })

  it("gives the same head-relative levels when the head moves, turns and changes distance", () => {
    // This is the property the whole overlay rests on. A 'mid fade' has to mean
    // the same place on the skull whether the student is close, far, or looking
    // at a profile — if u drifts with pose, the line drifts with it.
    const base = syntheticFace()
    const moved = base.map((p) => {
      const r = rotate(p, 0.3, -0.5)
      return { x: r.x * 2.5 + 400, y: r.y * 2.5 - 120, z: r.z * 2.5 + 30 }
    })

    const a = buildHeadFrame(base)!
    const b = buildHeadFrame(moved)!

    for (const k of ["perimeter", "earCanal", "earTop", "temple", "parietal", "vertex"] as const) {
      expect(b.levels[k]).toBeCloseTo(a.levels[k], 5)
    }
    expect(b.headWidth).toBeCloseTo(a.headWidth * 2.5, 4)
  })

  it("refuses a collapsed mesh rather than returning a degenerate frame", () => {
    const flat = Array.from({ length: 478 }, () => ({ x: 10, y: 10, z: 0 }))
    expect(buildHeadFrame(flat)).toBeNull()
    expect(buildHeadFrame([{ x: 0, y: 0, z: 0 }])).toBeNull()
  })
})

describe("skullRadius", () => {
  it("holds width up to the parietal ridge, then falls to nothing at the vertex", () => {
    const f = buildHeadFrame(syntheticFace())!
    const { parietal, vertex } = f.levels
    const wide = skullRadius(f, parietal)
    expect(skullRadius(f, f.levels.earTop)).toBeCloseTo(wide, 6)
    expect(skullRadius(f, (parietal + vertex) / 2)).toBeLessThan(wide)
    expect(skullRadius(f, vertex)).toBeCloseTo(0, 6)
    expect(skullRadius(f, vertex + 1)).toBe(0)
  })
})

describe("headBand", () => {
  it("lays every point at the modelled distance around the head axis", () => {
    const f = buildHeadFrame(syntheticFace())!
    const u = f.levels.earTop
    const centre = axisPoint(f, u)
    const a = skullRadius(f, u)

    for (const bp of headBand(f, u, 24)) {
      const d = sub(bp.point, centre)
      // No component along the head axis: the band is level with itself.
      expect(dot(d, f.up)).toBeCloseTo(0, 4)
      const across = dot(d, f.right)
      const through = dot(d, f.fwd)
      expect(Math.abs(across)).toBeLessThanOrEqual(a + 1e-6)
      // Deeper than wide, so the front-to-back reach exceeds the half-width.
      expect(Math.abs(through)).toBeLessThanOrEqual(a * 1.23)
    }
  })

  it("marks half the ring hidden, so the far side can be drawn as the far side", () => {
    const f = buildHeadFrame(syntheticFace())!
    const band = headBand(f, f.levels.earTop, 72)
    const visible = band.filter((b) => b.visible).length
    expect(visible).toBeGreaterThan(30)
    expect(visible).toBeLessThan(42)
  })

  it("keeps normals unit length so the elevation protractor reads a true angle", () => {
    const f = buildHeadFrame(syntheticFace())!
    for (const bp of headBand(f, f.levels.temple, 16)) {
      expect(len(bp.normal)).toBeCloseTo(1, 6)
      // An outward normal on a level band never points up or down the head.
      expect(dot(bp.normal, f.up)).toBeCloseTo(0, 6)
    }
  })
})

describe("buildLadder", () => {
  it("runs from the bottom guard to the top, inclusive", () => {
    const l = buildLadder("bald", "2")
    expect(l[0].id).toBe("bald")
    expect(l[l.length - 1].id).toBe("2")
    expect(l.every((g, i) => i === 0 || g.inches > l[i - 1].inches)).toBe(true)
  })

  it("drops half guards once the ladder would run past six rungs", () => {
    // A student does not change guard eight times on one side. Half sizes are
    // what you reach for to kill a line that showed up, not a planned rung.
    const long = buildLadder("bald", "4")
    expect(long.length).toBeLessThanOrEqual(6)
    expect(long.some((g) => g.id.includes(".5"))).toBe(false)
    expect(long[0].id).toBe("bald")
    expect(long[long.length - 1].id).toBe("4")
  })

  it("keeps half guards in a short ladder, where they are the only rungs there are", () => {
    const short = buildLadder("bald", "1")
    expect(short.map((g) => g.id)).toEqual(["bald", "0", "0.5", "1"])
  })

  it("returns nothing when the top is not above the bottom", () => {
    expect(buildLadder("2", "2")).toEqual([])
    expect(buildLadder("3", "1")).toEqual([])
    expect(buildLadder("nope", "2")).toEqual([])
  })
})

describe("deriveFadePlan", () => {
  const frame = buildHeadFrame(syntheticFace())!
  const spec = (over: Partial<FadeSpec> = {}): FadeSpec => ({ height: "mid", bottom: "skin", topGuard: "3", ...over })

  it("puts a high fade under the parietal ridge and a low fade just over the ear", () => {
    const { levels } = frame
    const high = deriveFadePlan(spec({ height: "high" }), levels)
    const low = deriveFadePlan(spec({ height: "low" }), levels)

    expect(high.uLine).toBeLessThan(levels.parietal)
    expect(high.uLine).toBeGreaterThan(levels.temple)
    expect(low.uLine).toBeGreaterThan(levels.earTop)
    expect(low.uLine).toBeLessThan(levels.temple)
    expect(low.uLine).toBeLessThan(high.uLine)
  })

  it("leaves a taper's line on the ear and flags it as perimeter work", () => {
    const t = deriveFadePlan(spec({ height: "taper" }), frame.levels)
    expect(t.perimeterOnly).toBe(true)
    expect(t.uLine).toBeCloseTo(frame.levels.earTop, 6)
    expect(t.placement).toMatch(/perimeter/i)
  })

  it("covers the blend zone with contiguous bands, bottom guard lowest", () => {
    const p = deriveFadePlan(spec(), frame.levels)
    expect(p.ladder.length).toBeGreaterThan(1)
    expect(p.ladder[0].uFrom).toBeCloseTo(p.uPerimeter, 6)
    expect(p.ladder[p.ladder.length - 1].uTo).toBeCloseTo(p.uLine, 6)
    p.ladder.forEach((r, i) => {
      expect(r.uTo).toBeGreaterThan(r.uFrom)
      if (i > 0) expect(r.uFrom).toBeCloseTo(p.ladder[i - 1].uTo, 6)
    })
    expect(p.ladder[0].guard.id).toBe("bald")
  })

  it("starts the procedure from the finished shape and cuts the top before blending", () => {
    // The pedagogy is the product. If these two ever stop being the first two
    // steps, the tool has quietly become another sequence to memorise.
    const p = deriveFadePlan(spec())
    expect(p.steps[0].title).toMatch(/finished shape/i)
    expect(p.steps[1].title).toMatch(/top before/i)
  })

  it("sets both edges of the fade before filling the middle", () => {
    const p = deriveFadePlan(spec(), frame.levels)
    const baseline = p.steps.findIndex((s) => /baseline/i.test(s.title))
    const ceiling = p.steps.findIndex((s) => /ceiling/i.test(s.title))
    const firstFill = p.steps.findIndex((s) => /^Fill in/i.test(s.title))
    expect(baseline).toBeGreaterThanOrEqual(0)
    expect(ceiling).toBeGreaterThan(baseline)
    if (firstFill >= 0) expect(firstFill).toBeGreaterThan(ceiling)
  })

  it("only ever highlights a rung that exists", () => {
    for (const height of ["taper", "low", "mid", "high"] as const) {
      for (const bottom of ["skin", "shadow", "one"] as const) {
        for (const topGuard of GUARDS.slice(3).map((g) => g.id)) {
          const p = deriveFadePlan({ height, bottom, topGuard }, frame.levels)
          for (const s of p.steps) {
            if (s.rung === null) continue
            expect(s.rung).toBeGreaterThanOrEqual(0)
            expect(s.rung).toBeLessThan(p.ladder.length)
          }
        }
      }
    }
  })

  it("says so when the top is no longer than the bottom, instead of inventing passes", () => {
    // Reachable from the picker: bottom #1, top #1. The old version emitted a
    // 'set the ceiling' step pointing at rung -1.
    const p = deriveFadePlan({ height: "mid", bottom: "one", topGuard: "1" }, frame.levels)
    expect(p.ladder).toEqual([])
    expect(p.steps).toHaveLength(1)
    expect(p.steps[0].rung).toBeNull()
    expect(p.steps[0].title).toMatch(/no fade/i)
  })

  it("works with no head in front of the camera, so the plan can be read before tracking starts", () => {
    const p = deriveFadePlan(spec())
    expect(p.ladder.length).toBeGreaterThan(1)
    expect(p.uLine).toBeGreaterThan(p.uPerimeter)
  })
})

describe("guards", () => {
  it("ascends in length, with bald at zero", () => {
    expect(GUARDS[0].inches).toBe(0)
    expect(GUARDS.every((g, i) => i === 0 || g.inches > GUARDS[i - 1].inches)).toBe(true)
  })

  it("looks up by id", () => {
    expect(guardById("2")?.inches).toBeCloseTo(0.25, 6)
    expect(guardById("nope")).toBeUndefined()
  })
})

describe("syntheticHeadLandmarks", () => {
  // The harness in /ar-lab is only worth looking at if the poses it renders are
  // the poses it claims. If the frame builder's basis were skewed, the pictures
  // would still look plausible — these assertions are what stops a confidently
  // wrong contact sheet.
  const measure = (pose: Parameters<typeof syntheticHeadLandmarks>[0]) => {
    const f = buildHeadFrame(toPixelSpace(syntheticHeadLandmarks(pose), 400, 400))!
    expect(f).not.toBeNull()
    return { frame: f, yaw: (Math.atan2(f.fwd.x, -f.fwd.z) * 180) / Math.PI }
  }

  it("round-trips the yaw it was asked for", () => {
    for (const yaw of [-75, -50, -25, 0, 25, 50, 75]) {
      expect(measure({ yaw }).yaw).toBeCloseTo(yaw, 0)
    }
  })

  it("faces the camera at rest", () => {
    const { frame, yaw } = measure({})
    expect(yaw).toBeCloseTo(0, 4)
    expect(frame.fwd.z).toBeLessThan(0)
  })

  it("keeps the anatomy ordered under pitch and roll", () => {
    for (const pose of [{ pitch: -25 }, { pitch: 25 }, { roll: 20 }, { yaw: 35, pitch: 15 }]) {
      const { levels } = measure(pose).frame
      expect(levels.earTop).toBeGreaterThan(levels.earCanal)
      expect(levels.parietal).toBeGreaterThan(levels.temple)
    }
  })

  it("normalises into frame, so the head is actually on the canvas", () => {
    for (const yaw of [-75, 0, 75]) {
      for (const p of syntheticHeadLandmarks({ yaw })) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(1)
      }
    }
  })
})

describe("vector helpers", () => {
  it("normalizes to unit length and survives a zero vector", () => {
    expect(len(normalize({ x: 3, y: 4, z: 0 }))).toBeCloseTo(1, 9)
    expect(normalize({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 })
  })
})
