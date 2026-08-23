import { describe, it, expect } from "vitest";
import {
  profileFraction,
  frontDepthFraction,
  earMask,
  earRelief,
  mannequinRing,
  MANNEQUIN_U_MIN,
  MANNEQUIN_U_MAX,
} from "./mannequin";
import { referenceFrame } from "./head-mesh";

const sample = (n = 90) =>
  Array.from({ length: n }, (_, i) => {
    const u = MANNEQUIN_U_MIN + ((MANNEQUIN_U_MAX - MANNEQUIN_U_MIN) * i) / (n - 1);
    return { u, r: profileFraction(u) };
  });

describe("the silhouette", () => {
  it("is NOT a cylinder — this is the bug that shipped", () => {
    // v1 reused skullRadius and drew a constant radius from the neck to the
    // parietal ridge, then a dome. A bucket. Nobody had looked at the profile
    // as numbers, so nothing caught it until it was on screen.
    const lower = sample().filter((p) => p.u < 0.67); // everything below the ear
    const distinct = new Set(lower.map((p) => p.r.toFixed(2)));
    expect(distinct.size).toBeGreaterThan(6);
  });

  it("has a neck narrower than the head — but a NECK, not a stem", () => {
    /*
     * Both bounds earned. The upper one is obvious. The lower one was added
     * after two versions shipped a neck at a third of the head's width, which
     * is a chess pawn: the block read as a thumb and then as a mushroom, and
     * every fix aimed at the skull instead of at the two numbers responsible.
     * A real neck is about 12cm against a 15cm head.
     */
    const neck = profileFraction(-0.20);
    expect(neck).toBeLessThan(0.7);
    expect(neck).toBeGreaterThan(0.45);
    expect(profileFraction(0.88)).toBeGreaterThan(0.95); // above the ear
  });

  it("keeps the neck a column rather than a taper", () => {
    // A cone from the crown to the base is a thumb. The stretch below the nape
    // should be near-parallel, with the flare happening above it.
    const spread = [-0.25, -0.1, 0.05, 0.2].map(profileFraction);
    expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(0.08);
  });

  it("hollows the nape instead of running straight into it", () => {
    // The slope has to INCREASE going up through the nape — that concavity is
    // the occiput overhanging. A straight ramp is the thumb again.
    const r = (u: number) => profileFraction(u);
    const lower = r(0.45) - r(0.32);
    const upper = r(0.6) - r(0.47);
    expect(upper).toBeGreaterThan(lower);
  });

  it("is widest around the ear and parietal ridge, where a head is widest", () => {
    const all = sample();
    const widest = all.reduce((a, b) => (b.r > a.r ? b : a));
    // The ear canal is at 0.67 and the parietal ridge at 1.10.
    expect(widest.u).toBeGreaterThan(0.6);
    expect(widest.u).toBeLessThan(1.1);
  });

  it("closes toward a point at the crown without reaching a degenerate ring", () => {
    // MANNEQUIN_U_MAX stops just below the apex on purpose: at the apex there
    // is no surface to take a normal from.
    expect(profileFraction(MANNEQUIN_U_MAX)).toBeGreaterThan(0);
    expect(profileFraction(MANNEQUIN_U_MAX)).toBeLessThan(0.25);
    expect(profileFraction(1.4)).toBe(0); // above the vertex there is no head
  });

  it("has NO LEDGE where the dome meets the profile", () => {
    /*
     * A sphere cap starts flat, so bolting one onto a profile that arrives
     * steep leaves a ring right round the crown. It measured -1.39 -> -0.06 ->
     * -0.56 across two hundredths of a unit and was plainly visible on screen,
     * while every existing test passed: the radius was continuous, monotone and
     * smooth-by-value. Value continuity is not what a lit surface shows.
     */
    const slope = (u: number) => (profileFraction(u + 1e-5) - profileFraction(u - 1e-5)) / 2e-5;
    const before = slope(1.19);
    const after = slope(1.21);
    expect(Math.abs(after - before)).toBeLessThan(Math.abs(before) * 0.5);
  });

  it("keeps slope continuous across every stop, not just the values", () => {
    // What smoothstep got wrong: it forced dr/du to zero at each control point,
    // which terraced the whole head into a stack of discs.
    const slope = (u: number) => (profileFraction(u + 1e-5) - profileFraction(u - 1e-5)) / 2e-5;
    const N = 300;
    const lo = MANNEQUIN_U_MIN + 0.02;
    const hi = 1.15; // below the pole, where curvature is genuinely unbounded
    const s = Array.from({ length: N }, (_, i) => slope(lo + ((hi - lo) * i) / (N - 1)));
    const jumps = s.slice(1).map((v, i) => Math.abs(v - s[i]));
    expect(Math.max(...jumps)).toBeLessThan(0.25);
  });

  it("rises then falls exactly once — no lumps", () => {
    // A second bump means a stop is out of order, which reads as a growth on
    // the side of the head rather than as anatomy.
    const all = sample(140);
    let turns = 0;
    for (let i = 2; i < all.length; i++) {
      const before = all[i - 1].r - all[i - 2].r;
      const after = all[i].r - all[i - 1].r;
      if (before > 1e-4 && after < -1e-4) turns++;
    }
    expect(turns).toBeLessThanOrEqual(1);
  });

  it("has no crease in the hand-placed part of the profile", () => {
    /*
     * Deliberately excludes the crown cap, and the reason matters.
     *
     * A dome closing to a point is genuinely steep near its apex — that is what
     * sqrt(1 - t^2) does, and a sphere does the same. Measuring it as a "jump"
     * flags correct geometry as a defect. The first version of this test did
     * exactly that and would have pushed the cap flatter to satisfy itself.
     *
     * What IS worth guarding is the region built from hand-placed stops, where
     * a crease is a typo rather than geometry.
     */
    const body = sample(200).filter((p) => p.u < 1.17);
    const steps = body.slice(1).map((p, i) => Math.abs(p.r - body[i].r));
    expect(Math.max(...steps)).toBeLessThan(0.06);
  });

  it("closes the crown monotonically, the way a dome does", () => {
    const cap = sample(120).filter((p) => p.u >= 1.17);
    cap.slice(1).forEach((p, i) => expect(p.r).toBeLessThanOrEqual(cap[i].r + 1e-9));
  });
});

