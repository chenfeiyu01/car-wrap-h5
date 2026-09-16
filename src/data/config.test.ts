import test from 'node:test';
import assert from 'node:assert/strict';
import {parseConfiguration,initial,liveries} from './config.ts';
test('rejects unknown and obsolete configuration',()=>{for(const value of [null,{}, {...initial,schemaVersion:2},{...initial,vehicleId:'../bad'},{...initial,colorId:'#fff'},{...initial,finishId:'unknown'}])assert.equal(parseConfiguration(value),null);});
test('valid configuration roundtrips and removes unknown fields',()=>{assert.deepEqual(parseConfiguration({...initial,secret:'not stored'}),initial);assert.deepEqual(parseConfiguration(JSON.parse(JSON.stringify(initial))),initial);});
test('remote q50 vehicle is a valid configuration',()=>{assert.equal(parseConfiguration({...initial,vehicleId:'q50'})?.vehicleId,'q50');});
test('old saved designs inherit studio and unknown environments are rejected',()=>{
 const {environmentId,...legacy}=initial;
 assert.deepEqual(parseConfiguration(legacy),initial);
 assert.equal(parseConfiguration({...initial,environmentId:'missing'}),null);
 for(const environmentId of ['studio','mountain','sunset','gallery'])assert.equal(parseConfiguration({...initial,environmentId})?.environmentId,environmentId);
});
test('livery migration, valid presets and model boundaries',()=>{
 const {liveryId,accentId,...legacy}=initial;
 assert.deepEqual(parseConfiguration(legacy),initial);
 for(const {id:liveryId} of liveries.filter(l=>l.id!=='custom'))assert.equal(parseConfiguration({...initial,liveryId})?.liveryId,liveryId);
 assert.equal(parseConfiguration({...initial,liveryId:'unknown'}),null);
 assert.equal(parseConfiguration({...initial,accentId:'unknown'}),null);
 assert.equal(parseConfiguration({...initial,vehicleId:'su7',liveryId:'kuromi'}),null);
 assert.equal(parseConfiguration({...initial,vehicleId:'su7',liveryId:'none'}),null);
});

test('retired workshop preserves design and migrates to studio',()=>{assert.deepEqual(parseConfiguration({...initial,environmentId:'workshop',colorId:'cherry-red'}),{...initial,colorId:'cherry-red'});});

test('legacy colours migrate without dropping the rest of the configuration',()=>{
 assert.equal(parseConfiguration({...initial,colorId:'forest-green'})?.colorId,'gem-green');
 assert.equal(parseConfiguration({...initial,colorId:'liquid-gunmetal'})?.colorId,'liquid-gunmetal');
});
test('DIY references and transforms persist while malformed inputs are rejected',()=>{
 const diy={baseColor:'#123456',faces:{left:{assetId:'image-test',scale:1,x:0,y:0,rotation:0,opacity:1}}};
 const design={...initial,liveryId:'custom',diy};assert.deepEqual(parseConfiguration(design),design);
 assert.equal(parseConfiguration({...design,diy:undefined}),null);
 for(const value of [NaN,Infinity,-1,5])assert.equal(parseConfiguration({...design,diy:{...diy,faces:{left:{...diy.faces.left,scale:value}}}}),null);
 assert.equal(parseConfiguration({...design,diy:{...diy,baseColor:'red'}}),null);
 assert.equal(parseConfiguration({...design,diy:{...diy,faces:{left:{...diy.faces.left,assetId:'https://external.example/image.png'}}}}),null);
});
test('all vehicles persist both replacement wheels and migrate old configurations to stock',()=>{
 for(const vehicleId of ['w206','car10','yu7','q50'])for(const wheelId of ['original','wheel-1','wheel-2']){
  const c={...initial,vehicleId,wheelId};assert.deepEqual(parseConfiguration(JSON.parse(JSON.stringify(c))),c);
 }
 const {wheelId,...legacy}=initial;assert.equal(parseConfiguration(legacy)?.wheelId,'original');
 assert.equal(parseConfiguration({...initial,wheelId:'missing'}),null);
});
