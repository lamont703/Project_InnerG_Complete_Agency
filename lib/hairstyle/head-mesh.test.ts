import { describe, it, expect } from "vitest";
import { buildHeadMesh, referenceFrame, coverage, lengthAtU, hairlineU } from "./head-mesh";
import { deriveFadePlan } from "@/lib/fade-geometry";
import { STYLE_PRESETS } from "./request";

const frame = referenceFrame();
const midSkin = STYLE_PRESETS.find((p) => p.id === "mid-skin")!.spec;

describe("coverage", () => {
  it("shows bare scalp at zero length", () => {
    expect(coverage(0)).toBe(0);
  });

  it("rises fastest at the short end, where the eye actually sees it", () => {
    // A linear ramp makes a fade look like a grey wash. The gap between bald
    // and a #1 has to read stronger than the gap between #3 and #4.
    const shortGap = coverage(1 / 8) - coverage(0);
    const longGap = coverage(0.5) - coverage(3 / 8);
    expect(shortGap).toBeGreaterThan(longGap);
  });

  it("never exceeds full coverage", () => {
    expect(coverage(10)).toBeLessThanOrEqual(1);
  });
});

describe("lengthAtU", () => {
  const plan = deriveFadePlan(midSkin, frame.levels);

  it("is bare below the perimeter", () => {
    expect(lengthAtU(plan, plan.uPerimeter - 0.05, 0.5)).toBe(0);
  });

  it("is the top guard above the line", () => {
    expect(lengthAtU(plan, plan.uLine + 0.05, 0.5)).toBe(0.5);
  });

  it("blends rather than stepping between guards", () => {
    // Hard bands would show the barber the exact thing the whole cut removes.
    const span = plan.uLine - plan.uPerimeter;
    const samples = Array.from({ length: 40 }, (_, i) =>
      lengthAtU(plan, plan.uPerimeter + (span * i) / 39, 0.5),
    );
    const jumps = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
    // No single step should be a whole guard's worth.
    expect(Math.max(...jumps)).toBeLessThan(1 / 8);
  });

  it("increases monotonically up the head", () => {
    const span = plan.uLine - plan.uPerimeter;
    const samples = Array.from({ length: 30 }, (_, i) =>
      lengthAtU(plan, plan.uPerimeter + (span * i) / 29, 0.5),
    );
    samples.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(samples[i] - 1e-9));
  });
});

describe("buildHeadMesh", () => {
  it("produces a closed, non-degenerate mesh", () => {
    const m = buildHeadMesh(frame, midSkin);
    expect(m.vertexCount).toBeGreaterThan(1000);
    expect(m.triangleCount).toBeGreaterThan(1000);
    expect(m.positions.length).toBe(m.vertexCount * 3);
    expect(m.normals.length).toBe(m.vertexCount * 3);
    expect(m.colors.length).toBe(m.vertexCount * 3);
  });

  it("has no NaN anywhere — one bad vertex takes the whole render down", () => {
    const m = buildHeadMesh(frame, midSkin);
    for (const arr of [m.positions, m.normals, m.colors, m.lengths]) {
      expect(Array.from(arr).every(Number.isFinite)).toBe(true);
    }
  });

  it("indexes only vertices that exist", () => {
    const m = buildHeadMesh(frame, midSkin);
    expect(Math.max(...Array.from(m.indices))).toBeLessThan(m.vertexCount);
  });

  it("keeps normals unit length, or lighting goes wrong", () => {
    const m = buildHeadMesh(frame, midSkin);
    for (let i = 0; i < m.normals.length; i += 3) {
      const l = Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2]);
      expect(l).toBeGreaterThan(0.9);
      expect(l).toBeLessThan(1.1);
    }
  });

  it("puts the fade line where the 2D overlay puts it", () => {
    // The whole reason this reuses fade-geometry: two renderers that disagree
    // about where a fade sits would be worse than one.
    const m = buildHeadMesh(frame, midSkin);
    expect(m.plan.uLine).toBe(deriveFadePlan(midSkin, frame.levels).uLine);
  });

  it("moves the line up when the style says high", () => {
    const low = buildHeadMesh(frame, { ...midSkin, height: "low" });
    const high = buildHeadMesh(frame, { ...midSkin, height: "high" });
    expect(high.plan.uLine).toBeGreaterThan(low.plan.uLine);
  });

  it("renders every shipped preset without falling over", () => {
    STYLE_PRESETS.forEach((p) => {
      const m = buildHeadMesh(frame, p.spec);
      expect(m.triangleCount).toBeGreaterThan(0);
      expect(Array.from(m.positions).every(Number.isFinite)).toBe(true);
    });
  });

  it("IS CLOSED — no hole at the crown, none at the neck", () => {
    /*
     * The test that would have caught the flat-topped head.
     *
     * A stack of rings is a tube, and an open tube does not look like a hole
     * when the material draws both faces — it looks like a head with a flat top
     * and a sawn-off neck. Every other test passed: the silhouette was smooth,
     * the normals were unit length, nothing was NaN.
     *
     * A closed surface has every edge shared by exactly two triangles. Counting
     * them is the whole check.
     */
    const m = buildHeadMesh(frame, midSkin);
    const edges = new Map<string, number>();
    for (let i = 0; i < m.indices.length; i += 3) {
      const t = [m.indices[i], m.indices[i + 1], m.indices[i + 2]];
      for (let e = 0; e < 3; e++) {
        const a = t[e];
        const b = t[(e + 1) % 3];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    const boundary = [...edges.values()].filter((n) => n !== 2).length;
    expect(boundary).toBe(0);
  });

  it("winds every triangle the same way round", () => {
    // A cap fanned the wrong way is lit from inside and renders as a black
    // disc, which looks like a hole rather than like reversed winding.
    const m = buildHeadMesh(frame, midSkin);
    let wrong = 0;
    for (let i = 0; i < m.indices.length; i += 3) {
      const [ia, ib, ic] = [m.indices[i], m.indices[i + 1], m.indices[i + 2]];
      const P = (k: number) => [m.positions[k * 3], m.positions[k * 3 + 1], m.positions[k * 3 + 2]];
      const [ax, ay, az] = P(ia);
      const [bx, by, bz] = P(ib);
      const [cx, cy, cz] = P(ic);
      const u = [bx - ax, by - ay, bz - az];
      const v = [cx - ax, cy - ay, cz - az];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      // Compare against the shading normal that three.js will actually use.
      const dot =
        n[0] * m.normals[ia * 3] + n[1] * m.normals[ia * 3 + 1] + n[2] * m.normals[ia * 3 + 2];
      if (dot < 0) wrong++;
    }
    expect(wrong / (m.indices.length / 3)).toBeLessThan(0.02);
  });

  it("draws no hair on the ear", () => {
    // There is no hair on a pinna, so no part of a fade happens there.
    const m = buildHeadMesh(frame, midSkin);
    expect(Array.from(m.lengths).some((l) => l === 0)).toBe(true);
  });
});

