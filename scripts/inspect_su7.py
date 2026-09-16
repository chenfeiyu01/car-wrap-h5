import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path('/Users/chenfeiyu/Documents/car-wrap-h5')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(next((root/'assets/su7/source').glob('*.fbx'))))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
print('MODEL',json.dumps([{'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'dimensions':list(o.dimensions),'materials':[m.name for m in o.data.materials]} for o in objects]))
for m in bpy.data.materials:
 print('MATERIAL',m.name,[(n.type,n.image.filepath if n.type=='TEX_IMAGE' and n.image else '') for n in m.node_tree.nodes] if m.use_nodes else [])
for o in objects:
 print('BOUNDS',o.name,[list(o.matrix_world@Vector(c)) for c in o.bound_box])
# Save untouched import for inspection.
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/su7/source-import.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1100;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.55,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bounds=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)));center=(lo+hi)/2;size=max(hi-lo)
for name,offset,power in [('Key',(2,-3,4),1200),('Fill',(-3,-1,2),800)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*size/2);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size*2;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=center+Vector((1.3,-1.7,1))*size);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.35;scene.camera=cam
scene.render.filepath=str(root/'assets/su7/before.png');bpy.ops.render.render(write_still=True)