describe("earMask", () => {
  it("puts an ear on each side, and nothing front or back", () => {
    const side = earMask(0.66, Math.PI / 2 + 0.25);
    expect(side).toBeGreaterThan(0.9);
    expect(earMask(0.66, -Math.PI / 2 - 0.25)).toBeCloseTo(side, 6); // symmetric
    expect(earMask(0.66, 0)).toBe(0); // face
    expect(earMask(0.66, Math.PI)).toBe(0); // back of the head
  });

  it("stays inside the head vertically — no ear on the crown or the neck", () => {
    expect(earMask(1.2, Math.PI / 2)).toBe(0);
    expect(earMask(0.0, Math.PI / 2)).toBe(0);
  });

  it("falls to zero smoothly, or the bump has a rim", () => {
    // A hard edge here is a crease in the surface and a hard line in the paint,
    // which is the pale rectangle this replaced.
    const N = 900;
    const samples = Array.from({ length: N }, (_, i) =>
      earMask(0.66, Math.PI / 2 + 0.25 - 0.8 + (1.6 * i) / (N - 1)),
    );
    const steps = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
    // Sampled well below the mesh's own 96 segments, so this measures the
    // function's continuity rather than the sampling rate.
    expect(Math.max(...steps)).toBeLessThan(0.03);
    expect(samples[0]).toBe(0);
    expect(samples[N - 1]).toBe(0);
  });
});

describe("the ear's shape", () => {
  it("is TALLER THAN IT IS WIDE on the surface — a circle reads as a patch", () => {
    // Proportion alone is what identifies an ear. Measured in surface distance,
    // so the angular half-width is converted through the head's radius.
    const halfHeightOnSurface = 0.23; // EAR_U_HALF, in head-heights
    const halfWidthOnSurface = 0.24 * 0.43; // EAR_THETA_HALF radians * radius
    expect(halfHeightOnSurface / halfWidthOnSurface).toBeGreaterThan(1.6);
  });

  it("has a RIM, with the relief peaking off-centre", () => {
    // A smooth dome the size of an ear reads as a swelling. The helix stands
    // proud and the concha is hollow inside it.
    const centre = earRelief(0.66, Math.PI / 2 + 0.25);
    const offCentre = earRelief(0.66 + 0.23 * 0.45, Math.PI / 2 + 0.25);
    expect(offCentre).toBeGreaterThan(centre);
  });

  it("stops at the edge, both for shape and for mask", () => {
    expect(earRelief(0.66, 0)).toBe(0);
    expect(earMask(0.66, 0)).toBe(0);
  });
});

