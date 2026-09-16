import * as THREE from 'three';
import type {Finish} from './VehicleScene';
// The generated source has one textured surface. Recolor saturated blue texels;
// keep neutral windows, tires, lamps and badges instead of tinting the whole mesh.
export function createSu7Material(source:THREE.MeshStandardMaterial,color:string,finish:Finish){
 const material=new THREE.MeshPhysicalMaterial();
 THREE.MeshStandardMaterial.prototype.copy.call(material,source);
 material.name='su7_surface';material.color.set('#ffffff');material.clearcoat=.15;material.clearcoatRoughness=.2;
 const uniforms={wrapColor:{value:new THREE.Color(color)},wrapRoughness:{value:finish.roughness},wrapMetalness:{value:finish.metalness}};
 material.userData.wrapUniforms=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader='uniform vec3 wrapColor;\nuniform float wrapRoughness;\nuniform float wrapMetalness;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float wrapMask = 0.0;
   #ifdef USE_MAP
    vec3 sourceColor = sampledDiffuseColor.rgb;
    wrapMask = smoothstep(0.08, 0.22, sourceColor.b - sourceColor.r)
       * smoothstep(0.04, 0.14, sourceColor.b - sourceColor.g)
       * smoothstep(0.13, 0.35, sourceColor.b);
    float detail = clamp(sourceColor.b / 0.65, 0.35, 1.1);
    diffuseColor.rgb = mix(diffuseColor.rgb, wrapColor * detail, wrapMask);
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor = mix(max(roughnessFactor, 0.28), wrapRoughness, wrapMask);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, wrapMetalness, wrapMask);');
 };
 material.customProgramCacheKey=()=> 'su7-blue-mask-v1';
 return material;
}
