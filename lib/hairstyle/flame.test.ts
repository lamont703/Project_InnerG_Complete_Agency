import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  FLAME_LEVELS,
  FLAME_FOREHEAD_U,
  decodeBakedFlame,
  paintFlameFade,
  medianVertexSpacingU,
  type FlameManifest,
} from "./flame";
import { STYLE_PRESETS } from "./request";

const dir = join(process.cwd(), "public/flame");
const manifest: FlameManifest = JSON.parse(readFileSync(join(dir, "flame-head.json"), "utf8"));
const raw = readFileSync(join(dir, "flame-head.bin"));
const head = decodeBakedFlame(
  manifest,
  raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
);
const midSkin = STYLE_PRESETS.find((p) => p.id === "mid-skin")!.spec;

describe("the baked FLAME head", () => {
  it("decodes to the mesh the model actually has", () => {
    expect(head.vertexCount).toBe(5023);
    expect(head.triangleCount).toBe(9976);
    expect(head.positions.length).toBe(5023 * 3);
    expect(head.u.length).toBe(5023);
  });

  it("REFUSES a buffer of the wrong size", () => {
    // A silent misread scrambles the head, which looks like a modelling bug
    // rather than a layout mismatch between the baker and this file.
    expect(() => decodeBakedFlame(manifest, new ArrayBuffer(16))).toThrow(/expected/);
  });

  it("indexes only vertices that exist", () => {
    expect(Math.max(...Array.from(head.indices))).toBeLessThan(head.vertexCount);
  });

  it("carries the attribution CC-BY-4.0 requires", () => {
    // Shipping this geometry without crediting Max-Planck breaches the licence.
    expect(manifest.attribution).toMatch(/Max-Planck/);
    expect(manifest.attribution).toMatch(/CC-BY-4\.0/);
  });

  it("lands the landmarks where anatomy says they should be", () => {
    // The registration check, held here as well as in the baker so a re-bake
    // with a drifted u-space cannot pass CI.
    const eyeLevel = 0.564;
    expect(head.u.length).toBeGreaterThan(0);
    expect(Math.min(...Array.from(head.u))).toBeLessThan(0); // the bust, below the chin
    expect(Math.max(...Array.from(head.u))).toBeGreaterThan(1.0); // the crown
    expect(Math.max(...Array.from(head.u))).toBeLessThan(1.2);
    expect(FLAME_LEVELS.earTop).toBeGreaterThan(eyeLevel); // sideburn above the eye
  });
});

describe("painting a fade on it", () => {
  const { colors, lengths } = paintFlameFade(head, midSkin);

  it("produces one colour per vertex, all finite", () => {
    expect(colors.length).toBe(head.vertexCount * 3);
    expect(Array.from(colors).every(Number.isFinite)).toBe(true);
    expect(Array.from(lengths).every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
  });

  it("PUTS NO HAIR ON THE FACE — the bug the mannequin hid", () => {
    /*
     * The old hairline blended from the forehead straight to the fade perimeter,
     * which is BELOW the ear, so on the way round it dragged the boundary past
     * eye level. On a bare block that is invisible. Here it painted hair across
     * the eyes and down the temples.
     *
     * Nothing in front of the ear, below the sideburn, may carry any length.
     */
    let offenders = 0;
    for (let i = 0; i < head.vertexCount; i++) {
      const inFront = Math.abs(head.theta[i]) < 1.0; // forward of the ear
      const belowSideburn = head.u[i] < FLAME_LEVELS.earTop;
      if (inFront && belowSideburn && lengths[i] > 0.001) offenders++;
    }
    expect(offenders).toBe(0);
  });

  it("does put hair on the back of the head at that same height", () => {
    // Otherwise the test above would pass on a head with no hair at all.
    let back = 0;
    for (let i = 0; i < head.vertexCount; i++) {
      if (Math.abs(head.theta[i]) > 2.0 && head.u[i] > FLAME_LEVELS.perimeter + 0.05) {
        if (lengths[i] > 0.001) back++;
      }
    }
    expect(back).toBeGreaterThan(100);
  });

  it("is bare below the fade perimeter, everywhere", () => {
    for (let i = 0; i < head.vertexCount; i++) {
      if (head.u[i] < FLAME_LEVELS.perimeter - 0.02) expect(lengths[i]).toBe(0);
    }
  });

  it("gives every fade height a different amount of hair", () => {
    const covered = (id: string) => {
      const spec = STYLE_PRESETS.find((p) => p.id === id)!.spec;
      return Array.from(paintFlameFade(head, spec).lengths).filter((v) => v > 0.001).length;
    };
    expect(covered("high-skin")).not.toBe(covered("low-skin"));
  });

  it("feathers wider than the mesh can sample", () => {
    // A feather narrower than the vertex spacing is a no-op: every vertex still
    // lands fully on one side of the line. It has happened twice.
    expect(medianVertexSpacingU(head)).toBeGreaterThan(0);
    expect(medianVertexSpacingU(head)).toBeLessThan(0.05);
  });

  it("keeps the forehead landmark above the sideburn", () => {
    expect(FLAME_FOREHEAD_U).toBeGreaterThan(FLAME_LEVELS.earTop);
    expect(FLAME_FOREHEAD_U).toBeGreaterThan(FLAME_LEVELS.parietal);
  });
});
