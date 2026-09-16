import type {DIYWrap} from '../data/diy';
import {createDIYAtlas} from './diyAtlas';
import * as THREE from 'three';
import {liveryAccents,type LiveryId,type AccentId} from '../data/config';
export type LiveryState={status:'loading'|'ready'|'error';message:string};
/** Original vector-like graphics projected onto paint only; no extra transparent shell. */
export class Livery {
 private diyInset={value:new THREE.Vector2(.5/2048,.5/1024)};
 private diyAtlas:{value:THREE.Texture|null}={value:null};
 private boundsMin={value:new THREE.Vector3(-.8,0,-1.65)};
 private boundsSize={value:new THREE.Vector3(1.6,1,3.3)};
 setBounds(box:THREE.Box3){this.boundsMin.value.copy(box.min);box.getSize(this.boundsSize.value);}
 private mode={value:0};
 private atlas:{value:THREE.Texture|null}={value:null};
 private loading=new Map<string,Promise<THREE.Texture>>();
 private variant={value:0};
 private request=0;
 private dead=false;
 private accent={value:new THREE.Color('#eeeeeb')};
 constructor(private renderer:THREE.WebGLRenderer,private invalidate:()=>void){}
 bind(material:THREE.MeshPhysicalMaterial,heightScale=1){
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{liveryVariant:this.variant,liveryMode:this.mode,liveryAccent:this.accent,liveryAtlas:this.atlas,diyAtlas:this.diyAtlas,diyInset:this.diyInset,diyMin:this.boundsMin,diySize:this.boundsSize});
   shader.vertexShader='varying vec3 vLiveryPosition;\nvarying vec3 vLiveryNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vLiveryPosition=(modelMatrix*vec4(transformed,1.0)).xyz;vLiveryNormal=normalize(mat3(modelMatrix)*normal);`);
   shader.fragmentShader=`uniform float liveryVariant;uniform float liveryMode;uniform vec3 liveryAccent;uniform sampler2D liveryAtlas;uniform sampler2D diyAtlas;uniform vec2 diyInset;uniform vec3 diyMin;uniform vec3 diySize;
    varying vec3 vLiveryPosition;varying vec3 vLiveryNormal;
    float wrapBand(float x,float a,float b){float w=max(fwidth(x),0.0005);return smoothstep(a-w,a+w,x)*(1.0-smoothstep(b-w,b+w,x));}
    vec3 wrapRGB(vec3 c){return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 p=vLiveryPosition; p.y*=float(${heightScale.toFixed(4)});
    if(liveryMode>0.5&&liveryMode<1.5){
     float x=abs(p.x);float stripe=wrapBand(x,0.035,0.155);float pin=wrapBand(x,0.176,0.187);
     diffuseColor.rgb=mix(diffuseColor.rgb,liveryAccent,max(stripe,pin));
    }else if(liveryMode>1.5&&liveryMode<2.5){
     float side=wrapBand(abs(p.x),0.43,0.85)*wrapBand(p.z,-1.42,1.36);
     float sweep=p.y-(0.3+0.075*p.z);
     float mainLine=wrapBand(sweep,0.0,0.065);float thinLine=wrapBand(sweep,0.084,0.098);
     float slash=wrapBand(p.z+1.8*p.y,-0.25,-0.16)+wrapBand(p.z+1.8*p.y,-0.42,-0.33);
     float graphic=max(max(mainLine,thinLine),slash*wrapBand(p.y,0.24,0.53));
     diffuseColor.rgb=mix(diffuseColor.rgb,liveryAccent,clamp(graphic*side,0.0,1.0));
    }else if(liveryMode>2.5&&liveryMode<3.5){
     vec3 cream=wrapRGB(vec3(.95,.925,.86)),navy=wrapRGB(vec3(.045,.22,.28)),orange=wrapRGB(vec3(.95,.30,.075));
     float x=abs(p.x);float center=1.0-smoothstep(.215-fwidth(x),.215+fwidth(x),x);
     float orangeBand=wrapBand(p.x,-.105,.105);
     float side=wrapBand(abs(p.x),.45,.85)*wrapBand(p.y,.22+.06*p.z,.38+.06*p.z)*wrapBand(p.z,-1.45,1.3);
     float sideOrange=wrapBand(abs(p.x),.45,.85)*wrapBand(p.y,.27+.06*p.z,.31+.06*p.z)*wrapBand(p.z,-1.45,1.3);
     diffuseColor.rgb=mix(cream,navy,max(center,side));diffuseColor.rgb=mix(diffuseColor.rgb,orange,max(orangeBand,sideOrange));
    }else if(liveryMode>3.5&&liveryMode<4.5){
     float t=smoothstep(-1.6,1.6,p.z);vec3 blue=wrapRGB(vec3(.055,.12,.32)),violet=wrapRGB(vec3(.40,.27,.66)),pink=wrapRGB(vec3(.76,.36,.55));
     vec3 base=mix(blue,violet,t);base=mix(base,pink,smoothstep(.1,.9,p.y)*t*.72);
     float curve=p.y+.24*sin(p.z*1.35)+.15*abs(p.x);
     float ribbon=wrapBand(curve,.46,.56);float hairline=wrapBand(curve,.60,.608)+wrapBand(curve,.655,.66);
     vec3 highlight=wrapRGB(vec3(.75,.83,.94));
     diffuseColor.rgb=mix(base,mix(violet,highlight,t*.65+.2),ribbon);diffuseColor.rgb=mix(diffuseColor.rgb,highlight,clamp(hairline*.75,0.0,1.0));
    }else if(liveryMode>5.5){
     vec3 q=clamp((vLiveryPosition-diyMin)/max(diySize,vec3(.001)),0.0,1.0);
     vec3 n=abs(normalize(vLiveryNormal));float face;vec2 uv;
     if(n.y>=n.x&&n.y>=n.z){
      if(q.z>.70){face=2.0;uv=vec2(q.x,1.0-(q.z-.70)/.30);}
      else if(q.z<.27){face=4.0;uv=vec2(1.0-q.x,1.0-q.z/.27);}
      else{face=3.0;uv=vec2(q.x,(q.z-.27)/.43);}
     }else if(n.x>=n.z){
      face=vLiveryNormal.x>0.0?0.0:1.0;
      uv=vec2(vLiveryNormal.x>0.0?1.0-q.z:q.z,q.y);
     }else{
      face=vLiveryNormal.z>0.0?5.0:6.0;
      uv=vec2(vLiveryNormal.z>0.0?q.x:1.0-q.x,q.y);
     }
     // Half-texel inset prevents neighbouring atlas tiles bleeding into a face.
     uv=clamp(uv,diyInset,vec2(1.0)-diyInset);
     vec2 atlasUV=vec2((mod(face,4.0)+uv.x)/4.0,(1.0-floor(face/4.0)+uv.y)/2.0);
     vec4 artwork=texture2D(diyAtlas,atlasUV);
     diffuseColor.rgb=mix(diffuseColor.rgb,artwork.rgb,artwork.a);
    }else if(liveryMode>4.5){
     vec3 pink=wrapRGB(vec3(1.0,.76,.88)),black=vec3(.003);
     float along=clamp((1.2-p.z)/2.4+.02,0.0,1.0);
     diffuseColor.rgb=texture2D(liveryAtlas,vec2(mix(.026,.790,along),.967)).rgb;
     if(liveryVariant>.5&&abs(liveryVariant-5.0)>.1&&abs(liveryVariant-7.0)>.1&&abs(liveryVariant-10.0)>.1)diffuseColor.rgb=texture2D(liveryAtlas,vec2(.90,.90)).rgb;
     vec3 n=abs(normalize(vLiveryNormal));
     if(abs(p.x)>.40&&p.y>.18&&p.y<.77&&n.x>.40){
      float u=clamp((p.z+1.2)/2.4,0.0,1.0);
      float v=clamp((p.y-.18)/.68,0.0,1.0);
      vec2 atlasUV;
      if(p.x>0.0)atlasUV=vec2(mix(.026,.790,clamp(1.0-u+.02,0.0,1.0)),1.0-mix(.235,.012,v));
      else atlasUV=vec2(mix(.026,.790,clamp(u-.02,0.0,1.0)),1.0-mix(.476,.251,v));
      // Lotso's lower source strip contains backwards lettering; use its readable top strip.
      if((abs(liveryVariant-2.0)<.1||abs(liveryVariant-4.0)<.1)&&p.x<0.0)atlasUV=vec2(mix(.026,.790,clamp(u-.02,0.0,1.0)),1.0-mix(.235,.012,v));
      if(abs(liveryVariant-4.0)<.1)atlasUV.x=mix(.036,.783,clamp((atlasUV.x-.026)/.774,0.0,1.0));
      if(abs(liveryVariant-5.0)<.1&&p.x<0.0&&atlasUV.x>.473&&atlasUV.x<.557&&atlasUV.y>.545&&atlasUV.y<.575)atlasUV.x=1.03-atlasUV.x;
      diffuseColor.rgb=texture2D(liveryAtlas,atlasUV).rgb;
     }
     if((liveryVariant<1.5||liveryVariant>8.5)&&p.z>.52&&p.z<1.45&&p.y>.48&&n.y>.50){
      float u=clamp((p.x+.46)/.92,0.0,1.0),v=clamp((p.z-.52)/.93,0.0,1.0);
      vec2 hoodUV=vec2(mix(.026,.244,1.0-v),1.0-mix(.688,.987,u));
      if(abs(liveryVariant-1.0)<.1)hoodUV=vec2(mix(.280,.715,1.0-v),1.0-mix(.735,.946,u));
      if(liveryVariant>10.5)hoodUV=vec2(mix(.030,.240,u),1.0-mix(.697,.980,v));
      diffuseColor.rgb=texture2D(liveryAtlas,hoodUV).rgb;
     }
    }`);
  };
  material.customProgramCacheKey=()=> 'car-livery-v9-hood-'+heightScale;
 }
 async select(id:LiveryId,accent:AccentId,onState:(s:LiveryState)=>void,diy?:DIYWrap){
  const request=++this.request;this.accent.value.set(liveryAccents.find(a=>a.id===accent)!.hex);
  if(id==='custom'){
   onState({status:'loading',message:'正在合成自定义车衣…'});
   try{
    if(!diy)throw new Error('缺少车衣设计');
    const canvas=await createDIYAtlas(diy,this.renderer.capabilities.maxTextureSize);
    if(this.dead||request!==this.request)return;
    this.diyInset.value.set(.5/(canvas.width/4),.5/(canvas.height/2));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.diyAtlas.value?.dispose();this.diyAtlas.value=texture;this.mode.value=6;
    this.invalidate();onState({status:'ready',message:''});
   }catch(error){if(!this.dead&&request===this.request)onState({status:'error',message:error instanceof Error?error.message:'自定义车衣加载失败'});}
   return;
  }
  if(['kuromi','kitty','lotso','labubu','kirby','doraemon','shinchan-blue','shinchan-mint','pokemon-black','kirby-race','pokemon-yellow','youzan'].includes(id)){
   onState({status:'loading',message:'正在加载拉花图案…'});
   if(!this.loading.has(id))this.loading.set(id,new THREE.TextureLoader().loadAsync(`/liveries/${id}-atlas.png${id==='youzan'?'?v=8c7ad1fddb4c':''}`).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;}));
   try{const texture=await this.loading.get(id)!;if(this.dead||request!==this.request)return;this.atlas.value=texture;this.variant.value=['kuromi','kitty','lotso','labubu','kirby','doraemon','shinchan-blue','shinchan-mint','pokemon-black','kirby-race','pokemon-yellow','youzan'].indexOf(id);}
   catch{this.loading.delete(id);if(!this.dead&&request===this.request)onState({status:'error',message:'拉花图案加载失败，请重试'});return;}
  }
  if(this.dead||request!==this.request)return;
  this.mode.value={none:0,stripes:1,side:2,retro:3,flow:4,kuromi:5,kitty:5,lotso:5,labubu:5,kirby:5,doraemon:5,'shinchan-blue':5,'shinchan-mint':5,'pokemon-black':5,'kirby-race':5,'pokemon-yellow':5,youzan:5}[id];this.invalidate();onState({status:'ready',message:''});
 }
 dispose(){this.dead=true;this.request++;for(const texture of this.loading.values())void texture.then(t=>t.dispose(),()=>{});this.loading.clear();this.diyAtlas.value?.dispose();}
}
