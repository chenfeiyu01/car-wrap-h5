import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createAIMiddleware} from './ai-wrap.mjs';
const root=resolve('dist'),api=createAIMiddleware();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.hdr':'application/octet-stream'};
const server=createServer((req,res)=>void api(req,res,async()=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const path=decodeURIComponent(new URL(req.url,'http://local').pathname);let file=resolve(root,'.'+path);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let info;try{info=await stat(file);}catch{if(extname(file)){res.writeHead(404);res.end();return;}}
  if(!info?.isFile()){file=resolve(root,'index.html');info=await stat(file);}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404);res.end('请先运行 npm run build');}
}));
server.requestTimeout=660000;
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('Zan 车搭服务已启动，端口 '+(process.env.PORT||4173)));
