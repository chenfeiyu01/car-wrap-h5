import bpy
from mathutils import Vector

src = "/Users/chenfeiyu/Downloads/BYD_SONG_2022.fbx"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, use_image_search=True)

rows = []
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mn = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    mx = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    center = (mn + mx) / 2
    materials = [m.name if m else "None" for m in obj.data.materials]
    rows.append((obj.name, len(obj.data.polygons), mn, mx, center, materials))

print("=== Y_CENTER DESC ===")
for name, polys, mn, mx, center, materials in sorted(rows, key=lambda row: row[4].y, reverse=True)[:120]:
    print(
        f"{name}\tpoly={polys}\tmin=({mn.x:.3f},{mn.y:.3f},{mn.z:.3f})"
        f"\tmax=({mx.x:.3f},{mx.y:.3f},{mx.z:.3f})"
        f"\tcenter=({center.x:.3f},{center.y:.3f},{center.z:.3f})\tmats={materials}"
    )

print("=== LARGE OBJECTS ===")
for name, polys, mn, mx, center, materials in sorted(rows, key=lambda row: row[1], reverse=True)[:140]:
    print(
        f"{name}\tpoly={polys}\tmin=({mn.x:.3f},{mn.y:.3f},{mn.z:.3f})"
        f"\tmax=({mx.x:.3f},{mx.y:.3f},{mx.z:.3f})"
        f"\tcenter=({center.x:.3f},{center.y:.3f},{center.z:.3f})\tmats={materials}"
    )

print("=== MATERIAL USERS ===")
users = {}
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    for material in obj.data.materials:
        if material:
            users.setdefault(material.name, []).append(obj.name)

for material_name, objects in sorted(users.items()):
    print(material_name, len(objects), objects[:80])
