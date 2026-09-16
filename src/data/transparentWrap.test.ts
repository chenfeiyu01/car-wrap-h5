import test from 'node:test';
import assert from 'node:assert/strict';
import {transparentBounds,containArtwork} from './transparentWrap.ts';
import {sideSubjectZone,hoodSubjectZone} from './wrapPlacement.ts';
test('alpha cleanup removes distant specks but preserves attached faint edges and separate design elements',()=>{
 const width=200,height=200,pixels=new Uint8ClampedArray(width*height*4);
 const fill=(x:number,y:number,w:number,h:number,alpha:number)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[(j*width+i)*4+3]=alpha;};
 assert.throws(()=>transparentBounds(pixels,width,height),/空白/);
 fill(50,80,80,30,255);fill(130,80,2,30,12);fill(145,85,15,20,255);
 fill(2,2,1,1,255);fill(195,190,2,2,1);
 const bounds=transparentBounds(pixels,width,height);
 assert.deepEqual(bounds,{x:50,y:80,width:110,height:30});
 assert.equal(pixels[(2*width+2)*4+3],0);
 assert.equal(pixels[(80*width+131)*4+3],12);
 assert.equal(pixels[(85*width+145)*4+3],255);
 for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 assert.throws(()=>transparentBounds(pixels,width,height),/透明背景/);
});
test('portrait, landscape and extreme aspect artwork remain complete inside each physical safety zone',()=>{
 for(const [zone,aspect] of [[sideSubjectZone,3],[hoodSubjectZone,1.4]] as const){
  const target={x:zone.x*aspect,y:zone.y,width:zone.width*aspect,height:zone.height};
  for(const [width,height] of [[2048,2048],[2048,256],[128,2048],[13,5000]]){
   const r=containArtwork({x:70,y:20,width,height},target);
   assert.ok(r.x>target.x&&r.y>target.y);
   assert.ok(r.x+r.width<target.x+target.width&&r.y+r.height<target.y+target.height);
   assert.ok(Math.abs(r.width/r.height-width/height)<1e-9);
  }
 }
});
