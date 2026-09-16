import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAIMiddleware,buildImageRequest,validateRequest,MODEL} from './ai-wrap.mjs';
import {aiLayout,atlasWidth,atlasHeight,layoutVersion,legacyAILayout,templateSVG} from '../src/data/aiLayout.ts';
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9AAAAABJRU5ErkJggg==';
const reference='data:image/png;base64,'+pixel;
const design={baseColor:'#E8E2D8',scope:'whole',face:'left',references:[reference],template:reference,layoutVersion};
async function serverFor(t,fetchImpl,extra={}){
 const handler=createAIMiddleware({settings:()=>({apiKey:'private-test-key',baseURL:'http://gateway.example/yz/v1'}),fetchImpl,...extra});
 const server=createServer((req,res)=>void handler(req,res,()=>{res.writeHead(404);res.end();}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
 return `http://127.0.0.1:${server.address().port}`;
}
function post(url,body,headers={}){return fetch(url+'/api/ai-wrap/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Zan-Request':'1',...headers},body:JSON.stringify(body)});}
test('generation and multi-reference editing use the requested model and documented JSON contract',()=>{
 assert.equal(buildImageRequest(design).path,'images/edits');
 const request=buildImageRequest({...design,references:[reference,reference]});
 assert.equal(request.path,'images/edits');assert.equal(request.body.model,MODEL);assert.equal(request.body.n,1);assert.deepEqual(request.body.images,[{image_url:reference},{image_url:reference}]);
 const atlas=buildImageRequest({...design,scope:'whole',template:reference,references:[reference]});assert.equal(atlas.body.images.length,1);assert.equal(atlas.body.background,'transparent');assert.equal(atlas.body.output_format,'png');
});
test('untrusted requests cannot supply an endpoint, oversized references or unsupported face',()=>{
 for(const patch of [{prompt:''},{baseColor:'red'},{face:'__proto__'},{references:['http://localhost/private']},{references:Array(7).fill(reference)},{layoutVersion:'old'},{scope:'face'}])assert.throws(()=>validateRequest({...design,...patch}));
 assert.equal(buildImageRequest({...design,model:'different-model',endpoint:'http://elsewhere'}).body.model,MODEL);
});
test('seven IP crops stay inside the square atlas and preserve gutters without overlaps',()=>{
 assert.equal(new Set(aiLayout.map(r=>r.id)).size,7);assert.ok(aiLayout.reduce((n,r)=>n+r.width*r.height,0)<atlasWidth*atlasHeight);assert.equal(legacyAILayout[0].width,1536);
 for(const [i,a] of aiLayout.entries()){assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=atlasWidth&&a.y+a.height<=atlasHeight);for(const b of aiLayout.slice(i+1))assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
});
test('HTTP roundtrip keeps credential server-side and returns usable base64',async t=>{
 let seen;const url=await serverFor(t,async(path,options)=>{seen={path,options};return new Response(JSON.stringify({data:[{b64_json:pixel}]}),{headers:{'x-request-id':'request-test'}});});
 const response=await post(url,design);assert.equal(response.status,200);const data=await response.json();assert.equal(data.image,reference);assert.equal(data.requestId,'request-test');assert.equal(seen.options.headers.Authorization,'Bearer private-test-key');assert.ok(!JSON.stringify(data).includes('private-test-key'));
});
test('cross-site calls and validation errors never reach the billable upstream',async t=>{
 let calls=0;const url=await serverFor(t,async()=>{calls++;throw new Error('must not run');});
 assert.equal((await post(url,design,{Origin:'https://other.example'})).status,403);
 assert.equal((await post(url,{...design,face:'unknown'})).status,400);
 assert.equal((await post(url,design,{'X-Zan-Request':'0'})).status,415);assert.equal(calls,0);
});
test('upstream errors are sanitized and are never automatically retried',async t=>{
 let calls=0;const url=await serverFor(t,async()=>{calls++;return new Response(JSON.stringify({error:'private-test-key secret upstream detail'}),{status:401});});
 const response=await post(url,design);const body=await response.text();assert.equal(response.status,502);assert.match(body,/鉴权/);assert.ok(!body.includes('private-test-key'));assert.equal(calls,1);
});
test('timeout is actionable and a failed request releases the generation slot',async t=>{
 const url=await serverFor(t,async(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))),{timeout:40});
 for(let i=0;i<2;i++){const r=await post(url,design);assert.equal(r.status,504);assert.match(await r.text(),/超时/);}
});

test('transparent design sends only user elements without the opaque layout template',()=>{
 const element='data:image/png;base64,AAAA';
 const request=buildImageRequest({...design,references:[element]});
 assert.equal(request.body.size,'2048x2048');
 assert.deepEqual(request.body.images,[{image_url:element}]);
});

test('one generation request returns the original upstream image without a second edit',async t=>{
 const calls=[];
 const url=await serverFor(t,async(path,options)=>{
  calls.push({path,body:JSON.parse(options.body)});
  return new Response(JSON.stringify({data:[{b64_json:pixel}]}),{headers:{'x-request-id':'single-request'}});
 });
 const response=await post(url,design);assert.equal(response.status,200);const result=await response.json();
 assert.equal(calls.length,1);assert.equal(calls[0].body.size,'2048x2048');
 assert.equal(result.image,reference);assert.deepEqual(result.requestIds,['single-request']);
});
