import bpy,math,json
from mathutils import Vector,Matrix
from pathlib import Path
root=Path('/Users/chenfeiyu/Documents/car-wrap-h5');out=root/'public/models';out.mkdir(exist_ok=True)
def bounds(objects):
 vs=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 lo=Vector([min(v[i] for v in vs) for i in range(3)]);hi=Vector([max(v[i] for v in vs) for i in range(3)])
 return lo,hi
def export(path):
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=False,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_cameras=False,export_lights=False)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath='/Users/chenfeiyu/Downloads/C_W206.glb')
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or o.name=='Plane':bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.context.scene.objects:
 # Input front is +Y in Blender; output front must be +Z in glTF.
 o.matrix_world=Matrix.Rotation(math.pi,4,'Z')@o.matrix_world
 if o.name.startswith('w206_Wheel.'):o['wheelSlot']=o.name
 if o.name.startswith('w206_WheelBrake.'):o['stockBrake']=True
for m in bpy.data.materials:
 if m.name=='w206_paint':m.name='CarPaint'
export(out/'mercedes-w206.glb')
for index,path in [(1,'/Users/chenfeiyu/Downloads/轮子 1.glb'),(2,str(root/'assets/w206/wheel-2-import.glb'))]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=path)
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];tire=next(o for o in objects if 'tire' in o.name.lower())
 lo,hi=bounds([tire]);center=(lo+hi)/2;diameter=max(hi.y-lo.y,hi.z-lo.z)
 transform=Matrix.Scale(1/diameter,4)@Matrix.Translation(-center)
 # Bake parent transforms once before normalizing.
 matrices={o:o.matrix_world.copy() for o in objects}
 for o in objects:o.parent=None;o.matrix_world=transform@matrices[o]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 if index==2:
  # ASCII FBX has default materials, no textures; assign PBR by named components.
  mats={}
  for role,color,metal,rough in [('rubber',(.018,.02,.024,1),0,.8),('graphite',(.045,.05,.06,1),.8,.28),('alloy',(.55,.58,.62,1),.95,.22),('brake',(.25,.27,.29,1),.8,.42),('caliper',(.45,.012,.018,1),.55,.3)]:
   m=bpy.data.materials.new(role);m.diffuse_color=color;m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;mats[role]=m
  for o in objects:
   name=o.name.lower();role='rubber' if 'tire' in name else 'caliper' if 'caliper' in name else 'brake' if 'dics' in name or 'back_fill' in name else 'graphite' if 'graphite' in name or 'the_rim' in name else 'alloy'
   o.data.materials.clear();o.data.materials.append(mats[role])
 export(out/f'wheel-{index}.glb')
print('ASSETS_READY')
