import { HEAD_DEPTH_RATIO, type HeadFrame } from "@/lib/fade-geometry";
import { boneOffset } from "./bone-structure";

/**
 * A wig block — the shape a barber already trains on.
 *
 * WHY THIS FILE EXISTS AT ALL. The first version of the 3D view reused
 * skullRadius() from fade-geometry and produced a bucket: constant radius from
 * the neck to the parietal ridge, then a dome. That was not a bug in
 * skullRadius. It describes the FADE ZONE, and it is deliberately crude below
 * the ridge because the 2D overlay draws over a photograph — the real head
 * shape comes from the photo, and the model only has to be right where the line
 * sits. Standing alone as a mesh it is a cylinder with a cap.
 *
 * WHY A MANNEQUIN RATHER THAN A REALISTIC HEAD. Three reasons, in order of how
 * much they matter:
 *
 *   1. It is the native object of the craft. Barbers learn on practice heads;
 *      showing one is not a compromise, it is the right noun.
 *   2. It cannot be subtly wrong about anybody. A realistic head implies it is
 *      YOUR head, and a fade line placed on a face that is nearly-but-not-quite
 *      yours is worse than one placed on an obvious stand-in.
 *   3. It is easier and looks better. No pores, no expression, no licence to
 *      vet, no asset in the repository, and nothing to fall into the uncanny
 *      valley with.
 *
 * SKULLRADIUS IS NOT TOUCHED. The 2D overlay depends on it and works. This is a
 * render-only profile in the same u-space, so the fade line lands in exactly
 * the same place in both views — which was the point of reusing the geometry in
 * the first place.
 */

/**
 * The silhouette, as a fraction of the widest point, at each height.
 *
 * U IS THE CHIN-TO-FOREHEAD AXIS, and getting this wrong is what made the first
 * version squat. fade-geometry defines u by `dot(q - chin, up) / faceHeight`:
 * the CHIN is 0 and the FOREHEAD is 1. Everything else is quoted against that —
 * earCanal near 0.67, parietal at 1 + PARIETAL_ABOVE_FOREHEAD, vertex at
 * 1 + VERTEX_ABOVE_FOREHEAD.
 *
 * The stops below were first written in an ear-centred space instead, with the
 * ear at 0 and the vertex at 0.32 — the real numbers with the whole chin-to-ear
 * span deleted. Nothing errored, because a profile is just numbers. It exported
 * a head 8.4 units wide and 7.7 tall: wider than it was tall, and a squat head
 * looks like a rendering artefact rather than a bug in a table of constants.
 *
 * The compression also meant the block only ever worked against the stand-in
 * frame. A frame fitted to real photographs puts earCanal at 0.67, where these
 * stops used to say jaw — so the first fitted head would have been unrecognisable.
 *
 * Stops are interpolated with a smoothstep so the surface has no visible creases
 * where segments meet — a wig block is a single smooth form, and a crease reads
 * as a modelling mistake rather than anatomy.
 */
const PROFILE: readonly { u: number; r: number }[] = [
  /*
   * A NECK, NOT A STEM. This number decides whether it reads as a head.
   *
   * The first two attempts put the neck at r 0.30 — under a third of the head's
   * width. That is a chess pawn, and it is why the block looked like a thumb
   * and then like a mushroom no matter what the skull above it did. A real neck
   * is about 12cm across against a 15cm head: roughly three quarters, not one
   * third. Slimmed a little here because a block's neck is a mounting stub, but
   * nowhere near as far as it was.
   */
  { u: -0.25, r: 0.56 }, // base of the neck, where a block meets its stand
  { u: -0.05, r: 0.57 },
  { u: 0.15, r: 0.58 }, // near-constant: this stretch is a column, not a taper
  { u: 0.32, r: 0.62 },
  /*
   * THE NAPE, and it is CONCAVE.
   *
   * A skull does not taper into its neck, and it does not sit on it like a cap
   * either — the two earlier versions failed in those two opposite ways. What
   * actually happens is a hollow: the occiput overhangs, the surface curves in
   * under it, and the neck rises out of the hollow. So the slope has to
   * INCREASE through 0.32–0.75 rather than run straight, which is what makes
   * the back of the head read as a head instead of as a solid of revolution.
   */
  { u: 0.45, r: 0.71 }, // flare begins under the mastoid
  { u: 0.55, r: 0.84 },
  { u: 0.65, r: 0.94 },
  { u: 0.75, r: 0.99 }, // just above the ear
  { u: 0.88, r: 1.0 }, // widest
  { u: 1.0, r: 0.98 },
  { u: 1.12, r: 0.91 }, // parietal ridge (1 + PARIETAL_ABOVE_FOREHEAD)
  { u: 1.2, r: 0.8 }, // last stop — above this a spherical cap takes over
];

