import {readFileSync,writeFileSync} from 'node:fs';
import {readSettings,MODEL} from '../server/ai-wrap.mjs';
const run=process.argv[2]||'08';const source=process.argv[3]||'06';
const prompt=`Edit this texture atlas IN PLACE. This is a placement correction, NOT a redesign. Preserve every panel boundary and every background motif. There are three cats: one in each of the top two horizontal panels and an upside-down cat in the bottom-left panel.
Make each cat MUCH SMALLER: shrink the entire cat including ears, paws and tail to ONE FIFTH of its current width and height. Move the first small cat to center (420,146), second to center (420,390), third to center (136,855). Coordinates are pixels on a 1024 x 1024 canvas. First cat must fit completely inside x=300..540,y=118..180. Second inside x=300..540,y=362..424. Third inside x=75..195,y=790..920. Fill vacated space naturally with the existing brown background. Do NOT enlarge these small cats to fill the empty space. The majority of each panel should remain background. Preserve all three cat identities and poses; keep the bottom-left cat upside down. Keep every other panel free of cats. Return the full 1024 x 1024 atlas.`;
const settings=readSettings();const body={model:MODEL,prompt,size:'1024x1024',n:1,images:[{image_url:'data:image/png;base64,'+readFileSync(`artifacts/ai-wrap-tests/${source}-result.png`).toString('base64')}]};
writeFileSync(`artifacts/ai-wrap-tests/${run}-prompt.txt`,prompt);
const start=Date.now();const response=await fetch(settings.baseURL+'/images/edits',{method:'POST',headers:{Authorization:'Bearer '+settings.apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)});
if(!response.ok){console.log({status:response.status});process.exit(1);}
const result=await response.json();writeFileSync(`artifacts/ai-wrap-tests/${run}-result.png`,Buffer.from(result.data[0].b64_json,'base64'));
const meta={requestId:response.headers.get('x-request-id'),seconds:Math.round((Date.now()-start)/1000),model:MODEL};writeFileSync(`artifacts/ai-wrap-tests/${run}-meta.json`,JSON.stringify(meta,null,2));console.log(meta);
