import bpy
from pathlib import Path
from mathutils import Vector
r=Path('/Users/chenfeiyu/Documents/car-wrap-h5');bpy.ops.wm.open_mainfile(filepath=str(r/'assets/car10/car10-quality.blend'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update();pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box];lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)]);scale=3.3/max(hi-lo);center=(lo+hi)/2
for o in objects:
 matrix=o.matrix_world.copy();o.parent=None;o.matrix_world=matrix;o.location-=Vector((center.x,center.y,lo.z));o.location*=scale;o.scale*=scale;o.visible_camera=False
bpy.ops.mesh.primitive_plane_add(size=6);floor=bpy.context.object;floor.is_shadow_catcher=True
mat=bpy.data.materials.new('floor');mat.diffuse_color=(.3,.3,.3,1);floor.data.materials.append(mat)
w=bpy.data.worlds.new('soft');w.use_nodes=True;bpy.context.scene.world=w
for n in w.node_tree.nodes:
 if n.type=='BACKGROUND':n.inputs[0].default_value=(.7,.7,.7,1);n.inputs[1].default_value=.5
bpy.ops.object.light_add(type='AREA',location=(-3,-2,6));light=bpy.context.object;light.data.energy=1000;light.data.shape='DISK';light.data.size=5;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,0,8));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6
s=bpy.context.scene;s.camera=cam;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.film_transparent=True;s.render.resolution_x=1024;s.render.resolution_y=1024;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.filepath=str(r/'public/models/car10-contact.png');bpy.ops.render.render(write_still=True)
