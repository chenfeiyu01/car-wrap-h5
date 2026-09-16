import bpy
from mathutils import Vector

SRC = "/Users/chenfeiyu/Downloads/BYD_SONG_2022.fbx"


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=SRC, use_image_search=True)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and "_LOD" in obj.name:
            obj.hide_render = True

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world = bpy.data.worlds.new("World") if not scene.world else scene.world
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.065, 0.08, 1)
    background.inputs["Strength"].default_value = 0.6

    bpy.ops.object.camera_add(location=(6.8, -7.8, 3.6))
    camera = bpy.context.object
    scene.camera = camera
    target = Vector((0, 0.2, 0.7))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52

    for location, energy, size in [((4, -3, 7), 1800, 5.0), ((-5, -1, 4), 1300, 4.0), ((0, 6, 6), 1500, 4.0)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.rotation_euler = (target - Vector(location)).to_track_quat("-Z", "Y").to_euler()

    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.13))
    plane = bpy.context.object
    ground = bpy.data.materials.new("ground")
    ground.use_nodes = True
    bsdf = next(node for node in ground.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (0.035, 0.04, 0.05, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    plane.data.materials.append(ground)
    return scene


scene = setup_scene()
scene.render.filepath = "/tmp/byd-song-no-lod.png"
bpy.ops.render.render(write_still=True)

for material_name, output_path in [
    ("BYD_SONG0001", "/tmp/byd-song-mark-0001.png"),
    ("BYD_SONG0002", "/tmp/byd-song-mark-0002.png"),
    ("BYD_SONG0037", "/tmp/byd-song-mark-0037.png"),
    ("BYD_SONG0040", "/tmp/byd-song-mark-0040.png"),
]:
    material = bpy.data.materials.get(material_name)
    if not material:
        continue
    bsdf = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        continue
    old_base = tuple(bsdf.inputs["Base Color"].default_value)
    old_metallic = bsdf.inputs["Metallic"].default_value
    old_roughness = bsdf.inputs["Roughness"].default_value
    bsdf.inputs["Base Color"].default_value = (1.0, 0.0, 0.0, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.45
    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)
    bsdf.inputs["Base Color"].default_value = old_base
    bsdf.inputs["Metallic"].default_value = old_metallic
    bsdf.inputs["Roughness"].default_value = old_roughness

print("done")
