import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStudioFloorReflection,studioCards} from './studio.ts';

test('both studios provide a transparent high resolution planar reflection below the contact shadow',()=>{
 for(const bright of [false,true]){
  const reflection=createStudioFloorReflection(bright);
  const material=reflection.material as THREE.ShaderMaterial;
  assert.equal(reflection.getRenderTarget().width,1024);
  assert.equal(reflection.getRenderTarget().height,1024);
  assert.ok(reflection.position.y>-.019&&reflection.position.y<-.006);
  assert.equal(material.transparent,true);
  assert.equal(material.depthWrite,false);
  assert.ok(material.uniforms.strength.value>.5&&material.uniforms.strength.value<=1);
  assert.equal(reflection.geometry.index!.count/3,2);
  reflection.dispose();reflection.geometry.dispose();
 }
});

test('reflection excludes the contact decal and restores visibility if rendering fails',()=>{
 const reflection=createStudioFloorReflection(false),scene=new THREE.Scene();
 const contact=new THREE.Object3D();contact.name='Vehicle_contact_shadow';scene.add(contact,reflection);
 const camera=new THREE.PerspectiveCamera(30,1,.05,100);camera.position.set(3,2,5);camera.lookAt(0,.5,0);camera.updateMatrixWorld();reflection.updateMatrixWorld();
 for(const visibility of [true,false]){
  contact.visible=visibility;
  const renderer={getRenderTarget(){assert.equal(contact.visible,false);throw new Error('render failure');}} as unknown as THREE.WebGLRenderer;
  assert.throws(()=>reflection.onBeforeRender(renderer,scene,camera,reflection.geometry,reflection.material as THREE.Material,null!),/render failure/);
  assert.equal(contact.visible,visibility);
  assert.equal(reflection.visible,true);
 }
 reflection.dispose();reflection.geometry.dispose();
});

test('studio lighting combines broad key light, narrow strips and restrained front fill',()=>{
 assert.equal(studioCards.length,5);
 assert.ok(studioCards.some(card=>card.height>=2));
 assert.ok(studioCards.filter(card=>card.height<1).length>=2);
 for(const card of studioCards){assert.ok(card.intensity>0);assert.ok(card.position[1]>1);}
 assert.ok(studioCards[4].intensity<studioCards[0].intensity);
});
