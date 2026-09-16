import {wrapFaces,type DIYWrap,type FaceArtwork} from '../data/diy';
import {getImage} from '../data/imageStore';
import {textureTileSize} from '../data/imageQuality';
export function drawArtwork(ctx:CanvasRenderingContext2D,image:CanvasImageSource & {width:number;height:number},a:FaceArtwork,width:number,height:number){
 const fit=Math.min(width/image.width,height/image.height)*a.scale;
 ctx.save();ctx.translate(width*(.5+a.x),height*(.5+a.y));ctx.rotate(a.rotation*Math.PI/180);ctx.globalAlpha=a.opacity;
 ctx.drawImage(image,-image.width*fit/2,-image.height*fit/2,image.width*fit,image.height*fit);ctx.restore();
}
export async function createDIYAtlas(wrap:DIYWrap,maxTextureSize=8192):Promise<HTMLCanvasElement>{
 const tile=textureTileSize(maxTextureSize);
 const canvas=document.createElement('canvas');canvas.width=tile.width*4;canvas.height=tile.height*2;
 const context=canvas.getContext('2d')!;
 // Sequential decoding keeps peak memory bounded on mobile.
 for(let i=0;i<wrapFaces.length;i++){
  const face=wrapFaces[i],art=wrap.faces[face.id];if(!art)continue;
  const bitmap=await createImageBitmap(await getImage(art.assetId));
  try{
   const virtualWidth=tile.height*face.aspect;
   context.save();context.translate((i%4)*tile.width,Math.floor(i/4)*tile.height);
   context.beginPath();context.rect(0,0,tile.width,tile.height);context.clip();
   context.scale(tile.width/virtualWidth,1);
   drawArtwork(context,bitmap,art,virtualWidth,tile.height);
   context.restore();
  }finally{bitmap.close();}
 }
 return canvas;
}
