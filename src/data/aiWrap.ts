import {composeTransparentWrap} from './transparentWrap';
import {generatedImageSize,faceRasterSize} from './imageQuality';
import {generationRevision} from './wrapPlacement';
import {aiLayout,atlasWidth,atlasHeight,legacyAILayout,layoutVersion,templateSVG} from './aiLayout';
import {getImage,storeImage} from './imageStore';
import {wrapFaces,newArtwork,type DIYWrap,type WrapFace} from './diy';
export type AIScope='face'|'whole';
export type AIResult={assetId:string;scope:AIScope;face:WrapFace;baseColor:string;layoutVersion?:string;requestId?:string;sourceAssetId?:string};
export async function imageDataURL(id:string){const blob=await getImage(id);return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('读取参考图失败'));reader.readAsDataURL(blob);});}
export async function atlasTemplate(baseColor:string){
 const url=URL.createObjectURL(new Blob([templateSVG(baseColor)],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=generatedImageSize;canvas.height=generatedImageSize;canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}
export async function generateAIWrap(input:{baseColor:string;scope:AIScope;face:WrapFace;references:string[]},signal:AbortSignal):Promise<AIResult>{
 const references=await Promise.all(input.references.map(imageDataURL));
 const response=await fetch('/api/ai-wrap/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Zan-Request':'1'},body:JSON.stringify({...input,references,layoutVersion}),signal});
 let result;try{result=await response.json();}catch{throw new Error('生图接口未返回有效结果，请检查本地服务是否已启动');}
 if(!response.ok)throw new Error(result.error||'生图失败，请稍后重试');
 if(typeof result.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(result.image))throw new Error('未收到有效图片');
 if(result.generationRevision!==generationRevision)throw new Error('生图服务版本未更新，请重启本地服务后再试');
 const blob=await (await fetch(result.image)).blob();
 const composed=await composeTransparentWrap(blob);
 const sourceAssetId=await storeImage(new File([blob],'ai-source.png',{type:blob.type}),{preserveResolution:true});
 const assetId=await storeImage(new File([composed],'ai-wrap.png',{type:'image/png'}),{preserveResolution:true});
 return {assetId,sourceAssetId,layoutVersion,scope:input.scope,face:input.face,baseColor:input.baseColor,...(result.requestId?{requestId:result.requestId}:{})};
}
export async function applyAIResult(result:AIResult,current:DIYWrap):Promise<DIYWrap>{
 if(result.scope==='face')return {...current,source:'ai',baseColor:result.baseColor,faces:{...current.faces,[result.face]:newArtwork(result.assetId)}};
 const bitmap=await createImageBitmap(await getImage(result.assetId));
 try{
  const faces:DIYWrap['faces']={};
  const regions=result.layoutVersion===layoutVersion?aiLayout:legacyAILayout;
  const sourceWidth=result.layoutVersion===layoutVersion?atlasWidth:1536,sourceHeight=1024;
  for(const region of regions){
   const face=wrapFaces.find(f=>f.id===region.id)!;
   const canvas=document.createElement('canvas');const dimensions=faceRasterSize(region.width/sourceWidth*bitmap.width,region.height/sourceHeight*bitmap.height,face.aspect);canvas.width=dimensions.width;canvas.height=dimensions.height;
   canvas.getContext('2d')!.drawImage(bitmap,region.x/sourceWidth*bitmap.width,region.y/sourceHeight*bitmap.height,region.width/sourceWidth*bitmap.width,region.height/sourceHeight*bitmap.height,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('拆分车衣贴图失败')),'image/png'));
   faces[face.id]=newArtwork(await storeImage(new File([blob],`${face.id}.png`,{type:'image/png'}),{preserveResolution:true}));
  }
  return {baseColor:result.baseColor,faces,source:'ai'};
 }finally{bitmap.close();}
}

/** Reuse the saved original; no additional image-generation request. */
export async function recomposeAIResult(result:AIResult):Promise<AIResult>{
 if(!result.sourceAssetId)throw new Error('这份历史结果没有保存透明原图，请重新生成');
 const blob=await composeTransparentWrap(await getImage(result.sourceAssetId));
 const assetId=await storeImage(new File([blob],'ai-wrap.png',{type:'image/png'}),{preserveResolution:true});
 return {...result,assetId};
}
