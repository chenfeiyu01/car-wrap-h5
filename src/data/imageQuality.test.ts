import test from 'node:test';
import assert from 'node:assert/strict';
import {generatedImageSize,textureTileSize,faceRasterSize} from './imageQuality.ts';
import {aiLayout} from './aiLayout.ts';
import {wrapFaces} from './diy.ts';
import {storeImage,getImage} from './imageStore.ts';
test('2048 source survives physical-aspect crops without discarding source pixels',()=>{
 assert.equal(generatedImageSize,2048);
 for(const r of aiLayout){
  const w=r.width*2,h=r.height*2,aspect=wrapFaces.find(f=>f.id===r.id)!.aspect;
  const target=faceRasterSize(w,h,aspect);assert.ok(target.width>=w&&target.height>=h);
  assert.ok(Math.abs(target.width/target.height-aspect)<.01);
 }
 const side=faceRasterSize(1616,464,3);assert.equal(side.width,1617);
});
test('GPU atlas respects texture limits while retaining 2048-wide side tiles when possible',()=>{
 for(const limit of [2048,4096,8192,16384]){
  const tile=textureTileSize(limit);assert.ok(tile.width*4<=limit&&tile.height*2<=limit);
  assert.equal(tile.width/tile.height,2);
 }
 assert.equal(textureTileSize(8192).width,2048);
 assert.equal(textureTileSize(4096).width,1024);
});
test('generated-image storage preserves the exact input bytes and bypasses canvas resizing',async t=>{
 const blobs=new Map();
 Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,writable:true,value:async()=>{throw new Error('unexpected decode');}});
 t.mock.method(globalThis,'createImageBitmap',async()=>({width:2048,height:2048,close(){}}),{times:1});
 // Minimal asynchronous IDB adapter; exercises the actual storage function.
 const database={transaction(){const tx={objectStore(){return {put(blob,id){blobs.set(id,blob);queueMicrotask(()=>tx.oncomplete?.());},get(id){const r={result:blobs.get(id)};queueMicrotask(()=>r.onsuccess?.());return r;}};}};return tx;}};
 const old=globalThis.indexedDB;
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open(){const r={result:database};queueMicrotask(()=>r.onsuccess?.());return r;}}});
 t.after(()=>Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:old}));
 const file=new File([new Uint8Array([137,80,78,71,1,2,3,4])],'ai.png',{type:'image/png'});
 const id=await storeImage(file,{preserveResolution:true});const stored=await getImage(id);
 assert.equal(stored,file);assert.deepEqual(await stored.arrayBuffer(),await file.arrayBuffer());
});
