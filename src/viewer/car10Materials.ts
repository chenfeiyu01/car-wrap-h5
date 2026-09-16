import * as THREE from 'three';

/** Roles are tied to the inspected Car 10 OBJ groups, not global name guesses. */
export function car10DetailMaterial(meshName: string, source: THREE.Material): THREE.Material {
 if (!(source instanceof THREE.MeshStandardMaterial)) return source;
 const m = new THREE.MeshPhysicalMaterial();
 THREE.MeshStandardMaterial.prototype.copy.call(m, source);
 m.envMapIntensity = 1;
 if (source.name.startsWith('tail_')) {
  // Existing OBJ lamp components are rebound in scripts/car10_taillights.py.
  m.transmission=0;
  if(source.name==='tail_cover'){
   m.color.set('#f4a5aa');m.metalness=0;m.roughness=.035;
   m.transparent=true;m.opacity=.12;m.depthWrite=false;m.side=THREE.FrontSide;
   m.clearcoat=1;m.clearcoatRoughness=.035;m.envMapIntensity=.65;
  }else if(source.name==='tail_bezel'){
   m.color.set('#18151a');m.metalness=.25;m.roughness=.25;
  }else if(source.name==='tail_reflector'){
   m.color.set('#b6a7ac');m.metalness=.9;m.roughness=.2;m.envMapIntensity=.75;
  }else if(source.name==='tail_guide'){
   m.color.set('#990817');m.metalness=.05;m.roughness=.16;m.clearcoat=1;
  }else if(source.name==='tail_led'){
   m.color.set('#df1830');m.metalness=.12;m.roughness=.19;m.clearcoat=.65;
   m.emissive.set('#600008');m.emissiveIntensity=.12;
  }
  return m;
 }

 if (source.name === 'glass') {
  const windows = meshName.includes('Car66');
  m.name = windows ? 'window_tinted_glass' : 'headlamp_thin_cover';
  m.color.set(windows ? '#10151b' : '#ffffff');
  m.metalness = 0;
  m.roughness = windows ? .065 : .025;
  m.ior = 1.5;
  // These meshes are single thin shells. Alpha glass avoids the screen-space
  // transmission mip filter smearing the closely packed projector geometry.
  m.transmission = 0;
  m.transparent = true;
  m.opacity = windows ? .72 : .07;
  m.depthWrite = false;
  m.side = THREE.FrontSide;
  m.envMapIntensity = windows ? 1.7 : 1.1;
  m.clearcoat = 1;
  m.clearcoatRoughness = windows ? .04 : .025;
  return m;
 }
 if (meshName.startsWith('Studio_Car11_')) {
  m.name='headlamp_reflector';m.color.set('#b5bac4');m.metalness=.95;m.roughness=.14;m.envMapIntensity=.85;
 } else if (meshName.startsWith('Studio_Car73_')) {
  m.name='headlamp_inner_bezel';m.color.set('#090b10');m.metalness=.12;m.roughness=.24;
 } else if (source.name==='headlight_steel') {
  // That source material was also shared by wheels, dash and grilles.
  if (meshName.startsWith('Studio_Car252_')) {m.color.set('#23282d');m.roughness=.44;m.metalness=.65;}
  else {m.color.set('#a9b0ba');m.metalness=.85;m.roughness=.26;}
 } else if (source.name==='chrome') {
  m.color.set('#aab0b8');m.metalness=1;m.roughness=.22;
 } else if (source.name==='tyre') {
  m.color.set('#17191b');m.metalness=0;m.roughness=.78;
 } else if (source.name==='mirrors') {
  m.color.set('#b7bfca');m.metalness=1;m.roughness=.06;
 } else if (source.name==='taillights') {
  m.color.set('#9d0710');m.metalness=.1;m.roughness=.2;m.clearcoat=1;
 }
 return m;
}
