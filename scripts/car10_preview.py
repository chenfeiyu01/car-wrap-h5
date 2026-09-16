import bpy,math
from mathutils import Vector
from pathlib import Path
r=Path('/Users/chenfeiyu/Documents/car-wrap-h5')
bpy.ops.wm.open_mainfile(filepath=str(r/'assets/car10/car10-web.blend'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];parent=bpy.data.objects.new('Car10_orientation',None);bpy.context.collection.objects.link(parent)
for o in meshes:o.parent=parent
parent.rotation_euler.z=math.pi
bpy.ops.wm.save_as_mainfile(filepath=str(r/'assets/car10/car10-web.blend'))
bpy.ops.export_scene.gltf(filepath=str(r/'public/models/car10.glb'),export_format='GLB',export_apply=True)
bpy.context.view_layer.update();pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);center=(lo+hi)*.5;size=max(hi-lo)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=800;s.render.resolution_y=540;s.render.resolution_percentage=100
w=bpy.data.worlds.new('Studio');s.world=w;w.use_nodes=True;n=w.node_tree.nodes;n.clear();bg=n.new('ShaderNodeBackground');out=n.new('ShaderNodeOutputWorld');env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(r/'assets/environments/studio_small_03_1k.hdr'));w.node_tree.links.new(env.outputs[0],bg.inputs[0]);w.node_tree.links.new(bg.outputs[0],out.inputs[0]);bg.inputs[1].default_value=.8
bpy.ops.object.camera_add(location=center+Vector((1,-1.4,.8))*size);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.3;s.camera=cam;s.render.filepath=str(r/'public/models/car10.png');bpy.ops.render.render(write_still=True)