/*
 * EARS, AS GEOMETRY.
 *
 * These were previously a colour-only feature: fade-geometry's headBand()
 * reports which points land on a pinna so no hair is drawn there, and the mesh
 * painted those vertices skin-coloured. On a photograph that is right. On a
 * bare block with no ear under it, it painted a pale RECTANGLE onto the side of
 * a smooth head — which reads as a texture bug, not as an ear.
 *
 * An ear is also one of the strongest cues that a shape is a head at all, and
 * this renderer exists to show the side and back. So the block grows one.
 *
 * Placed off the measured landmarks: the ear spans roughly nose-base to eyebrow
 * (u 0.45 to 0.85 in the chin-to-forehead space) and sits a little behind the
 * widest point of the side rather than on it.
 */
const EAR_U_CENTRE = 0.66;
/*
 * TALLER THAN IT IS WIDE, roughly two to one.
 *
 * At 0.17 by 0.33 radians the mask was very nearly a circle on the surface, and
 * it rendered as exactly that: a pale disc stuck on the side of the head. An
 * ear is one of the few parts of a head whose PROPORTION alone identifies it —
 * get the ratio wrong and no amount of shading rescues it.
 */
const EAR_U_HALF = 0.23;
/** Radians back from the widest point of the side. */
const EAR_THETA_OFFSET = 0.25;
const EAR_THETA_HALF = 0.24;
/** How far it stands off the skull, as a fraction of the head's half-width. */
const EAR_PROTRUSION = 0.14;

/** A smooth 1 -> 0 window with zero slope at both ends, so it leaves no crease. */
const window1 = (d: number, half: number) => {
  const t = Math.abs(d) / half;
  return t >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t));
};

/**
 * How much of an ear is at this point on the surface, 0–1.
 *
 * Drives BOTH the bulge and the no-hair mask. Deriving the mask from the same
 * function as the geometry is the point: a skin patch that does not line up
 * with the bump underneath it is exactly the artefact this replaces.
 */
export function earMask(u: number, theta: number): number {
  return window1(earDistance(u, theta), 1);
}

/**
 * Distance from the centre of the nearest ear, in ear-radii. 1 is the edge.
 *
 * Elliptical rather than a product of two separate windows. A product gives a
 * ROUNDED RECTANGLE — full strength along both axes right out to the corners —
 * and the corners are what made the ear read as a patch rather than a shape.
 */
function earDistance(u: number, theta: number): number {
  // The sides are at +/- 90 degrees; theta 0 faces forward.
  const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
  const right = Math.abs(wrap(theta - (Math.PI / 2 + EAR_THETA_OFFSET)));
  const left = Math.abs(wrap(theta + Math.PI / 2 + EAR_THETA_OFFSET));
  const dTheta = Math.min(right, left) / EAR_THETA_HALF;
  const dU = (u - EAR_U_CENTRE) / EAR_U_HALF;
  return Math.hypot(dU, dTheta);
}

/**
 * How far the ear stands off the skull at a point — the SHAPE, not the mask.
 *
 * Kept separate from earMask because an ear is not a dome. The helix stands
 * proud all the way round and the concha is a hollow inside it, so the relief
 * peaks off-centre and dips in the middle. Modelled as one window minus a
 * narrower one, which is the cheapest thing that puts a rim on it.
 *
 * Worth the ten lines: a smooth dome the size of an ear reads as a swelling.
 * The rim is what says "ear" — and it also catches the light along its edge,
 * which is the only cue available on an untextured surface.
 */
export function earRelief(u: number, theta: number): number {
  const rho = earDistance(u, theta);
  if (rho >= 1) return 0;
  return window1(rho, 1) - 0.5 * window1(rho, 0.45);
}

/**
 * Where the listed stops stop and the dome begins.
 *
 * CLOSING A SURFACE TO A POINT WITH LINEAR STOPS DOES NOT WORK. The first
 * version ended with 0.315 -> 0.34 and 0.325 -> 0.0: a third of the head's
 * width lost across 0.01 of height, which is a hard crease at the crown, not a
 * dome. It also produced a degenerate final ring whose tangents were zero, so
 * the cross product gave a zero-length normal and that ring rendered black.
 *
 * A spherical cap closes smoothly by construction — the same sqrt(1 - t^2)
 * falloff a sphere has — so there is no step size to tune and no crease to
 * find later.
 */
