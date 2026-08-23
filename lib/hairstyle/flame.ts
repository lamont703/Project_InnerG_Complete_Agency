import { deriveFadePlan, guardById, type FadeSpec, type HeadLevels } from "@/lib/fade-geometry";
import { paintScalp } from "./head-mesh";

/**
 * The FLAME 2023 head, and the levels MEASURED off it.
 *
 * WHY THIS FILE EXISTS AT ALL. lib/hairstyle/mannequin.ts builds a head out of
 * numbers somebody chose. FLAME is a head learned from 33,000 scans of about
 * 3,800 people, and its topology is FIXED — every identity has the same 5,023
 * vertices in the same order. That single property is what changes the
 * architecture: anything defined once by vertex index (a scalp mask, a hairline,
 * a groom) transfers to every head, including one fitted to a customer's photos.
 *
 * LICENCE. FLAME 2023 Open is CC-BY-4.0: adaptation and commercial use are
 * permitted WITH ATTRIBUTION to Max-Planck-Gesellschaft. Anything shipped from
 * this must carry that credit. Note the earlier FLAME releases AND their Blender
 * add-on are academic-only and may not be used here — the version matters.
 */

/**
 * Head levels read off the FLAME mean head, not carried over from ours.
 *
 * THESE DIFFER FROM lib/hairstyle/head-mesh.ts's NOMINAL_LEVELS BY ABOUT 0.2,
 * consistently, and the difference is not academic: painting a fade on FLAME
 * with our numbers put the hair on the top cap of the skull only.
 *
 *   level      ours    FLAME
 *   earCanal   0.67     0.54
 *   earTop     0.74     0.65
 *   parietal   1.10     0.86
 *   vertex     1.32     1.08
 *
 * HOW THEY WERE VALIDATED, because a measurement is only as good as its
 * registration. u is defined the way fade-geometry defines it — chin 0, forehead
 * 1 — with chin and forehead picked geometrically off the midline. FLAME's
 * MediaPipe landmark embedding then puts the landmarks it DOES carry at:
 *
 *   nose base   u 0.353   (classical proportion: 0.33)
 *   eye corners u 0.564   (classical: 0.55-0.60)
 *   lower lip   u 0.211   (classical: ~0.22)
 *
 * Correct within a couple of percent, so the axis is trustworthy.
 *
 * WHAT THE EMBEDDING CANNOT DO, so nobody plans around it: it maps 105 points
 * and they are all INNER face. Landmarks 10 (forehead), 152 (menton), 234/454
 * (face-oval sides) and 127/356 (temples) — every one fade-geometry actually
 * keys off — are absent.
 *
 * DO NOT PASTE THESE INTO fade-geometry.ts. PARIETAL_ABOVE_FOREHEAD and
 * VERTEX_ABOVE_FOREHEAD also drive the 2D AR overlay, which was hand-calibrated
 * against real photographs in /ar-lab. Two calibrations disagreeing is a
 * question worth investigating, not a number worth copying.
 */
export const FLAME_LEVELS: HeadLevels = {
  perimeter: 0.416, // earCanal - PERIMETER_BELOW_EAR
  earCanal: 0.536,
  earTop: 0.645,
  temple: 0.75,
  parietal: 0.861,
  vertex: 1.078,
};

/** Top of the forehead — where the hairline sits looking straight ahead. */
export const FLAME_FOREHEAD_U = 0.95;

/**
 * A FLAME head baked to buffers the browser can use directly.
 *
 * `u` and `theta` are baked because computing them needs the chin, forehead and
 * head axis, and those come from the model file — 53 MB of pickle that has no
 * business anywhere near a web request. scripts/flame/bake_head.py does it once,
 * offline; everything after that is arithmetic on flat arrays.
 */
export interface BakedFlameHead {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** Height on the chin-to-forehead axis, per vertex. */
  u: Float32Array;
  /** Angle round the head axis, 0 straight ahead, per vertex. */
  theta: Float32Array;
  vertexCount: number;
  triangleCount: number;
}

