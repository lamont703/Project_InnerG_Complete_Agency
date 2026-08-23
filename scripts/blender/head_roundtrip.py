"""
Take a head .obj into Blender, check it, and write a .glb the web viewer can load.

    blender --background --python scripts/blender/head_roundtrip.py -- \
        --obj path/to/head.obj --glb path/to/head.glb

WHY THIS IS A SCRIPT AND NOT A ROUTE. Blender is a 200MB+ desktop application
with a startup cost measured in seconds. It belongs in an offline authoring step
that produces a .glb which then gets stored and served — never behind a web
request. Running it headless from a script is also the only way the round trip
gets checked the same way twice.

WHAT IT VERIFIES, AND WHY EACH CHECK IS HERE. Every one of these caught
something real while the exporter was being written:

  - watertight: the crown shipped as an open hole, and because the viewer drew
    both faces it looked like a flat-topped head rather than like missing
    geometry
  - signed volume positive: every triangle in the mesh was once wound
    inside-out, which double-sided rendering hid completely
  - upright: see the axis note below
  - vertex colours survive: the fade is per-vertex colour, so losing the colour
    attribute loses the entire point of the export

THE NUMPY TRAP, WHICH IS ENVIRONMENTAL AND NOT OURS.
Blender 4.5 bundles numpy 1.26.4, whose macOS wheels are linked against the
NEWLAPACK symbols in Accelerate.framework that only exist on macOS 13.3+. On
macOS 12 it fails to load with:

    Symbol not found: (_cblas_caxpy$NEWLAPACK)

Nothing about Blender looks broken until you export: the glTF exporter imports
numpy, so OBJ import and every mesh operation work fine and only the return leg
of the round trip dies. Set BLENDER_NUMPY_SHIM to a directory holding a numpy
that does load and this script forces it ahead of the bundled one:

    /Applications/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
        -m pip install --target ~/.cache/shearquery-blender-numpy numpy==1.24.4

PYTHONPATH DOES NOT WORK for this. Blender puts its own site-packages ahead of
it, so the broken copy still wins; the shim has to be inserted at the front of
sys.path from inside the running process, with any already-imported numpy
evicted first.
"""

import argparse
import os
import sys


def _force_numpy_shim() -> None:
    shim = os.environ.get("BLENDER_NUMPY_SHIM")
    if not shim or not os.path.isdir(shim):
        return
    sys.path.insert(0, shim)
    for name in [m for m in sys.modules if m == "numpy" or m.startswith("numpy.")]:
        del sys.modules[name]


_force_numpy_shim()

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402


def world_extent(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return [max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3)]


def main() -> int:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--obj", required=True)
    ap.add_argument("--glb")
    args = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)

    """
    DEFAULTS, DELIBERATELY.

    Blender 4.5's OBJ importer already defaults to Forward -Z / Up Y, which is
    what this mesh is authored in, so it arrives upright with nothing set. The
    setting that sounds like Blender's own convention — Forward -Y / Up Z — is
    the one that lays it on its side. Measured, not remembered.
    """
    bpy.ops.wm.obj_import(filepath=args.obj)

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(meshes) != 1:
        print(f"FAIL expected one mesh, got {len(meshes)}")
        return 1
    ob = meshes[0]
    me = ob.data

    failures = []

    ex = world_extent(ob)
    upright = ex[2] == max(ex)
    print(f"  dimensions   X={ex[0]:.2f} Y={ex[1]:.2f} Z={ex[2]:.2f}")
    print(f"  upright      {'yes' if upright else 'NO — lying down'}")
    if not upright:
        failures.append("head is not upright; check the importer's axis settings")

    bm = bmesh.new()
    bm.from_mesh(me)
    open_edges = len([e for e in bm.edges if not e.is_manifold])
    loose = len([v for v in bm.verts if not v.link_edges])
    volume = bm.calc_volume(signed=True)
    bm.free()

    print(f"  geometry     {len(me.vertices)} verts, {len(me.polygons)} faces")
    print(f"  watertight   {'yes' if open_edges == 0 else f'NO — {open_edges} open edges'}")
    print(f"  loose verts  {loose}")
    print(f"  volume       {volume:.1f} ({'outward' if volume > 0 else 'INVERTED'} normals)")

    if open_edges:
        failures.append(f"{open_edges} non-manifold edges — the mesh has holes")
    if loose:
        failures.append(f"{loose} loose vertices")
    if volume <= 0:
        failures.append("negative volume — every face is wound inside-out")

    colors = [a.name for a in me.color_attributes]
    print(f"  colours      {colors or 'NONE'}")
    if not colors:
        failures.append("no colour attribute — the fade did not survive the import")

    if args.glb:
        try:
            bpy.ops.export_scene.gltf(filepath=args.glb, export_format="GLB")
        except RuntimeError as exc:
            # Almost always the numpy trap. Say so rather than printing a stack.
            print(f"  glb          FAILED: {exc}".split("\n")[0])
            print("  glb          if this mentions numpy, see BLENDER_NUMPY_SHIM in this file")
            failures.append("glTF export failed")
        else:
            print(f"  glb          {os.path.getsize(args.glb)} bytes -> {args.glb}")

    print()
    if failures:
        for f in failures:
            print(f"FAIL {f}")
        return 1
    print("OK  head is watertight, upright, outward-facing and still coloured")
    return 0


if __name__ == "__main__":
    sys.exit(main())
