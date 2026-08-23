import { describe, it, expect } from "vitest";
import { meshToObj, exportReadme } from "./export-obj";
import { buildHeadMesh, referenceFrame } from "./head-mesh";
import { STYLE_PRESETS } from "./request";

const mesh = buildHeadMesh(referenceFrame(), STYLE_PRESETS.find((p) => p.id === "mid-skin")!.spec);

function parse(obj: string) {
  const lines = obj.split("\n");
  return {
    v: lines.filter((l) => l.startsWith("v ")),
    vn: lines.filter((l) => l.startsWith("vn ")),
    f: lines.filter((l) => l.startsWith("f ")),
  };
}

describe("meshToObj", () => {
  it("writes one vertex and one normal per mesh vertex", () => {
    const p = parse(meshToObj(mesh));
    expect(p.v).toHaveLength(mesh.vertexCount);
    expect(p.vn).toHaveLength(mesh.vertexCount);
    expect(p.f).toHaveLength(mesh.triangleCount);
  });

  it("uses 1-BASED face indices", () => {
    // The single most common way to produce an OBJ that opens as a shredded
    // mess. There is no index 0 in the format.
    const p = parse(meshToObj(mesh));
    const idx = p.f.flatMap((l) =>
      l.slice(2).trim().split(/\s+/).map((t) => Number(t.split("//")[0])),
    );
    expect(Math.min(...idx)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...idx)).toBeLessThanOrEqual(mesh.vertexCount);
  });

  it("writes six floats per vertex when colours are on", () => {
    const line = parse(meshToObj(mesh)).v[0];
    expect(line.slice(2).trim().split(/\s+/)).toHaveLength(6);
  });

  it("falls back to three floats when colours are off", () => {
    const line = parse(meshToObj(mesh, { includeColors: false })).v[0];
    expect(line.slice(2).trim().split(/\s+/)).toHaveLength(3);
  });

  it("scales up, because a one-unit head is tiny in Blender", () => {
    const small = parse(meshToObj(mesh, { scale: 1 })).v;
    const big = parse(meshToObj(mesh, { scale: 10 })).v;
    const yOf = (l: string) => Number(l.slice(2).trim().split(/\s+/)[1]);
    expect(Math.abs(yOf(big[0]))).toBeCloseTo(Math.abs(yOf(small[0])) * 10, 4);
  });

  it("contains no NaN — one bad number breaks the whole import", () => {
    expect(meshToObj(mesh)).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("records the fade it was exported with", () => {
    // Otherwise a folder of head.obj files is unidentifiable a week later.
    expect(meshToObj(mesh)).toMatch(/# Fade: mid \/ skin \/ top guard #4/);
  });

  it("exports every preset without producing a malformed file", () => {
    /*
     * Counted in ONE PASS, and given room on the clock.
     *
     * This used the same parse() helper as the tests above, which walks the
     * whole file three times per preset. That was fine at 9,792 triangles and
     * started timing out at 19,760 — and it failed only in the full suite,
     * where the machine is busy, so it read as flaky rather than as slow. A
     * test that fails on load and passes on its own wastes more time than the
     * seconds it saves.
     */
    STYLE_PRESETS.forEach((preset) => {
      const obj = meshToObj(buildHeadMesh(referenceFrame(), preset.spec));
      let v = 0;
      let f = 0;
      for (const line of obj.split("\n")) {
        if (line.startsWith("v ")) v++;
        else if (line.startsWith("f ")) f++;
      }
      expect(v).toBeGreaterThan(0);
      expect(f).toBeGreaterThan(0);
    });
  }, 30_000);
});

describe("exportReadme", () => {
  it("does NOT tell you to change the axis settings", () => {
    /*
     * The note used to say "set Forward to -Z and Up to Y", and this test
     * asserted it. Both were written from memory and both were wrong: -Z / Y is
     * already Blender 4.5's OBJ default, so the instruction changed nothing and
     * the reason given for it — that Blender would otherwise lay the head down
     * — was false. Verified on 4.5.12 by importing three ways and measuring the
     * world-space bounding box.
     *
     * A test can pin a false claim in place just as firmly as a true one.
     */
    const readme = exportReadme(10);
    expect(readme).toMatch(/Take the defaults/);
    expect(readme).toMatch(/UPRIGHT/);
  });

  it("warns against applying transforms, rotation included", () => {
    // The importer orients the head with an object-level rotation rather than
    // by rewriting the mesh, so Apply > Rotation bakes Z-up into the vertices
    // and the round trip comes back on its side.
    expect(exportReadme(10)).toMatch(/Apply > Rotation/);
    expect(exportReadme(10)).toMatch(/KEEP THE ORIGIN, ROTATION AND SCALE/);
  });

  it("warns that moving the origin misplaces the fade", () => {
    // The failure is silent and plausible-looking, which is the worst kind.
    expect(exportReadme(10).toLowerCase()).toMatch(/origin/);
  });

  it("states the scale it was exported at", () => {
    expect(exportReadme(7)).toMatch(/7x/);
  });
});
