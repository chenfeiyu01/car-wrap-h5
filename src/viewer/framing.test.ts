import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Mesh,PerspectiveCamera,Vector3} from 'three';
import {framingPoints,vehicleFrame} from './framing.ts';

test('vehicle framing keeps coupe and SUV geometry inside desktop, portrait and landscape viewports',()=>{
 for(const height of [.96,1.3])for(const viewport of [{width:1280,height:720,inset:368},{width:390,height:300,inset:0},{width:390,height:844,inset:0},{width:844,height:390,inset:0}]){
  const bounds=new Box3(new Vector3(-.8,0,-1.65),new Vector3(.8,height,1.65));
  const frame=vehicleFrame(bounds,30,(viewport.width-viewport.inset)/viewport.height),camera=new PerspectiveCamera(30,viewport.width/viewport.height,.05,100);
  camera.position.copy(frame.position);camera.lookAt(frame.target);camera.setViewOffset(viewport.width,viewport.height,viewport.inset/2,0,viewport.width,viewport.height);camera.updateMatrixWorld();
  for(const horizontalEdge of [bounds.min.x,bounds.max.x])for(const verticalEdge of [bounds.min.y,bounds.max.y])for(const depthEdge of [bounds.min.z,bounds.max.z]){
   const projected=new Vector3(horizontalEdge,verticalEdge,depthEdge).project(camera),pixel=(projected.x+1)*viewport.width/2;
   assert.ok(pixel>=0&&pixel<=viewport.width-viewport.inset,`outside unobstructed viewport: ${pixel}`);
   assert.ok(Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1);
  }
 }
});

test('sampled framing respects nested model transforms without altering the model',()=>{
 const root=new Group(),child=new Group(),mesh=new Mesh(new BoxGeometry(1,1,2));root.add(child);child.add(mesh);root.scale.setScalar(.8);child.position.set(.1,.6,-.2);child.rotation.y=.3;
 const points=framingPoints(root),bounds=new Box3().setFromObject(root),frame=vehicleFrame(bounds,30,1.2,points),camera=new PerspectiveCamera(30,1.2,.05,100);
 camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld();
 assert.equal(mesh.parent,child);assert.equal(child.parent,root);assert.equal(points.length,mesh.geometry.getAttribute('position').count);
 for(const point of points){const projected=point.clone().project(camera);assert.ok(Math.abs(projected.x)<=.900001&&Math.abs(projected.y)<=.760001);}
 mesh.geometry.dispose();mesh.material.dispose();
});

test('default orbit distance leaves room for the full vehicle at side and rear angles',()=>{
 const mesh=new Mesh(new BoxGeometry(1.48,.96,3.3));mesh.position.y=.48;
 const points=framingPoints(mesh),bounds=new Box3().setFromObject(mesh),frame=vehicleFrame(bounds,30,390/338,points),camera=new PerspectiveCamera(30,390/338,.05,100);
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){
  camera.position.copy(frame.target).add(new Vector3(Math.sin(angle),.14,Math.cos(angle)).normalize().multiplyScalar(frame.distance));camera.lookAt(frame.target);camera.updateMatrixWorld();
  for(const point of points)assert.ok(Math.abs(point.clone().project(camera).x)<.94);
 }
 mesh.geometry.dispose();mesh.material.dispose();
});
