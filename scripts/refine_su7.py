import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
root=Path('/Users/chenfeiyu/Documents/car-wrap-h5');out=root/'assets/su7/refined'
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/su7/source-import.blend'))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
bm=bmesh.new();bm.from_mesh(obj.data);before=len(bm.verts)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
obj.name='SU7_refined';obj.data.name='SU7_surface'
for p in obj.data.polygons:p.use_smooth=True
smooth=obj.modifiers.new('轻微表面去噪 · 保留轮廓','SMOOTH');smooth.factor=.12;smooth.iterations=3
mat=obj.data.materials[0];mat.name='su7_surface';nodes=mat.node_tree.nodes;links=mat.node_tree.links
bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
for n in nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.18
 if n.type=='TEX_IMAGE' and n.image:
  if 'Color' not in n.image.name:n.image.colorspace_settings.name='Non-Color'
  # 2K reduces runtime texture memory while retaining an editable original separately.
  if n.image.size[0]>2048:n.image.scale(2048,2048)
rough=bsdf.inputs['Roughness'];old=rough.links[0].from_socket if rough.is_linked else None
if old:
 remap=nodes.new('ShaderNodeMapRange');remap.inputs['From Min'].default_value=0;remap.inputs['From Max'].default_value=1;remap.inputs['To Min'].default_value=.28;remap.inputs['To Max'].default_value=.65;links.new(old,remap.inputs[0]);links.new(remap.outputs[0],rough)
bsdf.inputs['Coat Weight'].default_value=.22;bsdf.inputs['Coat Roughness'].default_value=.2
# Save packed, editable source with non-destructive smoothing.
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'su7-refined.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/su7-refined.glb'),export_format='GLB',use_selection=True,export_apply=True,export_image_format='AUTO',export_materials='EXPORT')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=1100;scene.render.resolution_y=750;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('Studio');world.use_nodes=True;scene.world=world;wn=world.node_tree.nodes;wn.clear();bg=wn.new('ShaderNodeBackground');wo=wn.new('ShaderNodeOutputWorld');world.node_tree.links.new(bg.outputs[0],wo.inputs[0]);env=wn.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(root/'assets/environments/studio_small_03_1k.hdr'));world.node_tree.links.new(env.outputs[0],bg.inputs[0]);bg.inputs[1].default_value=.65
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object;fm=bpy.data.materials.new('Studio floor');fm.diffuse_color=(.62,.64,.67,1);floor.data.materials.append(fm)
center=Vector((0,0,.13));bpy.ops.object.camera_add(location=(1.2,-1.6,.9));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.32;scene.camera=cam
scene.render.filepath=str(out/'su7-refined.png');bpy.ops.render.render(write_still=True)
(out/'report.json').write_text(json.dumps({'source_vertices':before,'refined_vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),'smoothing':{'factor':.12,'iterations':3},'normal_strength':.18,'texture_max_size':2048,'limitations':['single textured mesh','baked reflections and generated geometry distortions remain','paint mask inferred from original blue pixels, not CAD body segmentation']},indent=2))
