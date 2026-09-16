import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

type Point = [number, number, number];

function concreteTexture() {
 const size=512,data=new Uint8Array(size*size*4);
 let seed=73;
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const grain=(seed/4294967296-.5)*12;
  const cloud=Math.sin(column*.047+Math.sin(row*.024)*2)*Math.sin(row*.031)*4+Math.cos(column*.013+row*.018)*3;
  const value=Math.round(211+grain+cloud);
  data.set([value,value,value,255],(row*size+column)*4);
 }
 const texture=new THREE.DataTexture(data,size,size);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(12,12);
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

export function buildWorkshop() {
 const root=new THREE.Group();root.name='Bright_industrial_workshop';
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 const material=(name:string,color:string,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness,envMapIntensity:.3});
 const wall=material('Painted_concrete','#c5c8c9',.88);
 const panel=material('Off_white_wall_panels','#d2d5d4',.68);
 const steel=material('Graphite_structural_steel','#515b60',.43,.65);
 const trim=material('Anodized_aluminium','#889397',.4,.7);
 const dark=material('Panel_joints_and_rubber','#343b3f',.84);
 const seams=material('Concrete_expansion_joints','#7f878b',.95);
 const rearPanel=material('Graphite_service_bay_wall','#747e83',.76);
 const cabinet=material('Workshop_tool_storage','#606d72',.5,.35);
 const white=material('Worn_white_floor_marking','#d8d8d0',.88);
 const red=material('Safety_red','#a84034',.8);
 const floorMap=concreteTexture();
 const floorMaterial=new THREE.MeshStandardMaterial({name:'Concrete_floor',color:'#a1a6a9',map:floorMap,bumpMap:floorMap,bumpScale:.009,roughness:.84,metalness:0,envMapIntensity:.25});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),floorMaterial);
 floor.name='Workshop_floor';floor.rotation.x=-Math.PI/2;floor.position.y=-.019;floor.receiveShadow=true;root.add(floor);
 const bayMap=floorMap.clone();bayMap.repeat.set(1.5,2);
 const bay=new THREE.Mesh(new THREE.PlaneGeometry(4.8,6.5),new THREE.MeshStandardMaterial({name:'Service_bay_epoxy',color:'#929b9f',map:bayMap,bumpMap:bayMap,bumpScale:.004,roughness:.76,envMapIntensity:.25}));
 bay.name='Service_bay_floor';bay.rotation.x=-Math.PI/2;bay.position.y=-.017;bay.receiveShadow=true;root.add(bay);

 function add(geometry:THREE.BufferGeometry,finish:THREE.Material,position:Point,rotation:Point=[0,0,0]) {
  const transform=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
  geometry.applyMatrix4(transform);
  const batch=batches.get(finish)??[];batch.push(geometry);batches.set(finish,batch);
 }
 function box(size:Point,position:Point,finish:THREE.Material,rotation:Point=[0,0,0]) {add(new THREE.BoxGeometry(...size),finish,position,rotation);}
 function beam(start:Point,end:Point,width:number,finish=steel) {
  const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end),direction=to.clone().sub(from);
  const geometry=new THREE.CylinderGeometry(width*.5,width*.5,direction.length(),8);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
  add(geometry,finish,from.add(to).multiplyScalar(.5).toArray() as Point);
 }
 function lamp(name:string,position:Point,target:Point,width:number,height:number,radiance:number,direct:number,color='#f4f7fa') {
  const light=new THREE.RectAreaLight(color,direct,width,height);light.name=name+'_light';light.position.set(...position);light.lookAt(...target);if(direct>0)root.add(light);
  const diffuser=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({name:name+'_diffuser',color:0x000000,emissive:color,emissiveIntensity:radiance,side:THREE.DoubleSide}));
  diffuser.name=name;diffuser.position.copy(light.position);diffuser.quaternion.copy(light.quaternion);root.add(diffuser);
  return light;
 }

 box([24,5.5,.18],[0,2.73,-8.5],wall);
 box([.18,5.5,28],[-9.5,2.73,3],wall);
 box([.18,5.5,28],[9.5,2.73,3],wall);
 box([19,5.5,.18],[0,2.73,15],wall);
 box([19,.18,24],[0,5.5,3],panel);
 box([24,.22,.13],[0,.1,-8.37],dark);

 for(let index=-4;index<=4;index++){
  box([.007,.001,32],[index*3.5,-.018,0],seams);
  box([28,.001,.007],[0,-.018,index*3.5],seams);
 }
 for(let index=-4;index<=4;index++){
  box([1.96,3.5,.035],[index*2,2.8,-8.38],index>=-1?rearPanel:panel);
  box([.022,4.5,.05],[index*2-1,2.75,-8.33],trim);
 }
 box([4.8,3.65,.1],[3.8,1.825,-8.22],steel);
 box([4.45,3.35,.11],[3.8,1.7,-8.14],cabinet);
 for(let index=1;index<18;index++)box([4.4,.014,.018],[3.8,index*.18,-8.072],dark);
 box([.13,3.85,.22],[1.31,1.925,-8.1],trim);box([.13,3.85,.22],[6.29,1.925,-8.1],trim);
 box([5.1,.16,.24],[3.8,3.83,-8.1],trim);
 box([1.05,2.18,.13],[-2.2,1.09,-8.2],steel);
 box([.15,.045,.06],[-1.88,1.03,-8.105],trim);

 for(const depth of [-7.9,-4.3,-.7,2.9,6.5,10.1,13.7]){
  for(const side of [-1,1]){
   const horizontal=side*8.7;
   box([.19,5.35,.22],[horizontal,2.66,depth],steel);
   box([.42,.06,.45],[horizontal,.012,depth],steel);
   beam([horizontal,4.1,depth],[horizontal-side*1.25,5.22,depth],.095);
  }
  box([17.4,.16,.18],[0,5.2,depth],steel);
  box([17.4,.09,.12],[0,4.7,depth],steel);
  for(let index=0;index<12;index++)beam([-8.7+index*1.45,4.7,depth],[-7.975+index*1.45,5.2,depth],.045);
 }
 for(const depth of [-7.9,-4.3,6.5,10.1]){
  beam([-8.58,.25,depth],[-8.58,4.7,depth+3.6],.075,trim);
  beam([-8.58,4.7,depth],[-8.58,.25,depth+3.6],.075,trim);
 }

 lamp('North_diffuse_window',[-8.56,3.1,.1],[0,1,.1],8.4,3.6,3.3,.8);
 for(let index=0;index<=7;index++)box([.12,3.68,.045],[-8.5,3.1,-4.1+index*1.2],steel);
 for(const height of [1.3,2.5,3.7,4.9])box([.12,.045,8.45],[-8.5,height,.1],steel);
 lamp('Roof_skylight',[-1.8,5.36,-.6],[-1.8,0,-.6],7.2,8.4,2.6,.55);
 for(let index=0;index<=6;index++)box([7.3,.06,.045],[-1.8,5.30,-4.8+index*1.4],steel);
 for(let index=0;index<=6;index++)box([.045,.06,8.5],[-5.4+index*1.2,5.3,-.6],steel);
 box([.14,1,4.45],[9.25,2.75,.4],steel);
 lamp('Side_inspection_panel',[9.16,2.75,.4],[0,.6,.4],4.2,.8,3.5,.25);

 for(const horizontal of [-3.9,3.9])for(const depth of [-4.7,.1,4.9]){
  box([.32,.09,2.7],[horizontal,4.3,depth],steel);
  for(const offset of [-.075,.075])lamp(`Ceiling_strip_${horizontal}_${depth}_${offset}`,[horizontal+offset,4.245,depth],[horizontal+offset,0,depth],.045,2.55,12,0);
  for(const end of [-1.1,1.1])beam([horizontal,4.34,depth+end],[horizontal,5.35,depth+end],.015,trim);
 }
 for(const horizontal of [-.55,7.2]){
  box([.2,2.1,.1],[horizontal,3.2,-8.15],steel,[0,0,-.4]);
  const light=lamp(`Wall_inspection_strip_${horizontal}`,[horizontal,3.2,-8.04],[horizontal,3.2,0],.07,2,8,.4);
  light.rotateZ(.4);
  const diffuser=root.getObjectByName(`Wall_inspection_strip_${horizontal}`)!;diffuser.quaternion.copy(light.quaternion);
 }
 box([3.9,.23,.12],[3.4,4.4,-8.15],steel);
 for(const height of [4.35,4.45])lamp(`Rear_header_strip_${height}`,[3.4,height,-8.06],[3.4,height,0],3.7,.035,8,0);

 for(let index=0;index<3;index++){
  const horizontal=-5.8+index*1.1;
  box([1.04,.85,.62],[horizontal,.48,-7.65],cabinet);
  box([1.09,.055,.7],[horizontal,.94,-7.62],dark);
  for(let drawer=0;drawer<4;drawer++){
   box([.95,.014,.025],[horizontal,.24+drawer*.17,-7.325],dark);
   box([.63,.022,.035],[horizontal,.29+drawer*.17,-7.3],trim);
  }
  for(const side of [-.39,.39])box([.075,.15,.46],[horizontal+side,.055,-7.65],dark);
 }
 box([3.45,.11,.4],[-4.7,2.55,-8.03],steel);
 for(const horizontal of [-6,-5.3,-4.6,-3.9]){
  box([.3,.36,.18],[horizontal,2.78,-8.04],cabinet);
 }

 for(const side of [-1,1]){
  box([.045,.002,5.4],[side*1.9,-.013,0],white);
  for(const depth of [-2.7,2.7]){
   box([.8,.002,.05],[side*1.52,-.013,depth],white);
   for(let index=0;index<5;index++)box([.09,.002,.32],[side*(1.94+index*.11),-.012,depth],index%2?white:red,[0,-.55,0]);
  }
 }
 box([.22,.002,4.4],[5,-.014,0],dark);
 for(let index=0;index<70;index++)box([.2,.002,.018],[5,-.012,-2.17+index*.062],trim);

 for(const [finish,geometries] of batches){
  const merged=mergeGeometries(geometries)!;
  geometries.forEach(geometry=>geometry.dispose());
  const mesh=new THREE.Mesh(merged,finish);mesh.name=finish.name;mesh.receiveShadow=true;root.add(mesh);
 }
 const fill=new THREE.HemisphereLight('#ecf1f6','#77766e',.5);root.add(fill);
 const daylight=new THREE.DirectionalLight('#f2f5ff',1.5);daylight.name='Window_daylight';daylight.position.set(-7.8,4.6,1.4);daylight.target.position.set(0,.4,0);daylight.castShadow=true;
 Object.assign(daylight.shadow.camera,{left:-3.6,right:3.6,top:3.6,bottom:-3.6,near:1,far:18});daylight.shadow.camera.updateProjectionMatrix();
 daylight.shadow.bias=-.00015;daylight.shadow.normalBias=.012;daylight.shadow.radius=4;
 root.add(daylight,daylight.target);
 return {root,daylight};
}

export function createWorkshop(renderer:THREE.WebGLRenderer,scene:THREE.Scene) {
 RectAreaLightUniformsLib.init();
 const {root,daylight}=buildWorkshop();scene.add(root);scene.background=new THREE.Color('#bdc6cc');
 const generator=new THREE.PMREMGenerator(renderer);
 const shadowEnabled=renderer.shadowMap.enabled;
 let environment:THREE.WebGLRenderTarget;
 try{
  renderer.shadowMap.enabled=false;
  environment=generator.fromScene(scene,.008,.08,55,{size:512,position:new THREE.Vector3(0,.7,0)});
 }finally{renderer.shadowMap.enabled=shadowEnabled;generator.dispose();}
 return {root,environment,setQuality(high:boolean){
  const size=high?2048:1024;
  if(daylight.shadow.mapSize.x!==size){daylight.shadow.mapSize.set(size,size);daylight.shadow.map?.dispose();daylight.shadow.map=null;}
  renderer.shadowMap.needsUpdate=true;
 },dispose(){daylight.shadow.dispose();environment.dispose();}};
}
