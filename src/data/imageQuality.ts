export const generatedImageSize=2048;
export function textureTileSize(maxTextureSize:number){
 // 4 columns, 2 rows. 64 MiB RGBA on normal devices; fit smaller GPU limits.
 const width=Math.min(2048,2**Math.floor(Math.log2(Math.max(4,maxTextureSize)/4)));
 return {width,height:width/2};
}
export function faceRasterSize(sourceWidth:number,sourceHeight:number,aspect:number){
 // Match physical aspect without reducing either source dimension.
 const height=Math.ceil(Math.max(sourceHeight,sourceWidth/aspect));
 return {width:Math.ceil(height*aspect),height};
}
