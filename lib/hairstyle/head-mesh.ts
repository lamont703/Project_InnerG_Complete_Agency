import {
  deriveFadePlan,
  guardById,
  FADE_FRONT_HALF_ANGLE,
  AXIS_BEHIND_EAR_LINE,
  PARIETAL_ABOVE_FOREHEAD,
  VERTEX_ABOVE_FOREHEAD,
  type HeadFrame,
  type FadeSpec,
  type FadePlan,
} from "@/lib/fade-geometry";
import {
  mannequinRing,
  MANNEQUIN_U_MIN,
  MANNEQUIN_U_MAX,
  MANNEQUIN_APEX_U,
  earMask,
} from "./mannequin";

/**
 * The head as a mesh, with the fade painted on it.
 *
 * NO THIRD-PARTY HEAD MODEL, AND THAT IS THE POINT. The obvious way to build
 * this is to fit a parametric head — FLAME or similar — to the photos. That
 * means a licence to read, a fitting pipeline to write, and a model whose
 * landmarks then have to be reconciled with the ones lib/fade-geometry already
 * uses. All of which buys a head that has to be made to agree with the geometry
 * we already trust.
 *
 * But that geometry ALREADY DESCRIBES A HEAD. axisPoint() walks the head axis,
 * skullRadius() gives the radius at each height, and headBand() sweeps a ring
 * around it with normals, ear detection and the front/back ellipse. That is a
 * parametric head — it was just never tessellated. This file does nothing but
 * turn those rings into triangles.
 *
 * The consequence worth stating: the 3D fade line lands in exactly the same
 * place as the 2D overlay, because it is the same function. Two renderers that
 * disagree about where a fade sits would be worse than one.
 *
 * NO three.js TYPES HERE. Plain arrays out, so the maths is testable without a
 * WebGL context and the renderer can be replaced without touching the model.
 *
 * WHAT THIS IS NOT. Hair. There are no strands, no simulation and no attempt at
 * photorealism. A fade is a LENGTH FIELD on a scalp — length as a function of
 * position — which is why it can be rendered as shading rather than geometry.
 * That is also why fades are the one hairstyle category worth doing in 3D
 * before hair simulation is solved: nothing here moves.
 */

export interface HeadMesh {
  /** Flat xyz triples. */
  positions: Float32Array;
  normals: Float32Array;
  /** Flat rgb triples, 0–1. Encodes the guard length at each vertex. */
  colors: Float32Array;
  indices: Uint32Array;
  /** Per-vertex hair length in inches, for picking and read-outs. */
  lengths: Float32Array;
  vertexCount: number;
  triangleCount: number;
  plan: FadePlan;
}

/**
 * Rings from the bottom of the fade to the crown.
 *
 * Denser near the line than at the crown, because the line is where the eye
 * goes and where a banding artefact would be obvious. Uniform spacing wastes
 * triangles on the top of the head where nothing happens.
 */
const RINGS_BELOW_LINE = 34;
/*
 * Raised from 14. These rings cover the line up to the apex, and above the
 * parietal ridge the surface is turning fast — 14 spread that far left the dome
 * visibly faceted, with the bands reading as terracing on the crown.
 */
const RINGS_ABOVE_LINE = 30;
/*
 * Raised from 96, because the block now carries features that 96 could not
 * resolve. A brow ridge and a jawline are small next to a whole head, and at 96
 * segments the shading normals — which are computed analytically and so are
 * smooth — disagreed with facets that were not. The result was mottling across
 * the face and neck that looked like noise in the maths rather than like a mesh
 * that was too coarse for what was written on it.
 */
const SEGMENTS = 152;

/** Scalp shows through below this; above it the hair reads as its own colour. */
const SKIN = { r: 0.62, g: 0.47, b: 0.38 };
const HAIR = { r: 0.09, g: 0.08, b: 0.08 };

/**
 * How much scalp shows at a given hair length.
 *
 * A skin fade is not a picture of hair — most of the visual signal is the
 * gradient from bare scalp to solid colour, which is why this renders
 * convincingly without a single strand. The curve is deliberately steep at the
 * short end: the difference between bald and a #1 is far more visible than the
 * difference between a #3 and a #4, and a linear ramp makes a fade look like a
 * grey wash instead of a fade.
 */
export function coverage(inches: number): number {
  if (inches <= 0) return 0;
  const HALF = 1 / 8; // a #1 reads as roughly half-covered
  return Math.min(1, Math.sqrt(inches / (inches + HALF)));
}

function shade(inches: number): { r: number; g: number; b: number } {
  const c = coverage(inches);
  return {
    r: SKIN.r + (HAIR.r - SKIN.r) * c,
    g: SKIN.g + (HAIR.g - SKIN.g) * c,
    b: SKIN.b + (HAIR.b - SKIN.b) * c,
  };
}