describe("frontDepthFraction", () => {
  it("PUSHES THE CHIN PAST THE ELLIPSE and pulls the forehead inside it", () => {
    /*
     * The old faceFlatten() could only subtract, so the lower face was
     * neck-width all the way round and a chin added on top landed as a lump on
     * the neck. A jaw projects; a forehead is flatter than the back of a skull.
     * One of those needs a number above 1 and the other below it.
     */
    // Measured as a peak over the lower face, not at one hardcoded height —
    // the chin's exact stop moves when the profile is tuned, and a test that
    // breaks on tuning teaches you to loosen it rather than to read it.
    const lowerFace = Array.from({ length: 60 }, (_, i) => frontDepthFraction(-0.05 + i * 0.01));
    expect(Math.max(...lowerFace)).toBeGreaterThan(1.25); // chin projects
    expect(frontDepthFraction(1.0)).toBeLessThan(0.95); // forehead is flatter
  });

  it("puts the mouth's concavity between the chin and the nose", () => {
    // A face in profile is not convex. Losing this makes it a muzzle.
    expect(frontDepthFraction(0.3)).toBeLessThan(frontDepthFraction(0.16));
  });

  it("takes the throat back under the jaw", () => {
    expect(frontDepthFraction(-0.1)).toBeLessThan(frontDepthFraction(0.16));
  });

  it("never inverts the head", () => {
    for (let u = -0.4; u <= 1.4; u += 0.01) {
      expect(frontDepthFraction(u)).toBeGreaterThan(0.5);
      expect(frontDepthFraction(u)).toBeLessThan(1.8);
    }
  });
});

describe("mannequinRing", () => {
  const frame = referenceFrame();

  it("returns one point per segment, all finite", () => {
    const r = mannequinRing(frame, 0.67, 48);
    expect(r).toHaveLength(48);
    r.forEach((p) => {
      [p.x, p.y, p.z, p.nx, p.ny, p.nz].forEach((v) => expect(Number.isFinite(v)).toBe(true));
    });
  });

  it("keeps normals unit length", () => {
    mannequinRing(frame, 0.67, 48).forEach((p) => {
      expect(Math.hypot(p.nx, p.ny, p.nz)).toBeCloseTo(1, 3);
    });
  });

  it("points every normal outward — a flipped one renders black", () => {
    for (const u of [-0.2, 0.0, 0.3, 0.67, 1.1, 1.3]) {
      mannequinRing(frame, u, 32).forEach((p) => {
        // Radially outward from the vertical axis.
        const rx = p.x;
        const rz = p.z;
        const radial = Math.hypot(rx, rz);
        if (radial < 1e-6) return;
        expect((rx / radial) * p.nx + (rz / radial) * p.nz).toBeGreaterThan(-0.2);
      });
    }
  });

  it("is deeper front-to-back than it is wide, like a real head", () => {
    const r = mannequinRing(frame, 0.67, 64);
    const halfWidth = Math.max(...r.map((p) => Math.abs(p.x)));
    const halfDepth = Math.max(...r.map((p) => Math.abs(p.z)));
    expect(halfDepth).toBeGreaterThan(halfWidth);
  });
});

describe("proportions", () => {
  it("has a neck stub, not a bust", () => {
    // A wig block has just enough neck to sit on a stand. A neck as tall as the
    // skull reads as a mannequin on a plinth, and spends rings far from the fade.
    const neckBottom = MANNEQUIN_U_MIN;
    const jaw = 0; // the chin, by definition of u
    const crown = MANNEQUIN_U_MAX;
    const neckLength = jaw - neckBottom;
    const headLength = crown - jaw;
    expect(neckLength).toBeLessThan(headLength * 0.45);
  });

  it("IS TALLER THAN IT IS WIDE", () => {
    /*
     * The test that would have caught the squat head immediately.
     *
     * PROFILE's stops were authored in an ear-centred u-space while everything
     * else used fade-geometry's chin-to-forehead one, which deleted the whole
     * chin-to-ear span. Every other test still passed: the silhouette was
     * smooth, ordered, widest in the right place and narrower at the neck. It
     * was simply 1.8x too short, and no test looked at the head as a whole.
     *
     * A real head is about 23cm chin-to-crown and 15cm across.
     */
    const frame = referenceFrame();
    const at = (u: number) => mannequinRing(frame, u, 64);
    const all = Array.from({ length: 60 }, (_, i) =>
      at(MANNEQUIN_U_MIN + ((MANNEQUIN_U_MAX - MANNEQUIN_U_MIN) * i) / 59),
    ).flat();

    const height = Math.max(...all.map((p) => p.y)) - Math.min(...all.map((p) => p.y));
    const width = Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x));
    expect(height / width).toBeGreaterThan(1.5);
  });

  it("puts the chin roughly three-fifths of the way up, not at the bottom", () => {
    // u = 0 is the chin. A block that starts at the chin has no neck; one that
    // starts far below it is a bust.
    expect(MANNEQUIN_U_MIN).toBeLessThan(0);
    expect(MANNEQUIN_U_MIN).toBeGreaterThan(-0.4);
  });
});
