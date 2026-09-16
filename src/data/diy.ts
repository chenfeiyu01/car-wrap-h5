export const wrapFaces = [
 {id:'left',name:'左侧',aspect:3}, {id:'right',name:'右侧',aspect:3},
 {id:'hood',name:'引擎盖',aspect:1.4}, {id:'roof',name:'车顶',aspect:1.2},
 {id:'trunk',name:'尾厢',aspect:2}, {id:'front',name:'前保险杠',aspect:2.4},
 {id:'rear',name:'后保险杠',aspect:2.4},
] as const;
export type WrapFace=typeof wrapFaces[number]['id'];
export type FaceArtwork={assetId:string;scale:number;x:number;y:number;rotation:number;opacity:number};
export type DIYWrap={source?:'ai';baseColor:string;faces:Partial<Record<WrapFace,FaceArtwork>>};
export const emptyDIY=():DIYWrap=>({baseColor:'#E8EBF1',faces:{}});
export const newArtwork=(assetId:string):FaceArtwork=>({assetId,scale:1,x:0,y:0,rotation:0,opacity:1});
export function parseDIY(value:unknown):DIYWrap|undefined {
 if(!value||typeof value!=='object')return;
 const v=value as Record<string,unknown>;
 if(typeof v.baseColor!=='string'||!/^#[0-9a-f]{6}$/i.test(v.baseColor)||!v.faces||typeof v.faces!=='object')return;
 const faces:DIYWrap['faces']={};
 for(const {id} of wrapFaces){
  const raw=(v.faces as Record<string,unknown>)[id];if(raw===undefined)continue;
  if(!raw||typeof raw!=='object')return;const a=raw as Record<string,unknown>;
  if(typeof a.assetId!=='string'||!/^image-[a-z0-9-]{1,80}$/i.test(a.assetId))return;
  for(const [key,min,max] of [['scale',.1,4],['x',-1,1],['y',-1,1],['rotation',-180,180],['opacity',0,1]] as const){
   if(typeof a[key]!=='number'||!Number.isFinite(a[key])||(a[key] as number)<min||(a[key] as number)>max)return;
  }
  faces[id]={assetId:a.assetId,scale:a.scale as number,x:a.x as number,y:a.y as number,rotation:a.rotation as number,opacity:a.opacity as number};
 }
 return {baseColor:v.baseColor,faces,...(v.source==='ai'?{source:'ai' as const}:{})};
}
