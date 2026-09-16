import * as THREE from 'three';

function blurMaterial(){
 return new THREE.ShaderMaterial({
  uniforms:{tDiffuse:{value:null},direction:{value:new THREE.Vector2()},sigma:{value:1}},depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 shadowUv; void main(){shadowUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:'uniform sampler2D tDiffuse; uniform vec2 direction; uniform float sigma; varying vec2 shadowUv; void main(){vec4 total=vec4(0.0); float weights=0.0; for(int sampleIndex=-24;sampleIndex<=24;sampleIndex++){float offset=float(sampleIndex); float weight=exp(-offset*offset/(2.0*sigma*sigma)); total+=texture2D(tDiffuse,shadowUv+direction*offset)*weight; weights+=weight;} gl_FragColor=total/weights;}',
 });
}

export class ContactShadow {
 readonly mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 private source=new THREE.WebGLRenderTarget(512,512);
 private scratch=new THREE.WebGLRenderTarget(512,512,{depthBuffer:false});
 private tight=new THREE.WebGLRenderTarget(512,512,{depthBuffer:false});
 private soft=new THREE.WebGLRenderTarget(512,512,{depthBuffer:false});
 private depth=new THREE.MeshDepthMaterial({side:THREE.DoubleSide,blending:THREE.NoBlending});
 private horizontal=blurMaterial();
 private vertical=blurMaterial();
 private quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.horizontal);
 private blurCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);
 private blurScene=new THREE.Scene();
 private height={value:1};
 constructor(){
  this.depth.onBeforeCompile=shader=>{
   shader.uniforms.contactHeight=this.height;
   shader.fragmentShader='uniform float contactHeight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','float heightAboveGround=max(0.0,fragCoordZ*contactHeight-0.025); gl_FragColor=vec4(exp(-heightAboveGround*28.0),exp(-heightAboveGround*2.8),0.0,1.0);');
  };
  this.depth.customProgramCacheKey=()=> 'ground-contact-height-v1';
  this.blurCamera.position.z=1;this.blurScene.add(this.quad);
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({
   uniforms:{tightMap:{value:this.tight.texture},softMap:{value:this.soft.texture},strength:{value:1}},
   vertexShader:'varying vec2 shadowUv; void main(){shadowUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform sampler2D tightMap; uniform sampler2D softMap; uniform float strength; varying vec2 shadowUv; void main(){float tight=texture2D(tightMap,shadowUv).r; float soft=texture2D(softMap,shadowUv).g; float opacity=1.0-(1.0-tight*.92)*(1.0-soft*.9); gl_FragColor=vec4(0.0,0.0,0.0,opacity*strength);}',
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
  }));
  this.mesh.name='Vehicle_contact_shadow';this.mesh.rotation.x=Math.PI/2;this.mesh.position.y=-.006;this.mesh.renderOrder=3;this.mesh.visible=false;
 }
 setStrength(value:number){this.mesh.material.uniforms.strength.value=value;}
 update(renderer:THREE.WebGLRenderer,model:THREE.Object3D){
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const width=size.x+.9,length=size.z+.9,height=size.y+.1;
  this.height.value=height;
  this.mesh.scale.set(width,length,1);this.mesh.position.set(center.x,-.006,center.z);
  const camera=new THREE.OrthographicCamera(-width/2,width/2,length/2,-length/2,0,height);
  camera.position.set(center.x,-.025,center.z);camera.up.set(0,0,1);camera.lookAt(center.x,1,center.z);camera.updateMatrixWorld();
  const scene=new THREE.Scene();scene.overrideMaterial=this.depth;
  const parent=model.parent,target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),shadows=renderer.shadowMap.enabled;
  const hidden:THREE.Object3D[]=[];
  model.traverse(object=>{if(object instanceof THREE.Mesh&&object.visible){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.every(material=>material.transparent&&material.opacity<.85)){object.visible=false;hidden.push(object);}}});
  try{
   scene.add(model);renderer.shadowMap.enabled=false;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(this.source);renderer.clear();renderer.render(scene,camera);
   this.blur(renderer,this.tight,.012/width*512,.012/length*512);
   this.blur(renderer,this.soft,.065/width*512,.065/length*512);
   this.mesh.visible=true;
  }finally{
   scene.remove(model);parent?.add(model);hidden.forEach(object=>{object.visible=true;});renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);renderer.shadowMap.enabled=shadows;
  }
 }
 private blur(renderer:THREE.WebGLRenderer,target:THREE.WebGLRenderTarget,horizontal:number,vertical:number){
  this.horizontal.uniforms.tDiffuse.value=this.source.texture;this.horizontal.uniforms.direction.value.set(1/512,0);this.horizontal.uniforms.sigma.value=horizontal;this.quad.material=this.horizontal;
  renderer.setRenderTarget(this.scratch);renderer.clear();renderer.render(this.blurScene,this.blurCamera);
  this.vertical.uniforms.tDiffuse.value=this.scratch.texture;this.vertical.uniforms.direction.value.set(0,1/512);this.vertical.uniforms.sigma.value=vertical;this.quad.material=this.vertical;
  renderer.setRenderTarget(target);renderer.clear();renderer.render(this.blurScene,this.blurCamera);
 }
 dispose(){
  this.mesh.geometry.dispose();this.mesh.material.dispose();this.quad.geometry.dispose();this.depth.dispose();this.horizontal.dispose();this.vertical.dispose();
  this.source.dispose();this.scratch.dispose();this.tight.dispose();this.soft.dispose();
 }
}