/**
 * Roughly how far apart neighbouring vertices are in u.
 *
 * The hairline's feather has to exceed this or it does nothing — a feather
 * narrower than the sampling leaves every vertex fully on one side of the line,
 * and the edge stays exactly as hard as it was. FLAME is an irregular mesh
 * rather than a ring stack, so this is measured rather than derived: the median
 * spread of |u| across each triangle is the honest estimate of the spacing.
 */
export function medianVertexSpacingU(head: BakedFlameHead): number {
  const spreads: number[] = [];
  for (let t = 0; t < head.indices.length; t += 3) {
    const a = head.u[head.indices[t]];
    const b = head.u[head.indices[t + 1]];
    const c = head.u[head.indices[t + 2]];
    spreads.push(Math.max(a, b, c) - Math.min(a, b, c));
  }
  spreads.sort((x, y) => x - y);
  return spreads[Math.floor(spreads.length / 2)] || 0.01;
}

/**
 * Paint a fade onto a baked FLAME head.
 *
 * Every barber decision here comes from paintScalp — the same function the
 * procedural block uses. This adds nothing but the loop, which is the point:
 * the two heads must never be able to disagree about where a fade sits.
 */
export function paintFlameFade(
  head: BakedFlameHead,
  spec: FadeSpec,
  levels: HeadLevels = FLAME_LEVELS,
): { colors: Float32Array; lengths: Float32Array } {
  const plan = deriveFadePlan(spec, levels);
  const topInches = guardById(spec.topGuard)?.inches ?? 0.5;

  // Two vertices apart, so the ramp always spans real geometry.
  const feather = Math.max(0.03, medianVertexSpacingU(head) * 2);

  const colors = new Float32Array(head.vertexCount * 3);
  const lengths = new Float32Array(head.vertexCount);

  for (let i = 0; i < head.vertexCount; i++) {
    const { inches, color } = paintScalp({
      u: head.u[i],
      theta: head.theta[i],
      plan,
      topInches,
      earTopU: levels.earTop,
      foreheadU: FLAME_FOREHEAD_U,
      feather,
      // No ear mask: FLAME has real modelled ears, so nothing needs faking.
    });
    lengths[i] = inches;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return { colors, lengths };
}

/** Layout of the baked binary. Must match scripts/flame/bake_head.py exactly. */
export interface FlameManifest {
  vertexCount: number;
  triangleCount: number;
  /** Multiplier already applied to the positions. */
  scale: number;
  levels: HeadLevels;
  attribution: string;
}

/**
 * Unpack the baked binary.
 *
 * One buffer in a fixed order rather than glTF: the payload is four flat arrays
 * and a triangle list, and a glTF writer on the Python side plus a loader on
 * this side would be two dependencies carrying nothing extra.
 */
export function decodeBakedFlame(manifest: FlameManifest, buffer: ArrayBuffer): BakedFlameHead {
  const v = manifest.vertexCount;
  const t = manifest.triangleCount;
  const expected = (v * 3 + v * 3 + v + v) * 4 + t * 3 * 4;
  if (buffer.byteLength !== expected) {
    // A silent misread here produces a scrambled head, which looks like a
    // modelling bug rather than a layout mismatch.
    throw new Error(
      `baked FLAME buffer is ${buffer.byteLength} bytes, expected ${expected} for ${v} verts / ${t} tris`,
    );
  }
  let off = 0;
  const take = (n: number) => {
    const a = new Float32Array(buffer, off, n);
    off += n * 4;
    return a;
  };
  const positions = take(v * 3);
  const normals = take(v * 3);
  const u = take(v);
  const theta = take(v);
  const indices = new Uint32Array(buffer, off, t * 3);
  return { positions, normals, indices, u, theta, vertexCount: v, triangleCount: t };
}