const CAP_START_U = 1.20;
const CAP_START_R = 0.80;
/** The apex, which is the vertex level: 1 + VERTEX_ABOVE_FOREHEAD. */
const CAP_TOP_U = 1.32;

/**
 * The exact apex, for the triangle fan that closes the crown.
 *
 * MANNEQUIN_U_MAX stops below this so the last RING has a surface to take a
 * normal from; the fan then closes the remaining gap to a single point. Without
 * the fan the crown is an open hole — and because the material draws both
 * sides, the hole renders as a flat dark disc that looks like a deliberately
 * flat-topped head rather than like missing geometry. It shipped that way and
 * read as a thumb.
 */
export const MANNEQUIN_APEX_U = CAP_TOP_U;

/*
 * MONOTONE CUBIC INTERPOLATION between the stops (Fritsch–Carlson).
 *
 * THIS REPLACES A SMOOTHSTEP, and the reason is the whole point of this block.
 * smoothstep(t) has ZERO SLOPE AT BOTH ENDS. Chaining it between stops means
 * the radius flattens out at every single control point and then turns steep in
 * between — a staircase in slope. The surface is continuous, so it never looks
 * broken; it looks TERRACED, like a stack of discs, and the bands land exactly
 * at the stops. On screen the head came out looking like a spring.
 *
 * Curvature is what a lit surface actually shows. Matching values at the stops
 * is not enough — the SLOPE has to carry through them too.
 *
 * Monotone rather than plain Catmull-Rom because plain cubic overshoots: a
 * spline through a near-flat neck followed by a fast flare will bulge below the
 * neck's own radius, and a block with a waist is worse than a terraced one.
 * Fritsch–Carlson clamps the tangents so no segment can leave the range of its
 * endpoints, at the cost of flattening at genuine local extrema — which is
 * correct anyway, since the widest point of a head really is flat.
 */
function pchip(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  let i = n - 2;
  for (let k = 0; k < n - 1; k++) {
    if (x <= xs[k + 1]) {
      i = k;
      break;
    }
  }

  const h = (k: number) => xs[k + 1] - xs[k];
  const delta = (k: number) => (ys[k + 1] - ys[k]) / h(k);

  /** One-sided at the ends, weighted harmonic mean inside — the clamp. */
  const slope = (k: number): number => {
    if (k === 0) return delta(0);
    if (k === n - 1) return delta(n - 2);
    const d0 = delta(k - 1);
    const d1 = delta(k);
    // A sign change is a local extremum: the only place a zero slope belongs.
    if (d0 * d1 <= 0) return 0;
    const w0 = 2 * h(k) + h(k - 1);
    const w1 = h(k) + 2 * h(k - 1);
    return (w0 + w1) / (w0 / d0 + w1 / d1);
  };

  const hi = h(i);
  const t = (x - xs[i]) / hi;
  const m0 = slope(i);
  const m1 = slope(i + 1);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] +
    (t3 - 2 * t2 + t) * hi * m0 +
    (-2 * t3 + 3 * t2) * ys[i + 1] +
    (t3 - t2) * hi * m1
  );
}

const PROFILE_U = PROFILE.map((p) => p.u);
const PROFILE_R = PROFILE.map((p) => p.r);

/*
 * THE DOME, FITTED TO THE PROFILE RATHER THAN BOLTED ONTO IT.
 *
 * A sphere cap `R * sqrt(1 - t^2)` starts with ZERO SLOPE at t = 0. The profile
 * arrives at the cap falling at about -1.4, so joining them at CAP_START_U put
 * a hard ledge right round the crown: the silhouette flattened for one step and
 * then resumed. Measured, the slope went -1.39 -> -0.06 -> -0.56 across two
 * hundredths of a unit. On screen it is a ring you cannot un-see.
 *
 * The fix is to use an ELLIPSE and solve for the semi-axis that makes its slope
 * match the profile's where they meet. An ellipse still closes at the apex with
 * a horizontal tangent — a proper dome, not a cone — so the pole stays right
 * while the join stops existing.
 *
 * Solved numerically at module load from the profile's own slope, so editing a
 * stop near the crown cannot silently reintroduce the ledge.
 */
