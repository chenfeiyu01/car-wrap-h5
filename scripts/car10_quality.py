import bpy
from pathlib import Path
r=Path('/Users/chenfeiyu/Documents/car-wrap-h5')
bpy.ops.wm.open_mainfile(filepath=str(r/'assets/car10/car10-web.blend'))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 for mod in list(o.modifiers):
  if mod.type=='DECIMATE':o.modifiers.remove(mod)
 # Preserve hard mechanical edges; correct shading without destroying geometry.
 bpy.context.view_layer.objects.active=o
 for p in o.data.polygons:p.use_smooth=True
for m in bpy.data.materials:
 n=m.name.lower();bs=next(x for x in m.node_tree.nodes if x.type=='BSDF_PRINCIPLED')
 if n=='glass':
  bs.inputs['Base Color'].default_value=(.12,.14,.16,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.055;bs.inputs['Transmission Weight'].default_value=1;bs.inputs['IOR'].default_value=1.46
 elif n=='headlight_steel':bs.inputs['Base Color'].default_value=(.35,.38,.4,1);bs.inputs['Metallic'].default_value=1;bs.inputs['Roughness'].default_value=.23
 elif n in ['wipers_mateblack','headlight_black','carbon_fiber','(null)']:
  bs.inputs['Base Color'].default_value=(.012,.014,.017,1);bs.inputs['Metallic'].default_value=.05;bs.inputs['Roughness'].default_value=.42
bpy.ops.wm.save_as_mainfile(filepath=str(r/'assets/car10/car10-quality.blend'))
bpy.ops.export_scene.gltf(filepath=str(r/'public/models/car10-quality.glb'),export_format='GLB',export_apply=True)
