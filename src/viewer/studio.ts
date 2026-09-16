import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

function softboxTexture(){
 const size=256,data=new Uint8Array(size*size*4);
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const horizontal=(column+.5)/size*2-1,vertical=(row+.5)/size*2-1;
  const edge=(1-THREE.MathUtils.smoothstep(Math.abs(horizontal),.93,1))*(1-THREE.MathUtils.smoothstep(Math.abs(vertical),.86,1));
  const intensity=Math.round(edge*255);
  data.set([intensity,intensity,intensity,255],(row*size+column)*4);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
export const studioCards=[
 {position:[-2.6,4.4,-1.2],target:[0,.3,0],width:4.4,height:2.2,intensity:6.5},
 {position:[3.8,2.1,.8],target:[0,.5,0],width:5.5,height:.55,intensity:10},
 {position:[-3.8,2.4,1.4],target:[0,.5,0],width:4.8,height:1.3,intensity:4.2},
 {position:[.5,3,-4],target:[0,.6,0],width:4.2,height:.7,intensity:8},
 {position:[.2,1.8,4.8],target:[0,.5,0],width:3.2,height:1.6,intensity:1.5},
] as const;

export function createStudioFloorReflection(bright:boolean){
 const reflection=new Reflector(new THREE.PlaneGeometry(24,24),{
  textureWidth:1024,textureHeight:1024,multisample:0,clipBias:.0002,
  shader:{
   name:'Polished_studio_floor',
   uniforms:{tDiffuse:{value:null},color:{value:new THREE.Color(0xffffff)},textureMatrix:{value:new THREE.Matrix4()},strength:{value:bright?.76:.88},texel:{value:new THREE.Vector2(1/1024,1/1024)},blur:{value:bright?.8:.55}},
   vertexShader:`uniform mat4 textureMatrix;
    varying vec4 reflectionUv;
    varying vec3 worldPosition;
    void main(){
     reflectionUv=textureMatrix*vec4(position,1.0);
     worldPosition=(modelMatrix*vec4(position,1.0)).xyz;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }`,
   fragmentShader:`uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float blur;
    uniform vec2 texel;
    varying vec4 reflectionUv;
    varying vec3 worldPosition;
    void main(){
     vec2 sampleUv=reflectionUv.xy/reflectionUv.w;
     float radius=blur*(1.0+length(worldPosition.xz)*.3);
     vec3 reflected=texture2D(tDiffuse,sampleUv).rgb*4.0;
     float weights=4.0;
     for(int column=-1;column<=1;column++){
      for(int row=-1;row<=1;row++){
       if(column==0&&row==0)continue;
       float weight=column==0||row==0?2.0:1.0;
       reflected+=texture2D(tDiffuse,sampleUv+vec2(float(column),float(row))*texel*radius).rgb*weight;
       weights+=weight;
      }
     }
     float facing=clamp(normalize(cameraPosition-worldPosition).y,0.0,1.0);
     float fresnel=.075+.72*pow(1.0-facing,5.0);
     float edge=1.0-smoothstep(5.0,10.0,length(worldPosition.xz));
     gl_FragColor=vec4(reflected/weights,strength*fresnel*edge);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`,
  },
 });
 reflection.name='Polished_studio_reflection';reflection.rotation.x=-Math.PI/2;reflection.position.y=-.012;reflection.renderOrder=1;
 const material=reflection.material as THREE.ShaderMaterial;material.transparent=true;material.depthWrite=false;
 const renderReflection=reflection.onBeforeRender;
 reflection.onBeforeRender=function(renderer,scene,camera,geometry,finish,group){
  const contact=scene.getObjectByName('Vehicle_contact_shadow'),visible=contact?.visible,reflectionVisible=this.visible;
  if(contact)contact.visible=false;
  try{renderReflection.call(this,renderer,scene,camera,geometry,finish,group);}
  finally{if(contact)contact.visible=visible!;this.visible=reflectionVisible;}
 };
 return reflection;
}

export type Studio = {root:THREE.Group;environment:THREE.WebGLRenderTarget;setQuality:(high:boolean)=>void;dispose:()=>void};
export function createStudio(renderer:THREE.WebGLRenderer, scene:THREE.Scene, bright=false):Studio {
 RectAreaLightUniformsLib.init();
 const studio=new THREE.Group();studio.name='Photographic_cyclorama';scene.add(studio);
 scene.background=new THREE.Color(bright?'#e0e3e7':'#101318');
 const profile=[new THREE.Vector2(8,-.021)];
 for(let step=1;step<=40;step++){const angle=step/40*Math.PI/2;profile.push(new THREE.Vector2(8+3*Math.sin(angle),3-3*Math.cos(angle)-.021));}
 profile.push(new THREE.Vector2(11,9));
 const backdropMaterial=new THREE.MeshStandardMaterial({color:bright?'#d1d5db':'#191f27',roughness:.9,metalness:0,envMapIntensity:.18,emissive:bright?'#c4cad2':'#11151b',emissiveIntensity:bright?.16:.035,side:THREE.DoubleSide});
 const backdrop=new THREE.Mesh(new THREE.LatheGeometry(profile,96),backdropMaterial);studio.add(backdrop);
 const floorMaterial=backdropMaterial.clone();floorMaterial.side=THREE.FrontSide;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),floorMaterial);floor.name='Studio_base_floor';floor.rotation.x=-Math.PI/2;floor.position.y=-.019;studio.add(floor);
 const environmentScene=new THREE.Scene();
 const shell=new THREE.Mesh(new THREE.SphereGeometry(18,32,16),new THREE.ShaderMaterial({
  uniforms:{brightness:{value:bright?1:.48}},side:THREE.BackSide,
  vertexShader:'varying vec3 direction; void main(){direction=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float brightness; varying vec3 direction; void main(){float elevation=normalize(direction).y; float value=mix(.13,.025,smoothstep(-.35,.12,elevation)); value=mix(value,.11,smoothstep(.2,1.0,elevation)); gl_FragColor=vec4(vec3(value*brightness),1.0);}',
 }));environmentScene.add(shell);
 const texture=softboxTexture();
 for(const card of studioCards){
  const light=new THREE.RectAreaLight(0xffffff,card.intensity*.085,card.width,card.height);light.position.fromArray(card.position);light.lookAt(new THREE.Vector3().fromArray(card.target));studio.add(light);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(card.width,card.height),new THREE.MeshBasicMaterial({map:texture,color:new THREE.Color(card.intensity,card.intensity,card.intensity),side:THREE.DoubleSide}));panel.position.copy(light.position);panel.quaternion.copy(light.quaternion);environmentScene.add(panel);
 }
 for(const side of [-1,1]){
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(5,.7),new THREE.MeshBasicMaterial({color:'#050608',side:THREE.DoubleSide}));flag.position.set(side*4,.38,.3);flag.lookAt(0,.45,0);environmentScene.add(flag);
 }
 studio.add(new THREE.HemisphereLight(0xf1f5ff,0x50555c,bright?.25:.12));
 const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(environmentScene,0,.1,45,{size:512});generator.dispose();
 environmentScene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});texture.dispose();
 const reflection=createStudioFloorReflection(bright);studio.add(reflection);
 return {root:studio,environment,setQuality(high){reflection.visible=high;},dispose(){reflection.dispose();environment.dispose();}};
}
