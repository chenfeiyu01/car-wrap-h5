import {wheelBindings} from './wheelBindings';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {wheelOptions,type WheelId} from '../data/config';
export type WheelState={status:'loading'|'ready'|'error';message:string};
export function wheelFit(target:THREE.Box3,source:THREE.Box3){
 const size=target.getSize(new THREE.Vector3()),original=source.getSize(new THREE.Vector3());
 const diameter=Math.max(size.y,size.z)/Math.max(original.y,original.z);
 return {position:target.getCenter(new THREE.Vector3()),scale:new THREE.Vector3(size.x/original.x,diameter,diameter)};
}
export class WheelSwap{
 private model:THREE.Object3D|null=null;
 private replacement:THREE.Group|null=null;
 private originals=new Map<THREE.Object3D,boolean>();
 private slots:THREE.Box3[]=[];
 private parts:THREE.Mesh[]=[];
 private brakes:THREE.Object3D[]=[];
 private request=0;
 private id:WheelId='original';
 private report:(state:WheelState)=>void=()=>{};
 constructor(private draco:DRACOLoader,private disposeObject:(o:THREE.Object3D)=>void,private changed:()=>void){}
 clear(){this.request++;if(this.replacement){this.replacement.removeFromParent();this.disposeObject(this.replacement);this.replacement=null;}for(const [o,visible] of this.originals)o.visible=visible;this.originals.clear();this.slots=[];this.parts=[];this.brakes=[];this.model=null;}
 async bind(model:THREE.Object3D,vehicleId:string){this.clear();this.model=model;const binding=wheelBindings(model,vehicleId);this.slots=binding.boxes;this.parts=binding.parts;this.brakes=binding.brakes;await this.select(this.id,this.report);}
 async select(id:WheelId,report:(s:WheelState)=>void){
  this.id=id;this.report=report;const request=++this.request;
  if(!this.model){report({status:'ready',message:''});return;}
  if(this.slots.length!==4){report({status:'error',message:'车型轮子安装位不完整，已保留原轮'});return;}
  if(id==='original'){this.restore();report({status:'ready',message:''});this.changed();return;}
  report({status:'loading',message:'正在加载替换轮组…'});
  let loaded:THREE.Group|undefined;
  try{
   loaded=(await new GLTFLoader().setDRACOLoader(this.draco).loadAsync(wheelOptions.find(w=>w.id===id)!.file)).scene;
   if(request!==this.request){this.disposeObject(loaded);return;}
   this.model.updateWorldMatrix(true,true);loaded.updateWorldMatrix(true,true);
   const source=new THREE.Box3().setFromObject(loaded),center=source.getCenter(new THREE.Vector3());
   const group=new THREE.Group();group.name='replacement-wheels';
   for(const slot of this.slots){
    const fit=wheelFit(slot,source);
    const instance=new THREE.Group(),geometry=loaded.clone(true);
    geometry.position.sub(center);instance.add(geometry);instance.position.copy(fit.position);instance.scale.copy(fit.scale);
    if(fit.position.x<0)instance.rotation.y=Math.PI;
    geometry.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    group.add(instance);
   }
   this.restore();
   for(const o of [...this.parts,...(id==='wheel-2'?this.brakes:[])]){this.originals.set(o,o.visible);o.visible=false;}
   this.model.add(group);this.replacement=group;report({status:'ready',message:''});this.changed();
  }catch{if(loaded)this.disposeObject(loaded);if(request===this.request){report({status:'error',message:'轮组加载失败，保留当前轮组，请重试'});}}
 }
 private restore(){if(this.replacement){this.replacement.removeFromParent();this.disposeObject(this.replacement);this.replacement=null;}for(const [o,v] of this.originals)o.visible=v;this.originals.clear();}
}
