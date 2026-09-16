# Render the same camera and lighting for a controlled before/after comparison.
exec(compile(open('/Users/chenfeiyu/Documents/car-wrap-h5/scripts/refine_su7.py').read(), 'refine_su7.py','exec'))
obj.hide_render=True
with bpy.data.libraries.load(str(root/'assets/su7/source-import.blend'),link=False) as (src,dst):dst.objects=list(src.objects)
for original in dst.objects:
 if original:bpy.context.collection.objects.link(original)
scene.render.filepath=str(out/'su7-before-matched.png');bpy.ops.render.render(write_still=True)
