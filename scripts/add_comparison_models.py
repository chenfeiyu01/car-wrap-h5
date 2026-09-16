import bpy,json,math
from pathlib import Path
root=Path('/Users/chenfeiyu/Documents/car-wrap-h5')
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/su7/refined/su7-refined.blend'))
mat=bpy.data.materials['su7_surface'];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
tex=bs.inputs['Base Color'].links[0].from_node
tex.image=bpy.data.images.load(str(root/'assets/su7/repaired-color.png'));tex.image.colorspace_settings.name='sRGB';tex.image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/su7/refined/su7-repaired-texture.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/su7-repaired-texture.glb'),export_format='GLB',export_apply=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=str(root/'assets/car10/10-Car.obj'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];stats=[]
for o in objects:
 tris=sum(len(p.vertices)-2 for p in o.data.polygons)
 stats.append({'name':o.name,'triangles':tris,'materials':[m.name for m in o.data.materials]})
print('MODEL_STATS',json.dumps({'objects':len(objects),'triangles':sum(s['triangles'] for s in stats),'materials':[m.name for m in bpy.data.materials]}),flush=True)
# Source has material groups but no companion MTL: provide documented PBR stand-ins.
for m in bpy.data.materials:
 m.use_nodes=True;bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');name=m.name.lower()
 color=(.045,.05,.06,1);metal=0;rough=.45
 if name=='body_color':m.name='body_paint';color=(.025,.22,.4,1);metal=.3;rough=.22
 elif any(k in name for k in ['chrome','steel','rim','silver']):color=(.45,.48,.52,1);metal=.9;rough=.2
 elif 'glass' in name:color=(.025,.045,.065,1);metal=.25;rough=.1
 elif 'taillight' in name or 'caliper' in name:color=(.5,.008,.012,1);rough=.25
 elif 'blinker' in name:color=(.7,.23,.02,1)
 elif 'tyre' in name:color=(.012,.015,.019,1);rough=.82
 bs.inputs['Base Color'].default_value=color;bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
for o in objects:
 bpy.context.view_layer.objects.active=o
 tris=sum(len(p.vertices)-2 for p in o.data.polygons)
 if tris>4000:
  d=o.modifiers.new('H5 display reduction','DECIMATE');d.ratio=.15
 for p in o.data.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/car10/car10-web.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/car10.glb'),export_format='GLB',export_apply=True)
(root/'assets/car10/source-stats.json').write_text(json.dumps(stats,indent=2))