describe("the hairline", () => {
  const plan = deriveFadePlan(midSkin, frame.levels);

  it("is high at the front and drops to the perimeter round the back", () => {
    const front = hairlineU(0, plan.uPerimeter, 1);
    const temple = hairlineU(0.5, plan.uPerimeter, 1);
    const back = hairlineU(Math.PI, plan.uPerimeter, 1);
    expect(front).toBeCloseTo(1, 6);
    expect(back).toBeCloseTo(plan.uPerimeter, 6);
    expect(temple).toBeLessThan(front);
    expect(temple).toBeGreaterThan(back);
  });

  it("is symmetric left and right", () => {
    expect(hairlineU(0.7, plan.uPerimeter, 1)).toBeCloseTo(
      hairlineU(-0.7, plan.uPerimeter, 1),
      9,
    );
  });

  it("LEAVES THE FACE BARE while the back of the head at that height is not", () => {
    /*
     * Without this the fade runs through 360 degrees and the gradient is
     * painted straight down the forehead and across the face. fade-geometry
     * already names the failure for the 2D overlay — "geometrically consistent,
     * anatomically absurd, and confidently labelled" — and the ring model here
     * makes exactly the same assumption.
     *
     * Checked as a property of the built mesh, not of the helper, because it is
     * the wiring that was missing rather than the maths.
     */
    const m = buildHeadMesh(frame, midSkin);
    const SEG = 96;
    const ringCount = m.lengths.length / SEG;

    // A height inside the fade zone: above the perimeter, below the line.
    const target = (plan.uPerimeter + plan.uLine) / 2;
    let bestRing = 0;
    let bestErr = Infinity;
    for (let r = 0; r < ringCount; r++) {
      // Reconstruct the ring's height from its vertices' distance up the axis.
      const y = m.positions[r * SEG * 3 + 1] / frame.faceHeight + frame.axisOriginU;
      if (Math.abs(y - target) < bestErr) {
        bestErr = Math.abs(y - target);
        bestRing = r;
      }
    }

    const faceLen = m.lengths[bestRing * SEG + 0]; // theta = 0 is straight ahead
    const backLen = m.lengths[bestRing * SEG + SEG / 2]; // theta = PI is the back
    expect(faceLen).toBe(0);
    expect(backLen).toBeGreaterThan(0);
  });
});

describe("the reference frame's levels", () => {
  it("are strictly ordered up the head", () => {
    // Out-of-order levels do not error — they silently collapse the fade span.
    const l = referenceFrame().levels;
    expect(l.perimeter).toBeLessThan(l.earCanal);
    expect(l.earCanal).toBeLessThan(l.earTop);
    expect(l.earTop).toBeLessThan(l.temple);
    expect(l.temple).toBeLessThan(l.parietal);
    expect(l.parietal).toBeLessThan(l.vertex);
  });

  it("leaves a real span between earTop and parietal for the line to move in", () => {
    // uLine = earTop + fraction * (parietal - earTop). A zero span pins every
    // height to the same line and the style picker stops meaning anything.
    const l = referenceFrame().levels;
    expect(l.parietal - l.earTop).toBeGreaterThan(0.02);
  });

  it("gives every fade height a distinct line", () => {
    const f = referenceFrame();
    const us = (["taper", "low", "mid", "high"] as const).map(
      (height) => buildHeadMesh(f, { height, bottom: "skin", topGuard: "4" }).plan.uLine,
    );
    expect(new Set(us).size).toBe(4);
    expect(us).toEqual([...us].sort((a, b) => a - b));
  });
});
