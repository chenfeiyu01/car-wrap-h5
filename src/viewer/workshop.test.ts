import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWorkshop} from './workshop.ts';

test('workshop is real, bounded geometry with a shadow receiving service bay',()=>{
 const {root,daylight}=buildWorkshop();
 const floor=root.getObjectByName('Workshop_floor') as THREE.Mesh;
 const bay=root.getObjectByName('Service_bay_floor') as THREE.Mesh;
 assert.ok(floor.receiveShadow&&bay.receiveShadow);
 assert.ok(bay.position.y<-.006);
 assert.ok(daylight.castShadow);
 let meshes=0,triangles=0;
 root.traverse(object=>{
  if(object instanceof THREE.Mesh){
   meshes++;
   triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
   object.geometry.computeBoundingBox();
   assert.ok(Number.isFinite(object.geometry.boundingBox!.max.length()));
  }
 });
 assert.ok(meshes<40,`${meshes} meshes`);
 assert.ok(triangles<15000,`${triangles} triangles`);
 const bounds=new THREE.Box3().setFromObject(root);
 assert.ok(bounds.containsPoint(new THREE.Vector3(0,1,0)));
});

test('area lights match the visible window and inspection light geometry',()=>{
 const {root}=buildWorkshop();
 const lights:THREE.RectAreaLight[]=[];
 root.traverse(object=>{if(object instanceof THREE.RectAreaLight)lights.push(object);});
 assert.equal(lights.length,5);
 for(const light of lights){
  const diffuser=root.getObjectByName(light.name.replace(/_light$/,'')) as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;
  assert.ok(diffuser);
  assert.ok(diffuser.position.equals(light.position));
  assert.ok(diffuser.quaternion.equals(light.quaternion));
  assert.equal(diffuser.geometry.parameters.width,light.width);
  assert.equal(diffuser.geometry.parameters.height,light.height);
  assert.ok(diffuser.material.emissiveIntensity>0);
 }
});