/**
 * Hair length at a height on the head, from the ladder.
 *
 * Interpolated ACROSS rungs rather than stepped. A real fade is a blend — the
 * guards are the tools used to get there, not visible bands — and rendering
 * them as hard stripes would show the barber the one thing they spend the whole
 * cut removing.
 */
export function lengthAtU(plan: FadePlan, u: number, topInches: number): number {
  if (u < plan.uPerimeter) return 0;
  if (u >= plan.uLine) return topInches;
  if (plan.ladder.length === 0) return topInches;

  const span = plan.uLine - plan.uPerimeter;
  if (span <= 0) return topInches;

  // Where this height sits across the whole ladder, 0..1.
  const t = (u - plan.uPerimeter) / span;
  const scaled = t * (plan.ladder.length - 1);
  const i = Math.min(plan.ladder.length - 1, Math.floor(scaled));
  const j = Math.min(plan.ladder.length - 1, i + 1);
  const f = scaled - i;

  const a = plan.ladder[i].guard.inches;
  const b = plan.ladder[j].guard.inches;
  return a + (b - a) * f;
}

/**
 * The height of the hairline at an angle round the head.
 *
 * WHY THIS EXISTS. Without it the fade is painted through 360 degrees, which
 * runs the gradient straight down the forehead and across the face. That is not
 * a new mistake — fade-geometry already names it for the 2D overlay: a full
 * band is "geometrically consistent, anatomically absurd, and confidently
 * labelled". The ring model has no idea where a face is, so it has to be told.
 *
 * Nobody fades a forehead. Hair on the front of the head starts at the
 * hairline, near the forehead landmark; round at the sides the fade's own
 * perimeter takes over. Blending between the two across
 * FADE_FRONT_HALF_ANGLE — the same constant the 2D view cuts at — gives the
 * temple recession for free, because the hairline falls as it goes back.
 *
 * The edge is deliberately NOT smoothed. A hairline is a sharp boundary; a
 * soft one reads as a smudge rather than as an edge.
 */
export function hairlineU(theta: number, perimeterU: number, foreheadU = 1): number {
  const wrapped = Math.atan2(Math.sin(theta), Math.cos(theta));
  const half = (FADE_FRONT_HALF_ANGLE * Math.PI) / 180;
  const d = Math.abs(wrapped);
  if (d >= half) return perimeterU;
  const w = 0.5 * (1 + Math.cos((Math.PI * d) / half));
  return perimeterU + (foreheadU - perimeterU) * w;
}