const CAP = (() => {
  const k = CAP_TOP_U - CAP_START_U;
  const eps = 1e-5;
  const slopeIn =
    (pchip(PROFILE_U, PROFILE_R, CAP_START_U) -
      pchip(PROFILE_U, PROFILE_R, CAP_START_U - eps)) /
    eps;
  const q = slopeIn / CAP_START_R;

  // x is where the join sits on the ellipse, 0 at the apex-centre, 1 at its rim.
  const xOf = (H: number) => 1 - k / H;
  const g = (H: number) => {
    const x = xOf(H);
    return -x / (H * (1 - x * x)) - q;
  };

  // g is positive just above H = k and falls without bound; bisect between.
  let lo = k * 1.0001;
  let hi = k * 200;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  const H = (lo + hi) / 2;
  const x = xOf(H);
  return { H, centre: CAP_TOP_U - H, R: CAP_START_R / Math.sqrt(1 - x * x) };
})();

/** Lowest and highest u the block covers — the mesh sweeps between these. */
export const MANNEQUIN_U_MIN = PROFILE[0].u;
/**
 * Stops a hair short of the true apex.
 *
 * At the apex the radius is zero and the ring collapses to a single point,
 * which has no surface to take a normal from. Ending just below leaves a small
 * flat disc nobody looking at a head from the outside will ever see, and every
 * ring keeps a well-defined normal.
 */
export const MANNEQUIN_U_MAX = CAP_TOP_U - 0.001;

/**
 * Radius fraction at a height, 0–1.
 *
 * Exported so the silhouette can be plotted and asserted without a renderer —
 * the bucket shipped precisely because nobody had looked at the profile as
 * numbers.
 */
export function profileFraction(u: number): number {
  if (u <= PROFILE[0].u) return PROFILE[0].r;
  if (u >= CAP_TOP_U) return 0;

  // Above the last stop the crown is a spherical cap, smooth to the apex.
  if (u >= CAP_START_U) {
    const t = (u - CAP.centre) / CAP.H;
    return CAP.R * Math.sqrt(Math.max(0, 1 - t * t));
  }

  return pchip(PROFILE_U, PROFILE_R, u);
}

/**
 * How far forward the surface reaches at a height, as a multiple of the plain
 * ellipse. The FRONT half only; the back stays elliptical.
 *
 * THIS REPLACES faceFlatten(), WHICH COULD ONLY EVER SUBTRACT. That function
 * scaled the front down — right for the forehead, which is flatter than the
 * back of the skull, and useless for the half of the head that needs the
 * opposite. A jaw projects. A chin projects further.
 *
 * The bug it fixes is visible rather than subtle. With one radius per height,
 * the region from the chin down was simply neck-width all the way round, so a
 * chin added as a bump landed as a lump ON THE NECK. There was no jaw to put it
 * on. A head is not a solid of revolution below the cheekbones: at chin height
 * the front is mandible and the back is throat, and they are nowhere near the
 * same distance from the axis.
 *
 * Values above 1 push past the ellipse, values below pull inside it. The dip
 * around 0.30 is the mouth, and it is meant to be there — the profile of a face
 * is concave between the nose and the chin.
 */
const FRONT_DEPTH: readonly { u: number; d: number }[] = [
  { u: -0.25, d: 0.7 }, // throat, well back
  { u: -0.08, d: 0.8 },
  { u: 0.04, d: 1.1 }, // underside of the jaw turning forward
  { u: 0.14, d: 1.3 }, // the chin, furthest point of the lower face
  { u: 0.3, d: 1.24 }, // mouth — the concavity between chin and nose
  { u: 0.45, d: 1.12 },
  { u: 0.6, d: 1.02 },
  { u: 0.8, d: 0.94 },
  { u: 1.0, d: 0.88 }, // forehead: genuinely flatter than the back of the skull
  { u: 1.15, d: 0.92 },
  { u: 1.32, d: 1.0 }, // crown, where front and back meet again
];
const FRONT_U = FRONT_DEPTH.map((p) => p.u);
const FRONT_D = FRONT_DEPTH.map((p) => p.d);

/**
 * Interpolated with the same monotone spline as the silhouette, and CLAMPED at
 * both ends — a value read past the last stop would extrapolate, and an
 * extrapolating cubic near the crown turns the head inside out.
 */
export function frontDepthFraction(u: number): number {
  return pchip(FRONT_U, FRONT_D, Math.min(Math.max(u, FRONT_U[0]), FRONT_U[FRONT_U.length - 1]));
}

