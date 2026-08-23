"""
Grow hair from the fade already baked into the mesh, in a live Blender session:

    python3 scripts/blender/live.py execute_code --code "$(cat scripts/blender/hair_from_fade.py)"

The head carries the guard-length field as a per-vertex Color attribute, so the
hair needs no separate density map, weight paint or UV — it reads the same data
the shading reads, which means the strands cannot disagree with the colour under
them. Density AND length both come from it, so a skin fade thins out toward the
nape by construction.
"""
import bpy
from mathutils import Vector

"""
HAIR DRIVEN BY THE FADE ITSELF.

The mesh already carries the length field as a per-vertex Color attribute —
dark is long, skin is bare. So the hair does not need a separate density map, a
weight paint or a UV: it reads the same data the shading reads, which means the
strands cannot disagree with the colour underneath them.

Scale note: the head is 10 units per faceHeight, and a real chin-to-forehead is
about 12cm, so one unit is roughly 1.2mm * 10. A #4 guard (1/2") is about 1.05
units and a #1 about 0.26 — comfortably visible at this size.
"""

head = bpy.data.objects["ShearQueryHead"]

"""
THE THRESHOLDS ARE MEASURED FROM THE MESH, NOT COPIED FROM THE TYPESCRIPT.

Blender converts OBJ vertex colours from sRGB to linear on import. Our skin red
is 0.62 in the exporter and arrives here as 0.342; the darkest hair is 0.146 and
arrives as 0.019. Using the exporter's numbers marked the ENTIRE FACE as hair,
and the head came out fuzzy all over — which looks like a broken mask rather
than like a colour-space conversion.

Reading the real range also makes this correct for every preset: a taper and a
bald fade have different darkest values, and hardcoding either would be wrong
for the other.
"""
def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

SKIN_LIN = srgb_to_linear(0.62)          # lib/hairstyle/head-mesh.ts SKIN.r

attr = head.data.color_attributes["Color"]
# Booleans create geometry with no colour, which arrives as white. Those are the
# nostril interiors: they are skin, and left white they read as bright holes.
for d in attr.data:
    if d.color[0] > SKIN_LIN + 0.02:
        d.color = (SKIN_LIN, srgb_to_linear(0.47), srgb_to_linear(0.38), 1.0)

HAIR_LIN = min(d.color[0] for d in attr.data)
SPAN = max(1e-4, SKIN_LIN - HAIR_LIN)
print(f"MEASURED skin={SKIN_LIN:.4f} darkest={HAIR_LIN:.4f} span={SPAN:.4f}")
for o in [o for o in bpy.data.objects if o.name.startswith("Hair")]:
    bpy.data.objects.remove(o, do_unlink=True)
for g in [g for g in bpy.data.node_groups if g.name.startswith("SQ Hair")]:
    bpy.data.node_groups.remove(g)

ng = bpy.data.node_groups.new("SQ Hair", "GeometryNodeTree")
ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
n, links = ng.nodes, ng.links

def new(*candidates):
    """Node type names move between Blender versions; try each and say which."""
    last = None
    for name in candidates:
        try:
            return n.new(name)
        except Exception as e:
            last = e
    raise RuntimeError(f"none of {candidates} exist here: {last}")

gin = new("NodeGroupInput"); gin.location = (-1000, 0)
gout = new("NodeGroupOutput"); gout.location = (900, 0)

# "How much hair is here" = how far the baked colour has gone from skin to hair.
# Read as a VECTOR, not a colour: geometry nodes has no shader Separate Color,
# and the red channel alone already separates skin (0.62) from hair (0.09).
col = new("GeometryNodeInputNamedAttribute"); col.location = (-1000, -260)
col.data_type = "FLOAT_VECTOR"; col.inputs["Name"].default_value = "Color"

sep = new("ShaderNodeSeparateXYZ"); sep.location = (-820, -260)
links.new(col.outputs["Attribute"], sep.inputs[0])

# hairiness = clamp((SKIN_r - r) / (SKIN_r - HAIR_r))
sub = new("ShaderNodeMath"); sub.location = (-640, -260)
sub.operation = "SUBTRACT"; sub.inputs[0].default_value = SKIN_LIN
links.new(sep.outputs["X"], sub.inputs[1])

div = new("ShaderNodeMath"); div.location = (-470, -260)
div.operation = "DIVIDE"; div.inputs[1].default_value = SPAN
div.use_clamp = True
links.new(sub.outputs[0], div.inputs[0])

dist = new("GeometryNodeDistributePointsOnFaces"); dist.location = (-260, 60)
dist.distribute_method = "RANDOM"
links.new(gin.outputs[0], dist.inputs["Mesh"])

# "Density Factor" exists only on the Poisson method; the Random method takes a
# plain Density field, so the mask is multiplied in rather than handed over.
density = new("ShaderNodeMath"); density.location = (-440, -120)
density.operation = "MULTIPLY"; density.inputs[1].default_value = 900.0
links.new(div.outputs[0], density.inputs[0])
links.new(density.outputs[0], dist.inputs["Density"])

# Strand length in units, proportional to hairiness.
length = new("ShaderNodeMath"); length.location = (-260, -300)
length.operation = "MULTIPLY"; length.inputs[1].default_value = 1.1
links.new(div.outputs[0], length.inputs[0])

line = new("GeometryNodeCurvePrimitiveLine"); line.location = (-60, -180)
line.inputs["Start"].default_value = (0, 0, 0)
line.inputs["End"].default_value = (0, 0, 1)

inst = new("GeometryNodeInstanceOnPoints"); inst.location = (140, 60)
links.new(dist.outputs["Points"], inst.inputs["Points"])
links.new(line.outputs["Curve"], inst.inputs["Instance"])
links.new(length.outputs[0], inst.inputs["Scale"])

# Stand each strand up along the surface normal.
align = new("FunctionNodeAlignRotationToVector", "FunctionNodeAlignEulerToVector")
align.location = (-60, 300); align.axis = "Z"
links.new(dist.outputs["Normal"], align.inputs["Vector"])
links.new(align.outputs[0], inst.inputs["Rotation"])

real = new("GeometryNodeRealizeInstances"); real.location = (340, 60)
links.new(inst.outputs[0], real.inputs[0])

circ = new("GeometryNodeCurvePrimitiveCircle"); circ.location = (340, -240)
circ.inputs["Resolution"].default_value = 3
circ.inputs["Radius"].default_value = 0.013

c2m = new("GeometryNodeCurveToMesh"); c2m.location = (540, 60)
links.new(real.outputs[0], c2m.inputs["Curve"])
links.new(circ.outputs["Curve"], c2m.inputs["Profile Curve"])

join = new("GeometryNodeJoinGeometry"); join.location = (740, 0)
links.new(c2m.outputs[0], join.inputs[0])
links.new(gin.outputs[0], join.inputs[0])
links.new(join.outputs[0], gout.inputs[0])

hair = head.copy(); hair.data = head.data
hair.name = "HairFade"
bpy.context.collection.objects.link(hair)
m = hair.modifiers.new(name="SQ Hair", type="NODES")
m.node_group = ng

head.hide_set(True)          # the hair object carries a copy of the scalp
deps = bpy.context.evaluated_depsgraph_get()
ev = hair.evaluated_get(deps)
print("HAIR verts:", len(ev.data.vertices), "faces:", len(ev.data.polygons))
bpy.ops.wm.save_mainfile()
print("SAVED", bpy.data.filepath)
