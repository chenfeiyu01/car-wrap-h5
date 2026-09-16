import {sideSubjectZone,hoodSubjectZone} from './wrapPlacement.ts';
/** Shared by template, gateway prompt and importer. Coordinates follow the preset IP sheet. */
export const atlasWidth=1024,atlasHeight=1024;
export const layoutVersion='ip-atlas-v2';
export const aiLayout=[
 {id:'left',name:'左侧车身',x:16,y:8,width:808,height:232},
 {id:'right',name:'右侧车身',x:16,y:252,width:808,height:232},
 {id:'front',name:'前保险杠',x:16,y:496,width:488,height:192},
 {id:'rear',name:'后保险杠',x:516,y:496,width:488,height:192},
 {id:'hood',name:'引擎盖',x:20,y:704,width:232,height:304},
 {id:'roof',name:'车顶',x:280,y:744,width:448,height:224},
 {id:'trunk',name:'尾厢盖',x:768,y:704,width:232,height:304},
] as const;
export const reservedRegions=[
 {name:'底色色块',x:836,y:8,width:176,height:232},
 {name:'保留区域',x:836,y:252,width:176,height:232},
] as const;
export function placementGuide(r:typeof aiLayout[number]){
 const side=r.id==='left'||r.id==='right';
 const zone=side?sideSubjectZone:r.id==='hood'?hoodSubjectZone:null;
 if(!zone)return `<text x="${r.x+r.width/2}" y="${r.y+r.height*.65}" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#ffffff">仅背景 · 不画角色</text>`;
 const x=r.x+zone.x*r.width,y=r.y+zone.y*r.height,w=zone.width*r.width,h=zone.height*r.height;
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#00ff80" stroke="#087f43" stroke-width="6" stroke-dasharray="10 6"/><text x="${x+w/2}" y="${y+h-12}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#315b49">整只主体必须在框内</text>${side?`<text x="${r.x+12}" y="${r.y+24}" font-family="sans-serif" font-size="14" fill="#98663c">框外禁止角色：仅底色 / 细线</text>`:''}`;
}
export function templateSVG(baseColor='#e8e2d8'){
 const color=/^#[a-f0-9]{6}$/i.test(baseColor)?baseColor:'#e8e2d8';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#16181c"/>${aiLayout.map(r=>`<g><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${color}"/>${placementGuide(r)}<text x="${r.x+r.width/2}" y="${r.y+48}" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#252930">${r.name}</text><text x="${r.x+r.width/2}" y="${r.y+72}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#737984">${r.id==='hood'?'图案顶部朝上 ↑ · 正向设计':r.id.toUpperCase()+' · ↑ TOP'}</text></g>`).join('')}${reservedRegions.map(r=>`<g><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${color}"/><rect x="${r.x+8}" y="${r.y+r.height/2-24}" width="${r.width-16}" height="48" rx="8" fill="#ffffff"/><text x="${r.x+r.width/2}" y="${r.y+r.height/2+7}" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#252930">${r.name}</text></g>`).join('')}</svg>`;
}
/** Exact crop layout shared by the gateway prompt and browser texture importer. */

export const legacyAILayout=[
 {id:'left',name:'左侧',x:0,y:0,width:1536,height:256},
 {id:'right',name:'右侧',x:0,y:256,width:1536,height:256},
 {id:'hood',name:'引擎盖',x:0,y:512,width:512,height:256},
 {id:'roof',name:'车顶',x:512,y:512,width:512,height:256},
 {id:'trunk',name:'尾厢',x:1024,y:512,width:512,height:256},
 {id:'front',name:'前保险杠',x:0,y:768,width:768,height:256},
 {id:'rear',name:'后保险杠',x:768,y:768,width:768,height:256},
] as const;
