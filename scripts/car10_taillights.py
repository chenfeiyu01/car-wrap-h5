"""Rebind existing tail lamp components; preserve geometry and the original edit source."""
import bpy
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/car10/car10-quality.blend'))
bpy.context.view_layer.update()
roles={
 'tail_cover':((.35,.008,.015,1),0,.05),
 'tail_bezel':((.012,.015,.02,1),.25,.24),
 'tail_reflector':((.45,.48,.52,1),.9,.18),
 'tail_guide':((.35,.004,.009,1),.05,.15),
 'tail_led':((.65,.012,.02,1),.15,.17),
}
materials={}
for name,(color,metal,rough) in roles.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');b.inputs['Base Color'].default_value=color;b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;materials[name]=m
steel=next(o for o in bpy.context.scene.objects if o.name.startswith('Studio_Car252_Mesh'))
d=steel.data;adj=[[] for v in d.vertices]
for e in d.edges:
 a,b=e.vertices;adj[a].append(b);adj[b].append(a)
slots={}
for name,m in materials.items():slots[name]=len(d.materials);d.materials.append(m)
seen=set();vertex_role={};counts=Counter()
for i in range(len(adj)):
 if i in seen:continue
 q=[i];seen.add(i);part=[]
 while q:
  a=q.pop();part.append(a)
  for b in adj[a]:
   if b not in seen:seen.add(b);q.append(b)
 vs=[steel.matrix_world@d.vertices[j].co for j in part];lo=[min(v[k] for v in vs) for k in range(3)];hi=[max(v[k] for v in vs) for k in range(3)]
 # Both complete tail assemblies, excluding badges, spoiler and lower reflectors.
 if not (lo[1]>1.65 and lo[2]>.59 and hi[2]<.75 and (hi[0]<-.35 or lo[0]>.35)):continue
 n=len(part)
 if n in (720,1653,2427,2071,2179,2019):role='tail_bezel'
 elif n in (583,525,833,225,637,1097):role='tail_guide'
 elif n in (2912,903,945):role='tail_led'
 else:role='tail_reflector'
 counts[role]+=1
 for j in part:vertex_role[j]=slots[role]
for p in d.polygons:
 if p.vertices[0] in vertex_role:p.material_index=vertex_role[p.vertices[0]]
assert sum(counts.values())>=40,counts
cover=next(o for o in bpy.context.scene.objects if any(m and m.name=='taillights' for m in o.data.materials))
slot=len(cover.data.materials);cover.data.materials.append(materials['tail_cover']);cover_faces=0
for p in cover.data.polygons:
 if (cover.matrix_world@p.center).z>.5:p.material_index=slot;cover_faces+=1
assert cover_faces>1000
print('TAIL_ROLES',dict(counts),'COVER_FACES',cover_faces,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/car10/car10-taillights.blend'))
bpy.ops.export_scene.gltf(filepath='/tmp/car10-taillights-full.glb',export_format='GLB',export_apply=True)
