let database:Promise<IDBDatabase>|undefined;
function db(){return database??=new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('zan-cheda-images',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('images');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=undefined;reject(new Error('无法打开本机图片存储'));};
});}
export async function getImage(id:string):Promise<Blob>{
 const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('images').objectStore('images').get(id);r.onsuccess=()=>r.result instanceof Blob?resolve(r.result):reject(new Error('本机图片已丢失，请重新上传'));r.onerror=()=>reject(new Error('读取图片失败'));});
}
export async function storeImage(file:File,options:{preserveResolution?:boolean}={}):Promise<string>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请上传 PNG、JPG 或 WebP 图片');
 if(file.size>(options.preserveResolution?32:12)*1024*1024)throw new Error(options.preserveResolution?'生成图片不能超过 32 MB':'单张图片不能超过 12 MB');
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('无法读取这张图片，请更换图片');});
 try{
  if(bitmap.width*bitmap.height>32000000)throw new Error('图片尺寸过大，请先缩小至 3200 万像素以内');
  let blob:Blob=file;
  if(!options.preserveResolution){
  const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
  blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片处理失败')),'image/png'));
  }
  const id='image-'+crypto.randomUUID(),database=await db();
  await new Promise<void>((resolve,reject)=>{const tx=database.transaction('images','readwrite');tx.objectStore('images').put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('图片存储空间不足，请释放浏览器空间后重试'));tx.onabort=()=>reject(new Error('图片未保存，请重试'));});
  return id;
 }finally{bitmap.close();}
}
