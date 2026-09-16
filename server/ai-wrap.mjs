import {generatedImageSize} from '../src/data/imageQuality.ts';
import {generationRevision} from '../src/data/wrapPlacement.ts';
import {layoutVersion} from '../src/data/aiLayout.ts';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export const MODEL='gpt-image-2.5-flare';
const faces={left:'左侧',right:'右侧',hood:'引擎盖',roof:'车顶',trunk:'尾厢',front:'前保险杠',rear:'后保险杠'};
const MAX_BODY=26*1024*1024;
export function readSettings(root=process.cwd()){
 const local={};try{for(const line of readFileSync(resolve(root,'.env.local'),'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)local[m[1]]=m[2].trim();}}catch{}
 return {apiKey:process.env.AI_GATEWAY_API_KEY||local.AI_GATEWAY_API_KEY||'',baseURL:process.env.AI_GATEWAY_BASE_URL||local.AI_GATEWAY_BASE_URL||'http://aigateway.prod.qima-inc.com/yz/v1',model:MODEL};
}
function error(status,message){return Object.assign(new Error(message),{status});}
function validateImage(value){
 if(typeof value!=='string'||value.length>8*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw error(400,'参考图格式不正确，或单张图片过大');return value;
}
export function validateRequest(input){
 if(!input||typeof input!=='object')throw error(400,'缺少设计参数');
 const {baseColor,scope,face,references=[],template}=input;
 if(Object.hasOwn(input,'prompt'))throw error(400,'不支持自定义提示词，请使用参考图片生成');
 if(typeof baseColor!=='string'||!/^#[a-f\d]{6}$/i.test(baseColor))throw error(400,'底色格式不正确');
 if(scope!=='whole'||!Object.hasOwn(faces,face)||input.layoutVersion!==layoutVersion)throw error(400,'车身分面不正确');
 if(!Array.isArray(references)||references.length<1||references.length>6)throw error(400,'请上传 1–6 张参考图');
 references.forEach(validateImage);
 return {baseColor,scope,face,references,template};
}
export function buildImageRequest(input){
 const v=validateRequest(input);
 const prompt=`参考图片中的元素，设计一幅横向、连贯的车衣图案，主体和装饰组成一个完整构图，适合搭配 ${v.baseColor} 车身底色。输出透明背景 PNG，只包含设计图案，四周留透明余量；不要底色、棋盘格、汽车效果图、分区模板或多幅素材合集。`;
 return {path:'images/edits',body:{model:MODEL,prompt,size:`${generatedImageSize}x${generatedImageSize}`,n:1,background:'transparent',output_format:'png',images:v.references.map(image_url=>({image_url}))}};
}
export function createAIMiddleware({settings=readSettings,fetchImpl=fetch,timeout=600000}={}){
 let active=0;
 return async function aiWrap(req,res,next=()=>{}){
  const path=(req.url||'').split('?')[0];if(!path.startsWith('/api/ai-wrap/'))return next();
  const send=(status,body)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  const config=settings();
  if(path==='/api/ai-wrap/status'&&req.method==='GET')return send(200,{configured:!!config.apiKey,model:MODEL,generationRevision});
  if(path!=='/api/ai-wrap/generate')return send(404,{error:'接口不存在'});
  if(req.method!=='POST')return send(405,{error:'请使用 POST 请求'});
  // Only this site's JSON form can spend the locally configured key.
  if(req.headers['x-zan-request']!=='1'||!String(req.headers['content-type']).startsWith('application/json'))return send(415,{error:'请求格式不正确'});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'不允许跨站调用生图接口'});}catch{return send(403,{error:'来源不正确'});}}
  if(!config.apiKey)return send(503,{error:'服务端尚未配置 AI 生图密钥'});
  if(active>=1)return send(429,{error:'正在生成一份设计，请完成后再试'});
  if(Number(req.headers['content-length'])>MAX_BODY)return send(413,{error:'参考图片总大小过大，请减少图片'});
  active++;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  const closed=()=>{if(!res.writableEnded)controller.abort();};res.once('close',closed);
  try{
   let bytes=0;const chunks=[];
   for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BODY)throw error(413,'参考图片总大小过大，请减少图片');chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{throw error(400,'设计数据不是有效的 JSON');}
   const request=buildImageRequest(input);
   async function requestImage(request){
   if(controller.signal.aborted)throw error(504,'生成等待超时或已取消');
   const upstream=await fetchImpl(config.baseURL.replace(/\/$/,'')+'/'+request.path,{method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json'},body:JSON.stringify(request.body),signal:controller.signal});
   const requestId=upstream.headers.get('x-request-id')||upstream.headers.get('request-id')||undefined;
   if(!upstream.ok){
    // Never echo upstream errors, which can contain credentials or reference data.
    const messages={400:'生图服务不接受当前参数或模型，请检查网关模型配置',401:'生图服务鉴权失败，请检查服务端密钥',403:'当前密钥没有该生图模型的访问权限',404:'网关未找到指定生图模型或接口',429:'生图服务额度不足或请求过于频繁，请稍后重试'};
    await upstream.body?.cancel();throw Object.assign(error(upstream.status===429?429:502,messages[upstream.status]||'生图服务暂时不可用，请稍后重试'),{requestId});
   }
   const data=await upstream.json();const encoded=data?.data?.[0]?.b64_json;
   if(typeof encoded!=='string'||encoded.length>36*1024*1024||!encoded.length)throw error(502,'生图服务未返回有效图片，请重试');
   const imageBytes=Buffer.from(encoded,'base64');let mime;
   if(imageBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
   else if(imageBytes[0]===255&&imageBytes[1]===216)mime='image/jpeg';
   else if(imageBytes.toString('ascii',0,4)==='RIFF'&&imageBytes.toString('ascii',8,12)==='WEBP')mime='image/webp';
   else throw error(502,'生图服务返回了无法识别的图片');
   return {image:`data:${mime};base64,${encoded}`,requestId};
   }
   const result=await requestImage(request);
   send(200,{...result,model:MODEL,generationRevision,requestIds:[result.requestId].filter(Boolean)});
  }catch(e){send(e.status|| (controller.signal.aborted?504:502),{error:e.status?e.message:controller.signal.aborted?'生成等待超时或已取消；不会自动重复提交，请稍后手动重试':'无法连接生图服务，请检查网络后重试',...(e.requestId?{requestId:e.requestId}:{})});}
  finally{clearTimeout(timer);res.off('close',closed);active--;}
 };
}
