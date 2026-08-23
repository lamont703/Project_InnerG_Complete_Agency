/**
 * Bone structure, as named ridges and hollows on the block.
 *
 * WHY A SEPARATE FILE, AND WHY IT IS A DIFFERENT KIND OF THING FROM PROFILE.
 * mannequin.ts describes a SOLID OF REVOLUTION: a radius per height, spun round
 * an axis, squashed into an ellipse and flattened at the front. That can express
 * a skull, a nape and a neck, and it cannot express a face — every point at a
 * given height is the same distance from the axis, so a cheekbone and the cheek
 * hollow beneath it are the same number.
 *
 * Everything here is a function of HEIGHT AND ANGLE together. That is the whole
 * difference, and it is what the reference mannequins have that the plain block
 * did not: a brow that overhangs, a zygomatic arch running back toward the ear,
 * a mandible rising from the chin to a defined corner under the ear.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not carve. A radial displacement
 * can raise a ridge and sink a hollow, but it cannot fold a surface back under
 * itself, so there is no true eye socket, no nostril and no undercut beneath the
 * jaw — those need real topology. What it can do is put the LIGHT in the right
 * places, and shading is most of what makes a form read.
 *
 * HOW TO TUNE IT. Every entry is an anatomical claim with a number attached.
 * Change the number, look at the render, change it again. Do not add a feature
 * without a name — an unnamed bump is a dent nobody can argue with later.
 */

/**
 * One ridge or hollow.
 *
 * Positions are in the same two coordinates the rest of the block uses: `u` is
 * fade-geometry's chin-to-forehead axis (chin 0, forehead 1, ear canal ~0.67)
 * and `theta` is the angle round the head with 0 straight ahead.
 */
export interface BoneFeature {
  /** Anatomical name. Required — see the note above. */
  name: string;
  /** Height of the feature's centre at theta = 0. */
  u: number;
  /** Half-height ABOVE the centre. The feature fades to nothing this far up. */
  uHalf: number;
  /**
   * Half-height BELOW the centre. Defaults to `uHalf` — a symmetric bump.
   *
   * SET IT SMALL TO MAKE AN EDGE RATHER THAN A BUMP, and that distinction is
   * the whole reason this field exists. A symmetric window is a swelling: it
   * rises and falls the same way, so a mandible built from one comes out as a
   * rounded lump stuck on the side of the jaw. It reads as puffiness.
   *
   * A real jawline is not a swelling, it is a CORNER — the cheek plane and the
   * under-jaw plane meeting at an angle. Making the falloff collapse quickly
   * below the line and bleed slowly above it puts the radius change at one
   * height, which is what an edge is.
   */
  uHalfBelow?: number;
  /**
   * How the centre height changes as you go round the head.
   *
   * A mandible is the reason this exists: it starts at the chin and RISES to a
   * corner under the ear, so it is not a band at a constant height. Applied as
   * `u + uSlope * angularDistanceFromFront`.
   */
  uSlope: number;
  /** Angle of the centre. 0 is straight ahead, PI is the back of the head. */
  theta: number;
  /** Half-width in radians. */
  thetaHalf: number;
  /** Positive stands proud of the surface, negative sinks into it. */
  amp: number;
}

/**
 * The face and skull, as read off the reference mannequins.
 *
 * Ordered front to back and roughly top to bottom, which is also the order they
 * matter in from the angles this renderer is used at.
 */
