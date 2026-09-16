import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('/Users/chenfeiyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();await page.route('**/wheel-asset-check',r=>r.fulfill({contentType:'text/html',body:'<html></html>'}));await page.goto('http://127.0.0.1:5173/wheel-asset-check');
 const result=await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {DRACOLoader}=await import('/node_modules/three/examples/jsm/loaders/DRACOLoader.js');
  const {wheelBindings}=await import('/src/viewer/wheelBindings.ts');
  const {wheelFit,WheelSwap}=await import('/src/viewer/wheels.ts');
  const THREE=await import('/node_modules/three/build/three.module.js');
  const draco=new DRACOLoader().setDecoderPath('/draco/');const loader=new GLTFLoader().setDRACOLoader(draco);const results=[];
  const sources=[];for(const file of ['/models/wheel-1.glb','/models/wheel-2.glb']){const model=(await loader.loadAsync(file)).scene;sources.push(new THREE.Box3().setFromObject(model));}
  for(const [id,url] of [['w206','/models/mercedes-w206.glb'],['car10','/models/car10-taillights.glb'],['yu7','/models/xiaomi-yu7.glb'],['q50','https://file.yzcdn.cn/upload_files/yz-file/2026/09/16/loVOikr8QfOaNi2Of23hr4ptAHXh.glb']]){
   const model=(await loader.loadAsync(url)).scene;const {boxes,parts,brakes}=wheelBindings(model,id);
   if(boxes.length!==4||parts.length<1)throw Error(id+' invalid bindings '+JSON.stringify({boxes:boxes.length,parts:parts.length}));
   for(const box of boxes)for(const source of sources){const fit=wheelFit(box,source);if(!fit.scale.toArray().every(n=>Number.isFinite(n)&&n>0))throw Error(id+' invalid fit');}
   let status;
   const swap=new WheelSwap(draco,()=>{},()=>{});await swap.bind(model,id);
   for(const style of ['wheel-1','wheel-2']){await swap.select(style,s=>status=s);if(status.status!=='ready'||model.getObjectByName('replacement-wheels')?.children.length!==4)throw Error(id+' replacement failed');if(parts.some(o=>o.visible))throw Error(id+' stock wheel still visible');}
   await swap.select('original',s=>status=s);if(parts.some(o=>!o.visible)||model.getObjectByName('replacement-wheels'))throw Error(id+' restore failed');swap.clear();
   results.push({id,swapAndRestore:true,mounts:boxes.map(b=>({center:b.getCenter(new THREE.Vector3()).toArray(),size:b.getSize(new THREE.Vector3()).toArray()})),hiddenWheelMeshes:parts.length,brakeMeshes:brakes.length});
  }
  draco.dispose();return results;
 });writeFileSync('artifacts/wheels/asset-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
