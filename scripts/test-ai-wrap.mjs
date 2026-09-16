import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('/Users/chenfeiyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
import {generatedImageSize} from '../src/data/imageQuality.ts';
import {templateSVG,layoutVersion} from '../src/data/aiLayout.ts';
import {buildImageRequest} from '../server/ai-wrap.mjs';
const run=process.argv[2]||'01';
const prefix=`artifacts/ai-wrap-tests/${run}`;
let png=await sharp(Buffer.from(templateSVG('#756958'))).resize(generatedImageSize,generatedImageSize).png().toBuffer();
writeFileSync(prefix+'-template.png',png);
let ref=readFileSync('/var/folders/ly/9nmzd0jn5hqc6nl366v04zd80000gn/T/codex-clipboard-34fce7a8-cfc3-4f86-b12a-26f5ae98cd41.png');
if(Number(run)>=4){ref=await sharp(ref).extract({left:140,top:10,width:220,height:190}).png().toBuffer();writeFileSync(prefix+'-reference.png',ref);}
if(Number(run)>=5&&Number(run)<=7){const small=await sharp(ref).resize(Number(run)>=6?28:65,Number(run)>=6?24:56,{fit:'contain',background:'#756958'}).png().toBuffer();const hood=await sharp(ref).resize(Number(run)>=6?55:108,Number(run)>=6?48:95,{fit:'contain',background:'#756958'}).flip().png().toBuffer();png=await sharp(png).composite([{input:small,left:Number(run)>=6?405:386,top:Number(run)>=6?142:121},{input:small,left:Number(run)>=6?405:386,top:Number(run)>=6?386:365},{input:hood,left:Number(run)>=6?110:82,top:Number(run)>=6?845:825}]).png().toBuffer();writeFileSync(prefix+'-template.png',png);}
const input={baseColor:'#756958',scope:'whole',face:'left',layoutVersion,template:'data:image/png;base64,'+png.toString('base64'),references:['data:image/png;base64,'+(Number(run)===7?png:ref).toString('base64')]};
writeFileSync(prefix+'-prompt.txt',buildImageRequest(input).body.prompt);
const start=Date.now();
const response=await fetch('http://127.0.0.1:5173/api/ai-wrap/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Zan-Request':'1'},body:JSON.stringify(input),signal:AbortSignal.timeout(630000)});
const result=await response.json();
if(!response.ok){console.log(JSON.stringify({status:response.status,error:result.error}));process.exit(1);}
writeFileSync(prefix+'-result.png',Buffer.from(result.image.split(',')[1],'base64'));
const metadata={requestId:result.requestId,requestIds:result.requestIds,revision:result.generationRevision,seconds:Math.round((Date.now()-start)/1000),model:result.model};
writeFileSync(prefix+'-meta.json',JSON.stringify(metadata,null,2));console.log(metadata);