export const BONE_FEATURES: readonly BoneFeature[] = [
  {
    // The single strongest plane change on a display mannequin: a hard shelf
    // above the eyes with the forehead sloping back off it.
    name: "supraorbital ridge (brow)",
    /*
     * Lowered from 0.95. The hairline sits at u 1.0, so a brow at 0.95 left a
     * forehead one twentieth of the face tall — which is why the head read as
     * all jaw. Classical proportion puts the brow around two thirds of the way
     * from chin to hairline; this is a compromise toward that.
     */
    u: 0.88,
    uHalf: 0.11,
    uSlope: -0.06,
    theta: 0,
    thetaHalf: 0.95,
    amp: 0.05,
  },
  {
    // Not a socket — a displacement cannot fold under the brow. It is the
    // shadowed hollow that reads as one.
    name: "orbital hollow",
    u: 0.78,
    uHalf: 0.09,
    uSlope: 0,
    theta: 0.42,
    thetaHalf: 0.42,
    amp: -0.05,
  },
  {
    name: "nasal bridge",
    u: 0.6,
    uHalf: 0.26,
    uSlope: 0,
    theta: 0,
    thetaHalf: 0.2,
    amp: 0.15,
  },
  {
    // Runs from beside the nose back toward the ear canal, rising slightly. The
    // hard upper edge of the cheek plane.
    name: "zygomatic arch (cheekbone)",
    u: 0.6,
    uHalf: 0.1,
    uSlope: 0.07,
    theta: 0.62,
    thetaHalf: 0.62,
    amp: 0.055,
  },
  {
    // Directly under the arch. Without it the cheekbone has nothing to stand
    // out from and the whole mid-face reads as one soft mass.
    name: "buccal hollow (under the cheekbone)",
    u: 0.4,
    uHalf: 0.13,
    uSlope: 0.05,
    theta: 0.6,
    thetaHalf: 0.5,
    // Softened: against a wider mandible this was cutting a hard crease.
    amp: -0.04,
  },
  {
    // The side of the head above the arch is FLAT on these heads, close to
    // concave. It also happens to be where the top of a fade sits.
    name: "temporal fossa (flat temple)",
    u: 0.93,
    uHalf: 0.16,
    uSlope: 0,
    theta: 0.85,
    thetaHalf: 0.4,
    amp: -0.045,
  },
  {
    // THE defining edge. Rises from the chin to a corner below and behind the
    // ear, and it is visible from every angle including straight from behind,
    // which is the angle this renderer exists for.
    name: "mandible (jawline)",
    u: 0.14,
    // Bleeds a long way UP into the cheek and stops abruptly BELOW: that
    // asymmetry is the jawline. As a symmetric bump it was a jowl.
    uHalf: 0.34,
    /*
     * 0.08, not 0.045. An edge wants to be sharp and the mesh cannot sample
     * sharp: at 0.045 — under two ring spacings — the jawline rendered as a
     * zigzag staircase across the cheek.
     *
     * It still reads as an edge, because what makes an edge here is the
     * ASYMMETRY (0.08 below against 0.34 above), not the absolute sharpness.
     */
    uHalfBelow: 0.08,
    uSlope: 0.2,
    theta: 0.7,
    thetaHalf: 0.85,
    /*
     * Raised from 0.06, which was nowhere near enough.
     *
     * The front-depth profile fixed the jaw in ONE direction — it pushed the
     * chin forward — and left the sides at neck width, so from the front the
     * head was a wide cranium on a narrow column with a chin poking off it. A
     * real mandible is roughly three quarters of the head's width at the
     * corner; the profile alone cannot supply that, because widening it there
     * would widen the throat behind it too. This is the term that can.
     *
     * 0.15 overshot — it turned the jaw into a hard mask edge with a crease
     * running from the nose to the corner. This is the compromise.
     */
    amp: 0.1,
  },
  {
    // The corner of the jaw. Sharpens the mandible where it turns up.
    name: "gonial angle",
    u: 0.34,
    uHalf: 0.2,
    uHalfBelow: 0.08,
    uSlope: 0,
    theta: 1.32,
    thetaHalf: 0.36,
    amp: 0.08,
  },
  {
    name: "mental protuberance (chin)",
    u: 0.13,
    uHalf: 0.15,
    uHalfBelow: 0.08,
    uSlope: 0,
    theta: 0,
    thetaHalf: 0.38,
    /*
     * Small, because the front-depth profile already carries most of the chin.
     * At 0.10 the two stacked and the lower face came to a point — a beak
     * hanging off the bottom of the head. This is the sharpening on top of a
     * chin that already exists, not the chin itself.
     */
    amp: 0.045,
  },
  {
    /*
     * THE MOUTH, AND WHY IT HAS TO LIVE HERE.
     *
     * It used to be a dip in FRONT_DEPTH. That profile is a function of height
     * alone, so the dip applied across the WHOLE front of the head and wrapped
     * a horizontal groove round the face from one jaw corner to the other. It
     * read as a fold in the skin, not as a mouth.
     *
     * A mouth is about 70 degrees wide. Only a feature that knows about angle
     * can say that.
     */
    name: "oral fissure (mouth line)",
    u: 0.26,
    // Not thinner than the mesh can sample. At 0.05 against a ring spacing of
    // 0.034 the mouth rendered as a row of square steps.
    uHalf: 0.08,
    uHalfBelow: 0.08,
    uSlope: 0,
    theta: 0,
    thetaHalf: 0.36,
    amp: -0.032,
  },
  {
    // Kept small on purpose. The reference mannequins have simple closed lips
    // with one clean line; anything more becomes an expression.
    name: "upper lip",
    u: 0.33,
    uHalf: 0.08,
    uSlope: 0,
    theta: 0,
    thetaHalf: 0.31,
    amp: 0.022,
  },
  {
    name: "lower lip",
    u: 0.19,
    uHalf: 0.085,
    uSlope: 0,
    theta: 0,
    thetaHalf: 0.29,
    amp: 0.026,
  },
  {
    // The back of the skull bulges, and it bulges high. frontDepthFraction()
    // gives the front/back asymmetry in bulk; this puts the peak in the right
    // place.
    name: "occipital bulge",
    u: 0.84,
    uHalf: 0.22,
    uSlope: 0,
    theta: Math.PI,
    thetaHalf: 1.1,
    amp: 0.045,
  },
];

/** Shortest angle between two directions, treating left and right as the same. */
function mirroredAngularDistance(theta: number, centre: number): number {
  const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
  return Math.min(Math.abs(wrap(theta - centre)), Math.abs(wrap(theta + centre)));
}

/**
 * A smooth 1 -> 0 falloff with zero slope at both ends.
 *
 * Zero slope at the edge is the requirement, not a nicety. A window that
 * arrives at zero with slope still on it puts a crease round the rim of every
 * feature, and ten features would mean ten creases — which is exactly the
 * terracing this block already had to have designed out of it once.
 */
function falloff(distance: number, half: number): number {
  if (half <= 0) return 0;
  const t = Math.abs(distance) / half;
  return t >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t));
}

/** How strongly one feature is felt at a point, 0–1. */
export function featureWeight(f: BoneFeature, u: number, theta: number): number {
  const d = mirroredAngularDistance(theta, f.theta);
  const ft = falloff(d, f.thetaHalf);
  if (ft <= 0) return 0;
  // The centre height follows the feature round the head — see uSlope.
  const centre = f.u + f.uSlope * d;
  const dv = u - centre;
  const half = dv >= 0 ? f.uHalf : (f.uHalfBelow ?? f.uHalf);
  return ft * falloff(dv, half);
}

/**
 * Total radial displacement at a point, as a fraction of the head's half-width.
 *
 * Summed rather than maxed. Ridges and hollows overlap on a real skull — the
 * cheekbone runs over the top of the buccal hollow — and taking a maximum would
 * make whichever feature happened to be listed first win outright.
 */
export function boneOffset(u: number, theta: number): number {
  let total = 0;
  for (const f of BONE_FEATURES) total += f.amp * featureWeight(f, u, theta);
  return total;
}