export interface MannequinPoint {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

/**
 * One ring around the block.
 *
 * theta 0 faces forward. Normals are computed from neighbouring rings rather
 * than assumed radial, because a radial normal on a tapering surface lights the
 * jaw and the crown wrongly — the shading is most of what sells the shape.
 */
export function mannequinRing(
  frame: HeadFrame,
  u: number,
  segments: number,
): MannequinPoint[] {
  const base = (frame.headWidth / 2) * 1.08;
  const EPS = 0.004;

  /** A point on the surface at height uu and angle theta. */
  const at = (uu: number, theta: number) => {
    /*
     * Profile, ear and bone structure all fold in HERE rather than being added
     * to finished points, so the finite-difference normals below pick them up
     * for free and they light as part of the surface instead of like decals.
     *
     * boneOffset is the term that depends on ANGLE as well as height — see
     * bone-structure.ts. Without it this is a solid of revolution and no amount
     * of profile editing can put a cheekbone on it.
     */
    const f =
      profileFraction(uu) + EAR_PROTRUSION * earRelief(uu, theta) + boneOffset(uu, theta);
    const a = base * f;
    const b = a * HEAD_DEPTH_RATIO;
    const frontD = frontDepthFraction(uu);
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    // Positive z is forward, so the flattening applies to the front half only.
    /*
     * BLENDED FROM BACK TO FRONT, NOT SWITCHED AT 90 DEGREES.
     *
     * This was `c > 0 ? b * front : b`. The POSITION is continuous there —
     * the depth term is multiplied by cos(theta), which is zero at the sides —
     * but the SLOPE is not, because the multiplier jumps from `front` to 1
     * across a single step. That put a hard vertical crease down both sides of
     * the head, running from the crown to the neck.
     *
     * It was always there. It only became obvious once the front carried a jaw:
     * at 0.86 against 1.0 the seam was a faint line, at 1.3 against 1.0 it is a
     * ridge. A defect proportional to a number that used to be small is the
     * kind that arrives looking like a brand new bug.
     *
     * Smoothstep on (cos + 1) / 2 turns fastest at the sides and flattens at
     * the front and back, so the face and the skull each keep their own depth
     * and the changeover has no edge.
     */
    const blend = (c + 1) / 2;
    const towardFront = blend * blend * (3 - 2 * blend);
    const depth = b * (1 + (frontD - 1) * towardFront);
    const h = (uu - frame.axisOriginU) * frame.faceHeight;
    return {
      x: frame.axisOrigin.x + frame.up.x * h + frame.right.x * a * s + frame.fwd.x * depth * c,
      y: frame.axisOrigin.y + frame.up.y * h + frame.right.y * a * s + frame.fwd.y * depth * c,
      z: frame.axisOrigin.z + frame.up.z * h + frame.right.z * a * s + frame.fwd.z * depth * c,
      axis: {
        x: frame.axisOrigin.x + frame.up.x * h,
        y: frame.axisOrigin.y + frame.up.y * h,
        z: frame.axisOrigin.z + frame.up.z * h,
      },
    };
  };

  const out: MannequinPoint[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const p = at(u, theta);
    const pu = at(u + EPS, theta);
    const pt = at(u, theta + EPS);

    // Two tangents, cross product, normalise. Derived from the surface rather
    // than assumed radial — a radial normal lights the jaw and crown wrongly,
    // and the shading is most of what sells the shape.
    const t1 = { x: pu.x - p.x, y: pu.y - p.y, z: pu.z - p.z };
    const t2 = { x: pt.x - p.x, y: pt.y - p.y, z: pt.z - p.z };
    let nx = t2.y * t1.z - t2.z * t1.y;
    let ny = t2.z * t1.x - t2.x * t1.z;
    let nz = t2.x * t1.y - t2.y * t1.x;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) {
      // The ring has collapsed — no surface, so no cross product. Point along
      // the head axis, which is the right answer at an apex and stops the
      // vertex rendering black.
      nx = frame.up.x;
      ny = frame.up.y;
      nz = frame.up.z;
    } else {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    // Point outward, measured from the axis. A flipped normal turns a lit
    // surface black, and half a black head is not a subtle defect.
    const rx = p.x - p.axis.x;
    const ry = p.y - p.axis.y;
    const rz = p.z - p.axis.z;
    if (rx * nx + ry * ny + rz * nz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    out.push({ x: p.x, y: p.y, z: p.z, nx, ny, nz });
  }

  return out;
}
