import test from 'node:test';
import assert from 'node:assert/strict';
import {sideSubjectZone,hoodSubjectZone} from './wrapPlacement.ts';
import {templateSVG} from './aiLayout.ts';
import {readFileSync} from 'node:fs';
test('side safety frame is below the windows and between wheel arches',()=>{
 assert.deepEqual(sideSubjectZone,{x:.30,y:.45,width:.40,height:.32});
 assert.ok(1-sideSubjectZone.y<=.55);
 assert.ok(1-sideSubjectZone.y-sideSubjectZone.height>=.22);
 assert.ok(hoodSubjectZone.x>0&&hoodSubjectZone.y>0);
});
test('actual input template has three visible subject frames and a hood direction label',()=>{
 const svg=templateSVG();
 assert.equal(svg.match(/整只主体必须在框内/g)?.length,3);
 assert.match(svg,/stroke-width="6"/);assert.match(svg,/图案顶部朝上/);
});
test('renderer flips custom hood vertically while preserving preset and side mapping',()=>{
 const shader=readFileSync(new URL('../viewer/livery.ts',import.meta.url),'utf8');
 assert.ok(shader.includes('uv=vec2(q.x,1.0-(q.z-.70)/.30)'));
 assert.ok(shader.includes('1.0-q.z:q.z,q.y)'));
 assert.ok(shader.includes('vec2 hoodUV=vec2(mix(.026,.244,1.0-v),1.0-mix(.688,.987,u))'));
 assert.ok(!shader.includes('placementMask'));
});
