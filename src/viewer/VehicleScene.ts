import {WheelSwap,type WheelState} from './wheels';
import type {WheelId} from '../data/config';
import type {DIYWrap,WrapFace} from '../data/diy';
import {Livery,type LiveryState} from './livery';
import type {LiveryId,AccentId} from '../data/config';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {Environments,type EnvironmentState} from './environments';
import type {EnvironmentId} from '../data/config';
import {car10DetailMaterial} from './car10Materials';
import {createSu7Material} from './su7Material';
import {ContactShadow} from './contactShadow';
import {framingPoints,vehicleFrame} from './framing';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export type Finish={roughness:number;metalness:number;clearcoat:number;clearcoatRoughness:number;envMapIntensity:number};
export type SceneState={status:'loading'|'ready'|'error';message:string;progress?:number};
function disposeObject(object:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 object.traverse(child=>{if(child instanceof THREE.Mesh){geometries.add(child.geometry);for(const m of Array.isArray(child.material)?child.material:[child.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);}}});
 geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>{x.dispose();if(typeof ImageBitmap!=='undefined'&&x.image instanceof ImageBitmap)x.image.close();});
}
export class VehicleScene {
 private renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(30,1,0.05,100);
 private controls:OrbitControls;
 private model:THREE.Group|null=null;
 private contactShadow=new ContactShadow();
 private modelBounds=new THREE.Box3(new THREE.Vector3(-.7,0,-1.65),new THREE.Vector3(.7,.95,1.65));
 private framePoints:THREE.Vector3[]=[];
 private paint:THREE.MeshPhysicalMaterial[]=[];
 private environments:Environments;
 private environmentReady=false;
 private environmentId:EnvironmentId='studio';
 private livery:Livery;
 private wheels:WheelSwap;
 private wheelsReady=true;
 private liveryReady=false;
 private detailView=false;
 private liverySide=1;
 private resizeObserver:ResizeObserver;
 private requestId=0;
 private frame=0;
 private dead=false;
 private contextLost=false;
 private color='#24628E';
 private finish:Finish={roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.35};
 private quality='balanced';
 private ready=false;
 private draco=new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(2);
 constructor(private host:HTMLElement,private onState:(state:SceneState)=>void){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setClearColor('#101114');this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
  this.renderer.domElement.setAttribute('aria-label','3D 车辆预览，拖动旋转，双指或滚轮缩放');
  this.renderer.domElement.style.touchAction='none';host.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=.4;this.controls.maxDistance=9;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI/2.05;
  this.controls.addEventListener('change',this.invalidate);this.reset();
  this.livery=new Livery(this.renderer,this.invalidate);
  this.wheels=new WheelSwap(this.draco,disposeObject,()=>{if(this.model)this.contactShadow.update(this.renderer,this.model);this.renderer.shadowMap.needsUpdate=true;this.invalidate();});
  this.environments=new Environments(this.renderer,this.scene,this.invalidate);
  this.scene.add(this.contactShadow.mesh);
  this.resizeObserver=new ResizeObserver(this.resize);this.resizeObserver.observe(host);this.resize();
  document.addEventListener('visibilitychange',this.visibility);
  this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
  this.renderer.domElement.addEventListener('webglcontextrestored',this.restored);

 }
 private lost=(event:Event)=>{event.preventDefault();this.contextLost=true;cancelAnimationFrame(this.frame);this.frame=0;this.onState({status:'error',message:'图形资源暂时中断，请重试恢复预览'});};
 private restored=()=>{this.contextLost=false;if(this.model)this.contactShadow.update(this.renderer,this.model);this.renderer.shadowMap.needsUpdate=true;this.onState({status:this.ready?'ready':'loading',message:''});this.invalidate();};
 private visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else this.invalidate();};
 private inset=0;
 private fit=1;
 private wrapFace:WrapFace|undefined;
 setViewportInset(value:number){this.inset=value;this.resize();}
 private effectiveAspect(){return Math.max(1,this.host.clientWidth-this.inset)/Math.max(1,this.host.clientHeight);}
 private resize=()=>{
  if(this.dead)return;
  const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;
  const oldFit=this.fit;
  this.renderer.setPixelRatio(this.quality==='balanced'?Math.min(Math.max(devicePixelRatio||1,1.25),1.75):1);
  this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.setViewOffset(width,height,this.inset/2,0,width,height);this.camera.updateProjectionMatrix();
  this.fit=vehicleFrame(this.modelBounds,this.camera.fov,this.effectiveAspect(),this.framePoints).distance;
  if(this.wrapFace){this.focusWrapFace(this.wrapFace);}
  else if(!this.detailView){
   const newFit=this.fit;
   this.camera.position.sub(this.controls.target).multiplyScalar(newFit/oldFit).add(this.controls.target);this.controls.update();
  }
  this.invalidate();
 };
 private render(){this.renderer.render(this.scene,this.camera);}
 invalidate=()=>{if(this.dead||this.contextLost||document.hidden||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.controls.update();this.render();});};
 private applyOrbitLimits(){this.controls.minPolarAngle=.2;this.controls.maxDistance=Math.max(9,this.fit*1.8);this.controls.update();}
 private frameWholeCar(){const frame=vehicleFrame(this.modelBounds,this.camera.fov,this.effectiveAspect(),this.framePoints);this.controls.target.copy(frame.target);this.camera.position.copy(frame.position);this.fit=frame.distance;this.applyOrbitLimits();}
 private stopMomentum(){this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;}
 reset(){this.wrapFace=undefined;this.stopMomentum();this.resize();this.detailView=false;this.frameWholeCar();this.invalidate();}
 focusWrapFace(face:WrapFace){
  this.stopMomentum();this.detailView=true;this.wrapFace=face;
  const center=this.modelBounds.getCenter(new THREE.Vector3()),distance=Math.max(4.4,this.fit);
  this.controls.target.copy(center);
  const directions:Record<WrapFace,[number,number,number]>={left:[1,.06,0],right:[-1,.06,0],hood:[0,1,1],roof:[0,1,.001],trunk:[0,1,-1],front:[0,.06,1],rear:[0,.06,-1]};
  this.camera.position.copy(center).add(new THREE.Vector3(...directions[face]).normalize().multiplyScalar(distance));this.controls.update();this.invalidate();
 }
 focusHeadlamp(){this.stopMomentum();this.detailView=true;this.controls.target.set(.5,.4,1.18);this.camera.position.set(.94,.67,2.08);this.controls.update();this.invalidate();}
 focusLiverySide(){this.wrapFace=undefined;this.stopMomentum();this.detailView=true;this.liverySide*=-1;const fit=Math.max(1,1.45/this.effectiveAspect());this.controls.target.set(0,.48,0);this.camera.position.set(this.liverySide*5.6*fit,.78,0);this.controls.update();this.invalidate();}
 focusTaillamp(){this.stopMomentum();this.detailView=true;this.controls.target.set(.48,.58,-1.43);this.camera.position.set(1.08,.8,-2.38);this.controls.update();this.invalidate();}
 setQuality(value:string){this.quality=value;this.environments.setQuality(value==='balanced');this.resize();}
 async setLivery(id:LiveryId,accent:AccentId,onState:(s:LiveryState)=>void,diy?:DIYWrap){this.liveryReady=false;await this.livery.select(id,accent,s=>{this.liveryReady=s.status==='ready';onState(s);},diy);}
 async setEnvironment(id:EnvironmentId,onState:(state:EnvironmentState)=>void){this.environmentReady=false;await this.environments.select(id,state=>{this.environmentReady=state.status==='ready';if(this.environmentReady){this.environmentId=id;this.applyOrbitLimits();this.contactShadow.setStrength(id==='studio'?.9:id==='gallery'?1:.72);}onState(state);});}
 setPaint(color:string,finish:Finish){this.color=color;const {roughness,metalness,clearcoat,clearcoatRoughness,envMapIntensity}=finish;this.finish={roughness,metalness,clearcoat,clearcoatRoughness,envMapIntensity};for(const material of this.paint){if(material.userData.wrapUniforms){const u=material.userData.wrapUniforms;u.wrapColor.value.set(color);u.wrapRoughness.value=this.finish.roughness;u.wrapMetalness.value=this.finish.metalness;}else{material.color.set(color);Object.assign(material,this.finish);}}this.invalidate();}
 setWheels(id:WheelId,onState:(s:WheelState)=>void){return this.wheels.select(id,s=>{this.wheelsReady=s.status==='ready';onState(s);});}
 async load(url:string,vehicleId:string){
  const id=++this.requestId;this.ready=false;this.onState({status:'loading',message:'正在下载车身资源…',progress:0});
  try{
   const gltf=await new GLTFLoader().setDRACOLoader(this.draco).loadAsync(url,event=>{if(this.dead||id!==this.requestId)return;this.onState({status:'loading',message:event.total&&event.loaded>=event.total?'正在解析模型与材质…':'正在下载车身资源…',progress:event.total?Math.min(85,event.loaded/event.total*85):undefined});});
   if(this.dead||id!==this.requestId){disposeObject(gltf.scene);return;}
   const paints:THREE.MeshPhysicalMaterial[]=[];
   const replacedMaterials=new Set<THREE.Material>();
   gltf.scene.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const replace=(source:THREE.Material)=>{
     if(source.name==='su7_surface' && source instanceof THREE.MeshStandardMaterial){
      const next=createSu7Material(source,this.color,this.finish);paints.push(next);replacedMaterials.add(source);return next;
     }
     if(source.name==='CarPaint'){
      const next=source instanceof THREE.MeshPhysicalMaterial?source.clone():new THREE.MeshPhysicalMaterial();
      if(!(source instanceof THREE.MeshPhysicalMaterial)&&source instanceof THREE.MeshStandardMaterial)THREE.MeshStandardMaterial.prototype.copy.call(next,source);
      next.name='vehicle_paint';next.color.set(this.color);Object.assign(next,this.finish);next.envMapIntensity=this.finish.envMapIntensity;next.specularIntensity=1;next.specularColor.set('#ffffff');next.ior=1.5;
      this.livery.bind(next,url.includes('xiaomi-yu7')?.86:1);paints.push(next);replacedMaterials.add(source);return next;
     }
     if(source.name==='body_paint'){
      const next=new THREE.MeshPhysicalMaterial({name:'body_paint',color:this.color,side:THREE.FrontSide,...this.finish});
      if(url.includes('car10'))this.livery.bind(next);
      paints.push(next);replacedMaterials.add(source);return next;
     }
     if(url.includes('car10')){
      const next=car10DetailMaterial(child.name,source);if(next!==source)replacedMaterials.add(source);return next;
     }
     return source;
    };
    child.material=Array.isArray(child.material)?child.material.map(replace):replace(child.material);
    const materials=Array.isArray(child.material)?child.material:[child.material];child.castShadow=materials.some(material=>!material.transparent||material.opacity>=.85);child.receiveShadow=child.castShadow;
   });
   replacedMaterials.forEach(material=>material.dispose());
   if(!paints.length){disposeObject(gltf.scene);throw new Error('车型缺少车身材质绑定');}
   const fitted=new THREE.Group();fitted.add(gltf.scene);
   const box=new THREE.Box3().setFromObject(fitted),size=box.getSize(new THREE.Vector3());const scale=3.3/Math.max(size.x,size.y,size.z);fitted.scale.setScalar(scale);box.setFromObject(fitted);const center=box.getCenter(new THREE.Vector3());fitted.position.set(-center.x,-box.min.y,-center.z);
   this.contactShadow.update(this.renderer,fitted);
   this.wheels.clear();if(this.model){this.scene.remove(this.model);disposeObject(this.model);}this.model=fitted;this.paint=paints;this.scene.add(fitted);this.modelBounds.setFromObject(fitted);this.livery.setBounds(this.modelBounds);this.framePoints=framingPoints(fitted);this.renderer.shadowMap.needsUpdate=true;this.reset();await this.wheels.bind(fitted,vehicleId);if(this.dead||id!==this.requestId)return;this.ready=true;this.onState({status:'ready',message:''});this.invalidate();
  }catch(error){console.error('Vehicle load failed',error);if(!this.dead&&id===this.requestId)this.onState({status:'error',message:error instanceof Error&&error.message.includes('绑定')?error.message:'车型加载失败，请检查网络后重试'});}
 }
 async capture():Promise<string>{if(!this.ready||!this.wheelsReady||!this.environmentReady||!this.liveryReady||this.contextLost)throw new Error('请等待车型加载完成');this.render();return this.renderer.domElement.toDataURL('image/png');}
 dispose(){this.dead=true;this.requestId++;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);this.renderer.domElement.removeEventListener('webglcontextrestored',this.restored);this.controls.dispose();this.wheels.clear();this.draco.dispose();this.environments.dispose();this.livery.dispose();this.scene.remove(this.contactShadow.mesh);this.contactShadow.dispose();disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();}
}
