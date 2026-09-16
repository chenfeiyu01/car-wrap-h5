import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector3} from 'three';
import {environments} from '../data/config.ts';
import {environmentLightDirection,photoEnvironments} from './photoEnvironments.ts';

test('photographic environments exclude the approved studios and cover every other entry',()=>{
 assert.deepEqual(Object.keys(photoEnvironments).sort(),environments.map(environment=>environment.id).filter(id=>id!=='studio'&&id!=='gallery').sort());
 for(const preset of Object.values(photoEnvironments)){
  assert.ok(preset.height>0&&preset.height<2);
  assert.ok(preset.radius>=30);
  assert.ok(preset.exposure>0&&preset.intensity>0);
  assert.ok(environmentLightDirection(preset.sunUV,preset.rotation).y>0);
 }
});

test('panorama lights follow the same spherical orientation as the background',()=>{
 assert.ok(environmentLightDirection([.5,.5],0).distanceTo(new Vector3(1,0,0))<1e-10);
 assert.ok(environmentLightDirection([.25,.5],0).distanceTo(new Vector3(0,0,-1))<1e-10);
 assert.ok(environmentLightDirection([.5,.5],Math.PI/2).distanceTo(new Vector3(0,0,-1))<1e-10);
 for(const preset of Object.values(photoEnvironments))assert.ok(Math.abs(environmentLightDirection(preset.sunUV,preset.rotation).length()-1)<1e-10);
});

test('all photographic HDR files match the published asset checksums',()=>{
 const checksums={skidpan:'cd01e317ac16840778c4a1fbbcf17820',modern_buildings_2:'e8a67f0a03787ab178ec1c55643c658e',autoshop_01:'15482ac3b9a1aa723add98d5612c2c15'};
 for(const preset of Object.values(photoEnvironments)){
  const file=readFileSync(new URL(`../../public/environments/${preset.asset}_2k.hdr`,import.meta.url));
  assert.equal(createHash('md5').update(file).digest('hex'),checksums[preset.asset]);
 }
});
