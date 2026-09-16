import {parseDIY,type DIYWrap} from './diy.ts';
export const wheelOptions=[{id:'original',name:'原厂轮组',file:''},{id:'wheel-1',name:'轮组一',file:'/models/wheel-1.glb'},{id:'wheel-2',name:'轮组二',file:'/models/wheel-2.glb'}] as const;
export type WheelId=typeof wheelOptions[number]['id'];
export const vehicles = [
  {id:'w206',name:'奔驰 C 级 · W206',file:'/models/mercedes-w206.glb',preview:''},
  {id:'car10',name:'保时捷 718 cayman GT4',file:'/models/car10-taillights.glb',preview:'/models/car10.png'},
  {id:'yu7',name:'小米 YU7',file:'/models/xiaomi-yu7.glb',preview:''},
  {id:'q50',name:'英菲尼迪 Q50 3.0t Luxe',file:'https://file.yzcdn.cn/upload_files/yz-file/2026/09/16/loVOikr8QfOaNi2Of23hr4ptAHXh.glb',preview:''},
] as const;
export const environments=[{id:'studio',name:'黑色影棚',detail:'轮廓高光 · 亮面地台'},{id:'gallery',name:'白色影棚',detail:'通透柔光 · 亮面地台'},{id:'sunset',name:'现代建筑广场',detail:'玻璃幕墙 · 铺装地面'},{id:'mountain',name:'开放试车场',detail:'柏油路面 · 开阔天光'}] as const;
export type EnvironmentId=typeof environments[number]['id'];
export const liveries=[{id:'custom',category:'custom',name:'自定义车衣',detail:'分面定制 · 本机图片'},{id:'youzan',category:'ip',name:'有赞 · 灵感涂鸦',detail:'专属配色 · 车身图案'},{id:'kirby',category:'ip',name:'卡比 · 糖果粉',detail:'专属配色 · 车身图案'},{id:'doraemon',category:'ip',name:'哆啦A梦 · 晴空蓝',detail:'专属配色 · 车身图案'},{id:'shinchan-blue',category:'ip',name:'小新 · 蓝色假日',detail:'专属配色 · 车身图案'},{id:'shinchan-mint',category:'ip',name:'小新 · 奶油薄荷',detail:'专属配色 · 车身图案'},{id:'pokemon-black',category:'ip',name:'宝可梦 · 黑色集结',detail:'专属配色 · 车身图案'},{id:'kirby-race',category:'ip',name:'卡比 · 赛车派对',detail:'专属配色 · 车身图案'},{id:'pokemon-yellow',category:'ip',name:'宝可梦 · 元气黄',detail:'专属配色 · 车身图案'},{id:'kitty',category:'ip',name:'Hello Kitty',detail:'奶油黄 · 红白引擎盖'},{id:'lotso',category:'ip',name:'草莓熊',detail:'莓果粉 · 双侧拉花'},{id:'labubu',category:'ip',name:'泡泡玛特',detail:'珊瑚粉 · 双侧图案'},{id:'kuromi',category:'ip',name:'酷洛米 · 粉黑',detail:'左右拉花 · 引擎盖图案'},{id:'none',category:'base',name:'纯色车身',detail:'保留当前膜色'},{id:'stripes',category:'line',name:'经典竞速',detail:'双条纹 · 引擎盖与车顶'},{id:'side',category:'line',name:'曜石线条',detail:'双侧拉花 · 极简运动'},{id:'retro',category:'line',name:'复古赛道',detail:'奶油白 · 橙蓝赛车图案'},{id:'flow',category:'line',name:'极光流线',detail:'紫蓝渐变 · 流动曲线'}] as const;
export type LiveryId=typeof liveries[number]['id'];
export const liveryAccents=[{id:'white',name:'珍珠白',hex:'#eeeeeb'},{id:'black',name:'曜石黑',hex:'#101319'},{id:'orange',name:'竞速橙',hex:'#ed5525'}] as const;
export type AccentId=typeof liveryAccents[number]['id'];
export type Configuration = {schemaVersion:1;wheelId:WheelId;vehicleId:string;colorId:string;finishId:string;environmentId:EnvironmentId;liveryId:LiveryId;accentId:AccentId;diy?:DIYWrap};
export const colorIds=['gem-green','titanium','golden-pink','pearl-white','cherry-red','volcano-gray','twilight-purple','capri-blue','obsidian-black','liquid-gunmetal'];
const legacyColors:Record<string,string>={'snow-white':'pearl-white','graphite-gray':'volcano-gray','silver':'titanium','racing-red':'cherry-red','orange':'cherry-red','lemon-yellow':'golden-pink','forest-green':'gem-green','jade-green':'gem-green','ocean-blue':'capri-blue','lavender':'twilight-purple','sand-beige':'titanium'};
export const finishIds=['gloss','matte','satin','metallic'];
export const initial:Configuration={schemaVersion:1,wheelId:'original',vehicleId:'car10',colorId:'capri-blue',finishId:'gloss',environmentId:'studio',liveryId:'none',accentId:'white'};
export function parseConfiguration(value:unknown):Configuration|null {
 if(!value || typeof value!=='object') return null;
 const v=value as Record<string,unknown>;
 const colorId=typeof v.colorId==='string'?(legacyColors[v.colorId]??v.colorId):v.colorId;
 if(v.schemaVersion!==1 || !vehicles.some(x=>x.id===v.vehicleId) || !colorIds.includes(colorId as string) || !finishIds.includes(v.finishId as string)) return null;
 const environmentId=v.environmentId==='workshop'?'studio':v.environmentId??'studio';
 if(!environments.some(e=>e.id===environmentId))return null;
 const liveryId=v.liveryId??'none',accentId=v.accentId??'white';
 if(!liveries.some(x=>x.id===liveryId)||!liveryAccents.some(x=>x.id===accentId))return null;
 const wheelId=v.wheelId??'original';if(!wheelOptions.some(w=>w.id===wheelId))return null;
 const diy=parseDIY(v.diy);if(liveryId==='custom'&&!diy)return null;
 return {wheelId:wheelId as WheelId,...(diy?{diy}:{}),liveryId:liveryId as LiveryId,accentId:accentId as AccentId,environmentId:environmentId as EnvironmentId,schemaVersion:1,vehicleId:v.vehicleId as string,colorId:colorId as string,finishId:v.finishId as string};
}
export type SavedDesign={id:string;createdAt:string;config:Configuration};
export const storageKey='car-wrap-designs-v1';
export function readDesigns():SavedDesign[]{
 try {const data:unknown=JSON.parse(localStorage.getItem(storageKey)||'[]');
 if(!Array.isArray(data))return [];
 return data.filter((x):x is SavedDesign=>!!x&&typeof x.id==='string'&&typeof x.createdAt==='string'&&Number.isFinite(Date.parse(x.createdAt))&&!!parseConfiguration(x.config)).slice(0,20).map(x=>({...x,config:parseConfiguration(x.config)!}));
 }catch{return [];}
}
export function initialConfiguration():Configuration{
 try{const p=new URLSearchParams(location.search);const shared=parseConfiguration({schemaVersion:1,wheelId:p.get('wheel')??'original',vehicleId:p.get('vehicle'),colorId:p.get('color'),finishId:p.get('finish'),environmentId:p.get('environment'),liveryId:p.get('livery'),accentId:p.get('accent')});if(shared)return shared;return parseConfiguration(JSON.parse(localStorage.getItem('car-wrap-current')||'null'))||initial;}catch{return initial;}
}