export function buildHeadMesh(frame: HeadFrame, spec: FadeSpec): HeadMesh {
  const plan = deriveFadePlan(spec, frame.levels);
  const topInches = guardById(spec.topGuard)?.inches ?? 0.5;

  /*
   * THE WHOLE BLOCK, NOT JUST THE FADE ZONE.
   *
   * The first version swept only from the fade's perimeter to the vertex, which
   * is the region the fade maths cares about — and produced a floating cap with
   * no face, jaw or neck under it. A head that stops at the ears does not read
   * as a head. So the sweep runs the full length of the mannequin and the fade
   * is painted onto part of it.
   *
   * Still denser around the line than elsewhere: that is where the eye goes and
   * where banding would show. Uniform spacing would spend triangles on the neck.
   */
  const us: number[] = [];
  for (let i = 0; i < RINGS_BELOW_LINE; i++) {
    us.push(MANNEQUIN_U_MIN + ((plan.uLine - MANNEQUIN_U_MIN) * i) / RINGS_BELOW_LINE);
  }
  for (let i = 0; i <= RINGS_ABOVE_LINE; i++) {
    /*
     * Bunched toward the crown, not evenly spaced.
     *
     * The dome turns through most of its curvature in the last tenth of its
     * height, so even spacing spends rings on the near-vertical part where
     * nothing happens and starves the part that does. `1 - (1-t)^2` puts them
     * where the surface is actually bending.
     */
    const t = i / RINGS_ABOVE_LINE;
    const eased = 1 - (1 - t) * (1 - t);
    us.push(plan.uLine + (MANNEQUIN_U_MAX - plan.uLine) * eased);
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const lengths: number[] = [];

  for (const u of us) {
    const ring = mannequinRing(frame, u, SEGMENTS);

    for (let s = 0; s < SEGMENTS; s++) {
      const mp = ring[s];
      positions.push(mp.x, mp.y, mp.z);
      normals.push(mp.nx, mp.ny, mp.nz);

      /*
       * No hair grows on an ear, so no part of a fade is drawn there.
       *
       * The mask comes from the SAME earMask() that raises the bump, not from
       * headBand(). headBand infers an ear from face landmarks for the 2D
       * overlay, where the ear in the photograph is the real one — correct
       * there, and wrong here, because it painted a pale rectangle onto a
       * smooth block with no ear beneath it. Paint and geometry have to come
       * from one source or the mismatch is the first thing you see.
       */
      const theta = (s / SEGMENTS) * Math.PI * 2;
      const earShape = earMask(u, theta);
      /*
       * SHARPER FOR PAINT THAN FOR SHAPE.
       *
       * The bump wants a broad, gentle mask or it creases. The colour does not:
       * blending skin over the same broad falloff made the ear a soft pale
       * patch that read as a bruise on the side of the head rather than as an
       * ear. Re-curving the mask for colour only gives a solid ear with a
       * defined edge, while the geometry underneath stays smooth.
       */
      const ear = (() => {
        const t = Math.min(1, Math.max(0, (earShape - 0.2) / 0.35));
        return t * t * (3 - 2 * t);
      })();
      /*
       * Face below the hairline: no hair, so no fade.
       *
       * Feathered over height rather than switched. A hard boolean is the
       * anatomically correct answer — hairlines ARE sharp — but it is evaluated
       * per vertex, so a diagonal across the temple comes out as a staircase.
       *
       * THE FEATHER HAS TO EXCEED THE RING SPACING or it does nothing. At 0.015
       * it was narrower than one ring, so every vertex still landed fully on one
       * side or the other and the steps stayed exactly as hard as before — a
       * softening parameter that was quietly a no-op.
       *
       * AND IT HAS TO WIDEN WHERE THE LINE IS STEEP. A fixed width fixed the
       * flat stretches and left the temple as jagged as before, because there
       * the hairline drops fast with angle: between one segment and the next it
       * moves further than the whole feather, so the ramp never spans two
       * vertices. Scaling it by how far the line actually moves per segment
       * makes the smoothing follow the geometry instead of assuming it.
       */
      const line = hairlineU(theta, plan.uPerimeter, frame.levels.parietal - 0.1);
      const nextLine = hairlineU(
        theta + (Math.PI * 2) / SEGMENTS,
        plan.uPerimeter,
        frame.levels.parietal - 0.1,
      );
      const FEATHER = Math.max(0.06, Math.abs(nextLine - line) * 2);
      const hair = Math.min(1, Math.max(0, (u - line) / FEATHER + 0.5));
      /*
       * BLENDED, not thresholded. A boolean `mask > 0.35` puts a hard edge in
       * the colour no matter how smooth the mask is, and at 96 segments that
       * edge is a visible staircase around the ear. Blending costs nothing and
       * has no edge to alias.
       */
      const inches = lengthAtU(plan, u, topInches) * (1 - earShape);
      lengths.push(Math.max(0, inches * hair));

      /*
       * THE HAIRLINE IS FEATHERED IN COLOUR, NOT IN LENGTH.
       *
       * Feathering the length first looked right and did nothing, because
       * coverage() is deliberately steep at the short end — the gap between
       * bald and a #1 has to read stronger than the gap between a #3 and a #4.
       * Run a length ramp through that curve and it comes out as a step: the
       * colour has already gone most of the way to hair before the length is a
       * quarter of the way up the ramp.
       *
       * So the ramp goes on the far side of the curve. Shade the hair at its
       * real length, then cross-fade to skin across the edge.
       */
      const hairColor = shade(inches);
      const mix = (a: number, bb: number, t: number) => a + (bb - a) * t;
      const c = {
        r: mix(mix(SKIN.r, hairColor.r, hair), SKIN.r, ear),
        g: mix(mix(SKIN.g, hairColor.g, hair), SKIN.g, ear),
        b: mix(mix(SKIN.b, hairColor.b, hair), SKIN.b, ear),
      };
      colors.push(c.r, c.g, c.b);
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < us.length - 1; r++) {
    for (let s = 0; s < SEGMENTS; s++) {
      const a = r * SEGMENTS + s;
      const b = r * SEGMENTS + ((s + 1) % SEGMENTS);
      const c = (r + 1) * SEGMENTS + s;
      const d = (r + 1) * SEGMENTS + ((s + 1) % SEGMENTS);
      /*
       * COUNTER-CLOCKWISE SEEN FROM OUTSIDE, which is what every renderer and
       * every modelling tool means by "front".
       *
       * This was (a, c, b, b, c, d) — inside-out, every single triangle. It was
       * invisible here because the material draws both sides, so the head lit
       * correctly and nothing looked wrong. It would have shown up in Blender
       * as a mesh whose normals all point inward: shading artefacts, booleans
       * that subtract the wrong volume, and a "recalculate outside" that
       * silently changes the file.
       *
       * Backface culling would have caught it on day one. Double-siding is a
       * kindness that costs you the diagnostic.
       */
      indices.push(a, b, c, b, d, c);
    }
  }

  /*
   * CLOSE BOTH ENDS.
   *
   * A stack of rings is a tube. Left open, the crown is a hole the width of the
   * last ring and the neck is another at the bottom — and because the material
   * draws both faces, they do not read as holes. They read as a flat-topped
   * head on a cut-off neck, which is a far more confusing defect than an
   * obviously missing surface would have been.
   *
   * It also matters for the OBJ. An open mesh is a nuisance in Blender: no
   * solidify, no boolean, no sensible normals recalculation.
   *
   * Both ends are a triangle fan to a single point on the head axis. Winding
   * follows the body loop above — (a, c, b) with c on the far side — so the
   * caps face outward like everything else.
   */
  const axisPointAt = (u: number) => {
    const h = (u - frame.axisOriginU) * frame.faceHeight;
    return {
      x: frame.axisOrigin.x + frame.up.x * h,
      y: frame.axisOrigin.y + frame.up.y * h,
      z: frame.axisOrigin.z + frame.up.z * h,
    };
  };

  const addPole = (u: number, ringStart: number, normalSign: 1 | -1) => {
    const p = axisPointAt(u);
    const idx = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    // At a pole the surface has collapsed, so there are no tangents to cross.
    // The head axis is the right answer there.
    normals.push(frame.up.x * normalSign, frame.up.y * normalSign, frame.up.z * normalSign);
    const inches = lengthAtU(plan, u, topInches);
    lengths.push(Math.max(0, inches));
    const c = shade(inches);
    colors.push(c.r, c.g, c.b);

    for (let s = 0; s < SEGMENTS; s++) {
      const a = ringStart + s;
      const b = ringStart + ((s + 1) % SEGMENTS);
      if (normalSign === 1) indices.push(a, b, idx);
      else indices.push(b, a, idx);
    }
  };

  addPole(MANNEQUIN_APEX_U, (us.length - 1) * SEGMENTS, 1);
  addPole(MANNEQUIN_U_MIN, 0, -1);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    lengths: new Float32Array(lengths),
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    plan,
  };
}

/**
 * The ratio the synthetic head already encodes: SIDE_LEFT/RIGHT at +/-80 across
 * a chin-to-forehead span of 200.
 */
const HEAD_WIDTH_OVER_FACE_HEIGHT = 0.8;

/**
 * Levels for a head nobody has measured.
 *
 * THESE ARE NOT INVENTED HERE. They are the same nominal set deriveFadePlan
 * falls back to when it has no frame, in fade-geometry's own u-space: chin at 0,
 * forehead at 1, parietal and vertex quoted off the measured constants. Two
 * different nominal heads in one codebase would be one too many.
 *
 * THE MISTAKE THIS REPLACES. The first version invented an ear-centred set
 * (-0.12, -0.02, 0.02, 0.05, 0.1, 0.32) — these numbers with the chin-to-ear
 * span removed. Ordered, non-colliding, and wrong by a factor of about 1.8 in
 * height, which is why the exported block came out wider than it was tall.
 */
const NOMINAL_LEVELS = {
  perimeter: 0.55,
  earCanal: 0.67,
  earTop: 0.74,
  temple: 0.93,
  parietal: 1 + PARIETAL_ABOVE_FOREHEAD,
  vertex: 1 + VERTEX_ABOVE_FOREHEAD,
} as const;

/**
 * A head frame with no photograph behind it.
 *
 * For looking at the renderer before a face has been measured, and for tests.
 * Proportions are the same anthropometric defaults lib/fade-synthetic-head.ts
 * uses — this is a stand-in, never a claim about anyone's head.
 */
export function referenceFrame(faceHeight = 1): HeadFrame {
  /*
   * Every field spelled out, and NO CAST.
   *
   * The first version of this used `as unknown as HeadFrame` with `forward`
   * instead of `fwd`, no `chin`, and two missing levels. The cast compiled
   * happily and would have produced a silently wrong head — which is the entire
   * failure mode that kind of cast invites. If HeadFrame gains a field, this
   * should stop compiling.
   */
  const headWidth = faceHeight * HEAD_WIDTH_OVER_FACE_HEIGHT;

  return {
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fwd: { x: 0, y: 0, z: 1 },
    /*
     * u = 0 is the chin, by fade-geometry's definition. Placing the world origin
     * at the EAR — where the head axis is — puts the chin a full earCanal below
     * it, and the two have to agree or the mesh and the levels describe
     * different heads.
     */
    chin: { x: 0, y: -NOMINAL_LEVELS.earCanal * faceHeight, z: AXIS_BEHIND_EAR_LINE * headWidth },
    axisOrigin: { x: 0, y: 0, z: 0 },
    axisOriginU: NOMINAL_LEVELS.earCanal,
    faceHeight,
    headWidth,
    levels: NOMINAL_LEVELS,
  };
}
