import { describe, it, expect } from "vitest";
import { BONE_FEATURES, boneOffset, featureWeight } from "./bone-structure";
import { ringSpacingBelowLine, referenceFrame } from "./head-mesh";
import { deriveFadePlan } from "@/lib/fade-geometry";

const byName = (n: string) => BONE_FEATURES.find((f) => f.name.includes(n))!;

describe("edges versus bumps", () => {
  it("makes the mandible an EDGE — it dies fast below the line and bleeds above", () => {
    /*
     * The distinction the whole lower face turned on. A symmetric window is a
     * swelling, and a mandible built from one renders as a rounded lump on the
     * side of the jaw — a jowl. A jawline is a corner: the cheek plane and the
     * under-jaw plane meeting at one height.
     */
    const jaw = byName("mandible");
    expect(jaw.uHalfBelow).toBeDefined();
    expect(jaw.uHalfBelow!).toBeLessThan(jaw.uHalf / 3);

    const at = (du: number) => featureWeight(jaw, jaw.u + du, jaw.theta);
    expect(at(-0.09)).toBe(0); // gone, just below the line
    expect(at(0.09)).toBeGreaterThan(0.7); // still strong just above it
  });

  it("keeps symmetric features symmetric", () => {
    const occ = byName("occipital");
    expect(featureWeight(occ, occ.u + 0.1, Math.PI)).toBeCloseTo(
      featureWeight(occ, occ.u - 0.1, Math.PI),
      9,
    );
  });
});

describe("the mouth", () => {
  it("is LOCALISED IN ANGLE, not a band round the whole face", () => {
    /*
     * It used to be a dip in the front-depth profile, which is a function of
     * height alone — so it wrapped a horizontal groove from one jaw corner to
     * the other and read as a fold in the skin.
     */
    const mouth = byName("oral fissure");
    expect(mouth.thetaHalf).toBeLessThan(0.5);
    expect(featureWeight(mouth, mouth.u, 0)).toBeGreaterThan(0.9); // straight ahead
    expect(featureWeight(mouth, mouth.u, 1.2)).toBe(0); // at the jaw corner
    expect(featureWeight(mouth, mouth.u, Math.PI)).toBe(0); // behind the head
  });

  it("cuts in, with lips standing out above and below it", () => {
    expect(byName("oral fissure").amp).toBeLessThan(0);
    expect(byName("upper lip").amp).toBeGreaterThan(0);
    expect(byName("lower lip").amp).toBeGreaterThan(0);
    expect(byName("upper lip").u).toBeGreaterThan(byName("lower lip").u);
  });

  it("stays subtle — a mannequin has a mouth, not an expression", () => {
    for (const n of ["oral fissure", "upper lip", "lower lip"]) {
      expect(Math.abs(byName(n).amp)).toBeLessThan(0.05);
    }
  });
});

describe("boneOffset", () => {
  it("leaves the back of the head alone below the occiput", () => {
    // Nothing facial may reach round to where the fade actually lives.
    expect(boneOffset(0.2, Math.PI)).toBeCloseTo(0, 6);
  });

  it("never displaces enough to turn the head inside out", () => {
    for (let u = -0.2; u <= 1.3; u += 0.02) {
      for (let t = 0; t < Math.PI * 2; t += 0.1) {
        expect(Math.abs(boneOffset(u, t))).toBeLessThan(0.45);
      }
    }
  });
});

describe("every feature must be coarser than the mesh that samples it", () => {
  it("has no feature thinner than two ring spacings", () => {
    /*
     * THE CHECK THAT WOULD HAVE CAUGHT BOTH TIMES THIS HAPPENED.
     *
     * A detail finer than the sampling does not render fine. It renders
     * ALIASED — the hairline came out as a staircase across the temple, and the
     * mouth as a row of little squares — and both looked like a broken feature
     * rather than a mesh too coarse to carry it.
     *
     * Ring spacing is the sampling rate in u, so anything with a half-width
     * under about two of them cannot be resolved.
     */
    const plan = deriveFadePlan(
      { height: "mid", bottom: "skin", topGuard: "4" },
      referenceFrame().levels,
    );
    const spacing = ringSpacingBelowLine(plan.uLine);
    for (const f of BONE_FEATURES) {
      const narrowest = Math.min(f.uHalf, f.uHalfBelow ?? f.uHalf);
      expect(
        narrowest,
        `${f.name} half-width ${narrowest} vs ring spacing ${spacing.toFixed(4)}`,
        /*
         * 2.8, not 1.8. The first version of this guard passed the mandible at
         * exactly 1.8 spacings and the jawline still rendered as a staircase —
         * a threshold set from arithmetic rather than from looking at it. Two
         * samples across a falloff is not enough to carry a smooth edge.
         */
      ).toBeGreaterThan(spacing * 2.8);
    }
  });
});
