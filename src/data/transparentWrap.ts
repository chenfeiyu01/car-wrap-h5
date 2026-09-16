import {aiLayout,atlasWidth,atlasHeight} from './aiLayout.ts';
import {sideSubjectZone,hoodSubjectZone} from './wrapPlacement.ts';
import {wrapFaces} from './diy.ts';
import {generatedImageSize} from './imageQuality.ts';
export type Rect={x:number;y:number;width:number;height:number};
/** Remove isolated alpha noise in place; retain substantial components and nearby fine details. */
export function transparentBounds(data:Uint8ClampedArray,width:number,height:number):Rect{
 const count=width*height;let clear=0;
 for(let i=0;i<count;i++)if(data[i*4+3]===0)clear++;
 if(clear<count*.05)throw new Error('AI 未返回有效透明背景，未替换现有车衣，请重新生成');
 const labels=new Int32Array(count),queue=new Int32Array(count);
 const groups:{area:number;strong:number;x:number;y:number;right:number;bottom:number}[]=[];
 for(let start=0;start<count;start++){
  if(labels[start]||data[start*4+3]<8)continue;
  const id=groups.length+1;let head=0,tail=1;queue[0]=start;labels[start]=id;
  const g={area:0,strong:0,x:width,y:height,right:0,bottom:0};
  while(head<tail){
   const pos=queue[head++],x=pos%width,y=Math.floor(pos/width);
   g.area++;if(data[pos*4+3]>=32)g.strong++;
   g.x=Math.min(g.x,x);g.y=Math.min(g.y,y);g.right=Math.max(g.right,x);g.bottom=Math.max(g.bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
    const n=ny*width+nx;if(!labels[n]&&data[n*4+3]>=8){labels[n]=id;queue[tail++]=n;}
   }
  }
  groups.push(g);
 }
 const largest=groups.reduce((n,g)=>Math.max(n,g.strong),0);
 if(largest<4)throw new Error('AI 返回了空白或无法识别的透明图，未替换现有车衣，请重新生成');
 const threshold=Math.max(4,largest*.005);
 const anchors=groups.filter(g=>g.strong>=threshold);
 const reach=Math.max(2,Math.min(width,height)*.008);
 const keep=groups.map(g=>g.strong>=threshold||anchors.some(a=>
  Math.max(0,a.x-g.right,g.x-a.right)<=reach&&Math.max(0,a.y-g.bottom,g.y-a.bottom)<=reach));
 let left=width,top=height,right=-1,bottom=-1;
 for(let i=0;i<count;i++){
  const id=labels[i];
  if(!id||!keep[id-1]){data[i*4+3]=0;continue;}
  const x=i%width,y=Math.floor(i/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
/** Fit every visible pixel, with a small inset for texture filtering. Never crop. */
export function containArtwork(source:Rect,target:Rect):Rect{
 const inset=Math.min(target.width,target.height)*.025;
 const scale=Math.min((target.width-2*inset)/source.width,(target.height-2*inset)/source.height);
 const width=source.width*scale,height=source.height*scale;
 return {x:target.x+(target.width-width)/2,y:target.y+(target.height-height)/2,width,height};
}
export async function composeTransparentWrap(blob:Blob):Promise<Blob>{
 const image=await createImageBitmap(blob);
 try{
  if(image.width*image.height>32*1024*1024)throw new Error('生成图片尺寸过大');
  const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
  const scan=source.getContext('2d',{willReadFrequently:true})!;scan.drawImage(image,0,0);
  const pixels=scan.getImageData(0,0,image.width,image.height);
  const bounds=transparentBounds(pixels.data,image.width,image.height);
  scan.putImageData(pixels,0,0);
  const atlas=document.createElement('canvas');atlas.width=generatedImageSize;atlas.height=generatedImageSize;
  const ctx=atlas.getContext('2d')!;
  for(const region of aiLayout){
   const zone=region.id==='left'||region.id==='right'?sideSubjectZone:region.id==='hood'?hoodSubjectZone:null;
   if(!zone)continue;
   // Fit using the same face aspect as the importer and renderer, not the packed atlas ratio.
   const aspect=wrapFaces.find(f=>f.id===region.id)!.aspect;
   const placed=containArtwork(bounds,{x:zone.x*aspect,y:zone.y,width:zone.width*aspect,height:zone.height});
   const sx=atlas.width/atlasWidth,sy=atlas.height/atlasHeight;
   ctx.drawImage(source,bounds.x,bounds.y,bounds.width,bounds.height,
    (region.x+placed.x/aspect*region.width)*sx,(region.y+placed.y*region.height)*sy,
    placed.width/aspect*region.width*sx,placed.height*region.height*sy);
  }
  return await new Promise<Blob>((resolve,reject)=>atlas.toBlob(b=>b?resolve(b):reject(new Error('透明车衣排版失败')),'image/png'));
 }finally{image.close();}
}
