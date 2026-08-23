"""
Eye sockets and nostrils on an imported head, run against a LIVE Blender session:

    python3 scripts/blender/live.py execute_code --code "$(cat scripts/blender/sculpt_face.py)"

WHY THIS IS NOT IN THE TYPESCRIPT. Everything in lib/hairstyle is a radial
displacement — a distance from the head axis per height and angle. That can
raise a ridge and sink a hollow and it can never fold a surface back under
itself, so a nostril is out of reach there and reachable here.

WHAT IT DELIBERATELY DOES NOT DO. Eye sockets are NOT booleaned. The boolean
version cut two units deep, punched through the brow ridge and left a hard
bright rim: it read as goggles. The reference mannequins have soft almond
depressions with no rim, and a boolean always produces a rim — that is what a
boolean is for. Nostrils stay boolean because they are small and want an edge.
"""
import bpy, bmesh, math, os
from mathutils import Vector

work = os.path.dirname(bpy.data.filepath)
# NO open_mainfile here. Opening a file resets the Python context the addon is
# executing in, so everything after that line silently never runs.
for stray in [o for o in bpy.data.objects if o.type == "MESH"]:
    bpy.data.objects.remove(stray, do_unlink=True)
bpy.ops.wm.obj_import(filepath=os.path.join(work, "shearquery-mid-skin.obj"))
head = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
head.name = "ShearQueryHead"
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = head
head.select_set(True)

SCALE, AXIS_U = 10.0, 0.67

def axis_point(u):
    return Vector((0.0, 0.0, (u - AXIS_U) * SCALE))

def direction(theta, side):
    return Vector((side * math.sin(theta), -math.cos(theta), 0.0)).normalized()

def surface_at(u, theta, side):
    deps = bpy.context.evaluated_depsgraph_get()
    hit, loc, nor, *_ = bpy.context.scene.ray_cast(deps, axis_point(u), direction(theta, side))
    if not hit:
        raise RuntimeError(f"no surface at u={u} theta={theta}")
    return loc, nor

"""
EYE SOCKETS BY DISPLACEMENT, NOT BOOLEAN.

The boolean version cut 2 units deep, punched through the brow ridge and left a
hard bright rim — it read as goggles, not as eyes. And it was wrong about the
reference: the mannequins in the reels grids have soft almond depressions with
no rim at all. A boolean always produces a rim; that is what a boolean is for.

Displacement cannot fold a surface under the brow, which is the one thing a
boolean could have bought. It is not worth a rim.
"""
mat = head.matrix_world
inv_rot = mat.to_3x3().inverted()

targets = []
for side in (1, -1):
    loc, nor = surface_at(u=0.79, theta=0.42, side=side)
    # A frame on the skin: normal in, plus two tangents to shape the almond.
    up = Vector((0, 0, 1))
    tangent = nor.cross(up).normalized()
    vertical = tangent.cross(nor).normalized()
    targets.append((loc, nor, tangent, vertical))

DEPTH, HALF_LONG, HALF_TALL = 0.55, 1.8, 0.8

moved = 0
for v in head.data.vertices:
    world = mat @ v.co
    total = Vector((0.0, 0.0, 0.0))
    for loc, nor, tangent, vertical in targets:
        d = world - loc
        # Ellipsoidal distance in the skin frame; ignore depth so the whole
        # almond sinks evenly rather than only the part nearest the surface.
        a = d.dot(tangent) / HALF_LONG
        b = d.dot(vertical) / HALF_TALL
        rho = math.hypot(a, b)
        if rho >= 1.0:
            continue
        w = 0.5 * (1 + math.cos(math.pi * rho))   # zero slope at the rim
        total -= nor * (DEPTH * w)
    if total.length > 1e-9:
        v.co += inv_rot @ total
        moved += 1

head.data.update()
print(f"EYES displaced {moved} verts")

# Nostrils kept as booleans — small, and they read correctly.
def carve(name, u, theta, side, radii, sink):
    loc, nor = surface_at(u, theta, side)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=loc - nor * sink)
    c = bpy.context.active_object
    c.name, c.scale = name, radii
    c.rotation_mode = "QUATERNION"
    c.rotation_quaternion = nor.to_track_quat("Z", "Y")
    bpy.context.view_layer.objects.active = head
    m = head.modifiers.new(name=name, type="BOOLEAN")
    m.operation, m.object, m.solver = "DIFFERENCE", c, "EXACT"
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(c, do_unlink=True)

for side in (1, -1):
    carve(f"nostril{side}", u=0.44, theta=0.14, side=side, radii=(0.30, 0.42, 0.30), sink=0.20)

bm = bmesh.new(); bm.from_mesh(head.data)
print("NON-MANIFOLD:", len([e for e in bm.edges if not e.is_manifold]))
print("VOLUME:", round(bm.calc_volume(signed=True), 1))
bm.free()
print("VERTS/FACES:", len(head.data.vertices), len(head.data.polygons))
print("COLORS:", [a.name for a in head.data.color_attributes])

bpy.ops.object.shade_smooth()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(work, "head.blend"))
print("SAVED", bpy.data.filepath)
