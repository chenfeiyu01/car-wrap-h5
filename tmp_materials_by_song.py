import bpy

src = "/Users/chenfeiyu/Downloads/BYD_SONG_2022.fbx"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, use_image_search=True)

for material in sorted(bpy.data.materials, key=lambda item: item.name):
    print(f"=== {material.name} ===")
    print("diffuse", tuple(round(v, 4) for v in material.diffuse_color))
    if not material.use_nodes or not material.node_tree:
        continue
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            def value(name):
                socket = node.inputs.get(name)
                if socket is None:
                    return None
                val = socket.default_value
                try:
                    return tuple(round(float(v), 4) for v in val)
                except TypeError:
                    return round(float(val), 4)

            print("base", value("Base Color"))
            print("metallic", value("Metallic"))
            print("roughness", value("Roughness"))
            print("alpha", value("Alpha"))
            print("coat", value("Coat Weight"))
        elif node.type == "TEX_IMAGE":
            image = node.image
            print("image", image.name if image else None, image.filepath if image else None, "packed", bool(image and image.packed_file))
