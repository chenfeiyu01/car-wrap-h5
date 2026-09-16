import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {GroundedSkybox} from 'three/addons/objects/GroundedSkybox.js';
import {createStudio} from './studio';
import {environmentLightDirection,photoEnvironments} from './photoEnvironments';
import type {EnvironmentId} from '../data/config';

type Rig={rotation?:number;root:THREE.Group;texture:THREE.Texture;background:THREE.Color|null;exposure:number;intensity:number;setQuality:(high:boolean)=>void;dispose:()=>void};
export type EnvironmentState={status:'loading'|'ready'|'error';message:string};
export class Environments {
 private cache=new Map<EnvironmentId,Promise<Rig>>();
 private active:Rig|null=null;
 private request=0;
 private dead=false;
 private high=true;
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene,private invalidate:()=>void){}
 private async create(id:EnvironmentId):Promise<Rig>{
  const holder=new THREE.Scene();
  if(id==='studio'||id==='gallery'){
   const studio=createStudio(this.renderer,holder,id==='gallery');
   return {root:studio.root,texture:studio.environment.texture,background:holder.background as THREE.Color,exposure:id==='gallery'?1:1.02,intensity:1,setQuality:studio.setQuality,dispose:()=>{disposeGroup(studio.root);studio.dispose();}};
  }
  const preset=photoEnvironments[id];
  const texture=await new HDRLoader().loadAsync(`/environments/${preset.asset}_2k.hdr`);
  if(this.dead){texture.dispose();throw new Error('Disposed');}
  texture.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(this.renderer);
  const environment=pmrem.fromEquirectangular(texture);pmrem.dispose();
  const root=new THREE.Group();root.name=id;
  const sky=new GroundedSkybox(texture,preset.height,preset.radius,128);sky.position.y=preset.height-.025;sky.renderOrder=-10;
  sky.rotation.y=preset.rotation;root.add(sky);
  const sun=new THREE.DirectionalLight(0xfffbf5,preset.sunIntensity);
  sun.position.copy(environmentLightDirection(preset.sunUV,preset.rotation)).multiplyScalar(8);sun.castShadow=preset.sunIntensity>0;
  Object.assign(sun.shadow.camera,{left:-3.3,right:3.3,top:3.3,bottom:-3.3,near:.5,far:16});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.0001;sun.shadow.normalBias=.018;sun.shadow.radius=2.5;
  root.add(sun,sun.target);
  const receiver=new THREE.Mesh(new THREE.PlaneGeometry(24,24),new THREE.ShadowMaterial({opacity:preset.shadowOpacity,depthWrite:false}));receiver.rotation.x=-Math.PI/2;receiver.position.y=-.012;receiver.receiveShadow=true;receiver.renderOrder=2;root.add(receiver);
  const setQuality=(high:boolean)=>{const size=high?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}this.renderer.shadowMap.needsUpdate=true;};
  return {rotation:preset.rotation,root,texture:environment.texture,background:null,exposure:preset.exposure,intensity:preset.intensity,setQuality,dispose:()=>{sun.shadow.dispose();disposeGroup(root);texture.dispose();environment.dispose();}};
 }
 async select(id:EnvironmentId,onState:(value:EnvironmentState)=>void){
  const request=++this.request;
  onState({status:'loading',message:'正在布置环境…'});
  let pending=this.cache.get(id);
  if(!pending){pending=this.create(id);this.cache.set(id,pending);}
  try{
   const next=await pending;
   if(this.dead||request!==this.request)return;
   if(this.active)this.scene.remove(this.active.root);
   this.active=next;this.scene.add(next.root);next.setQuality(this.high);
   this.scene.background=next.background;this.scene.environment=next.texture;
   this.scene.environmentRotation.y=next.rotation??0;this.scene.environmentIntensity=next.intensity;this.renderer.toneMappingExposure=next.exposure;
   this.renderer.shadowMap.needsUpdate=true;
   this.invalidate();onState({status:'ready',message:''});
  }catch{
   this.cache.delete(id);
   if(!this.dead&&request===this.request)onState({status:'error',message:'环境加载失败，点击重试；当前场景已保留'});
  }
 }
 setQuality(high:boolean){this.high=high;this.active?.setQuality(high);}
 dispose(){this.dead=true;this.request++;if(this.active)this.scene.remove(this.active.root);for(const pending of this.cache.values())void pending.then(r=>r.dispose(),()=>{});this.cache.clear();}
}
function disposeGroup(group:THREE.Group){
 const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);}}});
 materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
