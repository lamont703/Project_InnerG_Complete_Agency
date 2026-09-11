"""
Build and render the barbershop test frame, headless.

    blender -b -P scripts/blender/shop_scene.py

WHY NOT THROUGH THE MCP. bpy.ops.render.render() blocks Blender's main thread,
so the addon cannot answer and the connection drops mid-render — the first
attempt lost the response and produced no file, then a later save queued behind
the render that was still running and hung too. The MCP is for building and
inspecting a scene interactively; rendering belongs on the CLI, in its own
process, where blocking is what you want.
"""
import bpy, math, os, sys

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "experiments", "films", "blender-test")

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, rgba, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    return m

SKIN   = mat("skin",   (0.95, 0.84, 0.74, 1), 0.55)
HAIR   = mat("hair",   (0.05, 0.04, 0.04, 1), 0.75)
CAPE   = mat("cape",   (0.09, 0.10, 0.13, 1), 0.85)
FLOOR  = mat("floor",  (0.74, 0.72, 0.68, 1), 0.9)
CHROME = mat("chrome", (0.60, 0.62, 0.65, 1), 0.2)

def add(op, name, loc, scale=(1,1,1), material=None, rot=(0,0,0), smooth=False, **kw):
    getattr(bpy.ops.mesh, op)(location=loc, **kw)
    o = bpy.context.active_object
    o.name = name; o.scale = scale; o.rotation_euler = rot
    if material: o.data.materials.append(material)
    if smooth: bpy.ops.object.shade_smooth()
    return o

add("primitive_plane_add", "Floor", (0,0,0), (6,6,1), FLOOR, size=2)

# seated client
add("primitive_uv_sphere_add", "Head", (0,0,1.62), (0.50,0.55,0.62), SKIN, radius=0.32, smooth=True)
# hair as a slightly larger cap, scaled down in Z so it reads as a fade, not a wig
add("primitive_uv_sphere_add", "Hair", (0,0.01,1.66), (0.53,0.57,0.50), HAIR, radius=0.32, smooth=True)
add("primitive_cone_add", "Cape", (0,0,1.05), (1,1,1), CAPE, radius1=0.46, radius2=0.20, depth=0.85)

# chair
add("primitive_cylinder_add", "Seat", (0,0,0.62), (1,1,1), CAPE, radius=0.44, depth=0.10)
add("primitive_cylinder_add", "Post", (0,0,0.31), (1,1,1), CHROME, radius=0.07, depth=0.62)
add("primitive_cylinder_add", "Foot", (0,0,0.03), (1,1,1), CHROME, radius=0.34, depth=0.06)

# clippers, angled into the fade, with the guard sitting proud of the blade
add("primitive_cube_add", "Clippers", (0.46,-0.08,1.58), (0.09,0.06,0.17), CAPE,
    rot=(0, math.radians(-24), 0), size=1)
add("primitive_cube_add", "Guard", (0.395,-0.08,1.755), (0.10,0.065,0.022), CHROME,
    rot=(0, math.radians(-24), 0), size=1)

bpy.ops.object.light_add(type='AREA', location=(1.6,-1.8,3.0))
k = bpy.context.active_object; k.data.energy = 500; k.data.size = 2.2; k.data.color = (1.0,0.92,0.82)
bpy.ops.object.light_add(type='AREA', location=(-2.0,1.4,2.2))
r = bpy.context.active_object; r.data.energy = 200; r.data.size = 1.6; r.data.color = (0.72,0.80,1.0)

bpy.ops.object.camera_add(location=(1.35,-1.55,1.72),
                          rotation=(math.radians(84), 0, math.radians(41)))
cam = bpy.context.active_object; cam.data.lens = 62
bpy.context.scene.camera = cam

sc = bpy.context.scene
# CYCLES ON CPU, NOT EEVEE. EEVEE Next's Metal backend cannot compile its
# shaders on this machine — "Failed to create PSO for shader:
# eevee_deferred_tile_classify, Compiler encountered an internal error" — and it
# does not fail, it RETRIES every thirty seconds indefinitely, which is what
# hung the GUI render and looked like a slow frame. Same class as the broken
# bundled numpy already recorded for this box: macOS 12 on Intel.
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 64
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 540, 960
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = OUT

bg = sc.world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.80, 0.81, 0.79, 1)

bpy.ops.render.render(write_still=True)
print("ENGINE", sc.render.engine)
print("WROTE", OUT + ".png")
