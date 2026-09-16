import {generateAIWrap,applyAIResult,recomposeAIResult,type AIResult} from '../data/aiWrap';
import {useEffect,useRef,useState} from 'react';
import {wrapFaces,newArtwork,type DIYWrap,type WrapFace,type FaceArtwork} from '../data/diy';
import {getImage,storeImage} from '../data/imageStore';
import {drawArtwork} from '../viewer/diyAtlas';
type Props={value:DIYWrap;face:WrapFace;onFace:(face:WrapFace)=>void;onChange:(value:DIYWrap)=>void;mode:'diy'|'ai';onMode:(mode:'diy'|'ai')=>void;onNotice:(message:string)=>void;};
function ImageThumbnail({id,alt='参考元素'}:{id:string;alt?:string}){
 const [url,setURL]=useState('');
 useEffect(()=>{let dead=false,objectURL='';getImage(id).then(blob=>{if(!dead){objectURL=URL.createObjectURL(blob);setURL(objectURL);}},()=>{});return()=>{dead=true;URL.revokeObjectURL(objectURL);};},[id]);
 return url?<img src={url} alt={alt}/>:<span>图片不可用</span>;
}
type AIDraft={references:string[];result?:AIResult};
function readAIDraft():AIDraft{try{const v=JSON.parse(localStorage.getItem('zan-ai-draft')||'null');const r=v?.result;const validResult=r&&typeof r.assetId==='string'&&/^image-[a-z0-9-]+$/i.test(r.assetId)&&['whole','face'].includes(r.scope)&&wrapFaces.some(f=>f.id===r.face)&&/^#[a-f0-9]{6}$/i.test(r.baseColor);return {...(validResult?{result:r}:{}),references:Array.isArray(v?.references)?v.references.filter((id:unknown)=>typeof id==='string'&&/^image-[a-z0-9-]+$/i.test(id)).slice(0,6):[]};}catch{return {references:[]};}}
export function DIYEditor({value,face,onFace,onChange,mode,onMode,onNotice}:Props){
 const referenceInput=useRef<HTMLInputElement>(null);
 const [dragging,setDragging]=useState(false);
 const generation=useRef<AbortController|null>(null);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current?.abort();};},[]);
 const canvas=useRef<HTMLCanvasElement>(null),input=useRef<HTMLInputElement>(null),bitmap=useRef<ImageBitmap|null>(null);
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[ai,setAI]=useState(readAIDraft);
 const [generating,setGenerating]=useState(false),[aiError,setAIError]=useState(''),[elapsed,setElapsed]=useState(0),[configured,setConfigured]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;fetch('/api/ai-wrap/status').then(r=>r.json()).then(v=>{if(active)setConfigured(v.configured===true);}).catch(()=>{if(active)setConfigured(false);});return()=>{active=false;};},[]);
 useEffect(()=>{if(!generating)return;const start=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.round((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[generating]);
 const active=wrapFaces.find(f=>f.id===face)!,art=value.faces[face];
 const drag=useRef<{x:number;y:number;offsetX:number;offsetY:number}|null>(null);
 useEffect(()=>{let dead=false;bitmap.current?.close();bitmap.current=null;setRevision(v=>v+1);
  if(art)getImage(art.assetId).then(createImageBitmap).then(image=>{if(dead){image.close();return;}bitmap.current=image;setRevision(v=>v+1);}).catch(error=>{if(!dead)onNotice(error.message);});
  return()=>{dead=true;bitmap.current?.close();bitmap.current=null;};
 },[art?.assetId,onNotice]);
 useEffect(()=>{const el=canvas.current;if(!el)return;el.width=720;el.height=Math.round(720/active.aspect);const ctx=el.getContext('2d')!;ctx.fillStyle=value.baseColor;ctx.fillRect(0,0,el.width,el.height);if(bitmap.current&&art)drawArtwork(ctx,bitmap.current,art,el.width,el.height);},[active,value.baseColor,art,revision,mode]);
 useEffect(()=>{try{localStorage.setItem('zan-ai-draft',JSON.stringify(ai));}catch{onNotice('AI 草稿未能保存，本次编辑仍可继续');}},[ai,onNotice]);
 function changeArt(patch:Partial<FaceArtwork>){if(value.source!=='ai'&&art)onChange({...value,faces:{...value.faces,[face]:{...art,...patch}}});}
 async function upload(file:File|undefined){if(!file||value.source==='ai')return;const target=face;setBusy(true);try{const assetId=await storeImage(file);if(!mounted.current)return;onChange({...value,faces:{...value.faces,[target]:newArtwork(assetId)}});onNotice('图片已添加，可拖动和缩放调整');}catch(error){onNotice(error instanceof Error?error.message:'上传失败');}finally{setBusy(false);if(input.current)input.current.value='';}}
 async function addReferences(files:FileList|File[]|null){if(!files)return;const remaining=6-ai.references.length;if(files.length>remaining){onNotice('最多上传 6 张参考元素');return;}setBusy(true);const ids:string[]=[];try{for(const file of Array.from(files))ids.push(await storeImage(file));}catch(error){onNotice(error instanceof Error?error.message:'参考图读取失败');}finally{if(ids.length)setAI(a=>({...a,references:[...a.references,...ids]}));setBusy(false);}}
 async function generate(){
  if(generation.current)return;
  const controller=new AbortController();generation.current=controller;setGenerating(true);setAIError('');
  const timeout=setTimeout(()=>controller.abort(),630000);
  try{const result=await generateAIWrap({baseColor:value.baseColor,scope:'whole',face:'left',references:ai.references},controller.signal);if(!mounted.current||controller.signal.aborted)return;const next=await applyAIResult(result,value);if(mounted.current&&!controller.signal.aborted){setAI(a=>({...a,result}));onChange(next);onNotice('AI 车衣已自动应用到整车');}}
  catch(error){if(mounted.current)setAIError(controller.signal.aborted?'已停止等待，不会自动重复提交。':error instanceof Error?error.message:'生成失败，请稍后重试');}
  finally{clearTimeout(timeout);generation.current=null;if(mounted.current)setGenerating(false);}
 }
 async function recompose(){
  if(!ai.result||busy||generating)return;
  setBusy(true);setAIError('');
  try{const result=await recomposeAIResult(ai.result);const next=await applyAIResult(result,value);if(!mounted.current)return;setAI(a=>({...a,result}));onChange(next);onNotice('已清理杂点并重新排版，无需重新生图');}
  catch(error){if(mounted.current)setAIError(error instanceof Error?error.message:'重新排版失败');}
  finally{if(mounted.current)setBusy(false);}
 }
 if(mode==='diy'&&value.source==='ai')return <section className="diy-editor"><h2>AI 车衣不可进行 DIY 调整</h2><p className="livery-hint">可返回 AI 车衣重新生成，或开始一份新的 DIY 设计。</p><div className="diy-actions"><button onClick={()=>onMode('ai')}>返回 AI 车衣</button><button onClick={()=>onChange({baseColor:value.baseColor,faces:{}})}>开始新的 DIY 设计</button></div></section>;
 return <section className="diy-editor" aria-label={mode==='ai'?'AI 车衣工作台':'DIY 车衣编辑器'}>
  <div className="section-heading"><h2>{mode==='ai'?'AI 车衣灵感':'自定义车衣'}</h2><span>本机保存</span></div>
  <label className="diy-base">车衣底色<input aria-label="自定义底色" type="color" disabled={busy||generating} value={value.baseColor} onChange={e=>onChange({...value,baseColor:e.target.value})}/><span>{value.baseColor.toUpperCase()}</span></label>
  {mode==='diy'&&<div className="diy-faces" role="group" aria-label="车身分面">{wrapFaces.map(f=><button disabled={busy||generating} key={f.id} aria-pressed={face===f.id} onClick={()=>onFace(f.id)}>{f.name}{value.faces[f.id]&&<i aria-label="已添加图案">●</i>}</button>)}</div>}
  <input ref={input} hidden aria-label="上传当前面图案" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||generating} onChange={e=>void upload(e.target.files?.[0])}/>
  {mode==='ai'?<>
   <p className="livery-hint">用喜欢的元素，设计一套属于你的整车车衣。</p>
   <div className={`reference-uploader${dragging?' is-dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy&&!generating)setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy&&!generating)void addReferences(Array.from(e.dataTransfer.files));}}>
    <div className="reference-heading"><strong>参考元素</strong><span>{ai.references.length} / 6</span></div>
    <input ref={referenceInput} hidden aria-label="上传 AI 参考元素" disabled={busy||generating||ai.references.length>=6} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{void addReferences(e.target.files);e.currentTarget.value='';}}/>
    <div className={ai.references.length?'reference-grid':'reference-empty'}>
     {ai.references.map((id,i)=><div className="reference-tile" key={id}><ImageThumbnail id={id}/><span className="reference-number">{String(i+1).padStart(2,'0')}</span><button className="reference-remove" disabled={busy||generating} aria-label={`移除参考图 ${i+1}`} onClick={()=>setAI(a=>({...a,references:a.references.filter(x=>x!==id)}))}>×</button></div>)}
     {ai.references.length<6&&<button className="reference-add" disabled={busy||generating} onClick={()=>referenceInput.current?.click()}><span className="reference-add-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M18 2v6m-3-3h6M3 16l5-5 7 7 3-3 3 3"/><circle cx="9" cy="7" r="1"/></svg></span><strong>{busy?'正在添加…':ai.references.length?'继续添加':'添加参考图片'}</strong>{!ai.references.length&&<small>角色、图形或配色 · 点击或拖入</small>}</button>}
    </div>
    <p className="reference-help">PNG / JPG / WebP · 单张 ≤ 12 MB</p>
   </div>

   <button className="ai-generate primary" disabled={busy||generating||!ai.references.length||configured!==true} onClick={()=>void generate()}>{generating?`正在生成 · ${elapsed}s`:configured===null?'正在连接生图服务…':configured===false?'生图服务未配置':!ai.references.length?'添加参考图片后生成':'生成车衣设计'}</button>
   <p className="livery-hint">根据参考元素生成整车车衣设计。</p>
   {generating&&<div className="ai-progress" role="status"><p>正在生成车衣设计，请稍候。</p><button onClick={()=>generation.current?.abort()}>取消等待</button></div>}
   {aiError&&<p className="ai-error" role="alert">{aiError}</p>}
   {import.meta.env.DEV&&ai.result&&<div className="ai-result"><div className="section-heading"><h2>生成贴图</h2><span>仅开发模式</span></div><ImageThumbnail id={ai.result.assetId} alt="排入安全区后的整车透明车衣贴图"/><p className="livery-hint">{ai.result.sourceAssetId?'程序排版结果：图案完整放入安全区，透明处显示车身底色。':'历史生成贴图，重新生成后使用透明安全区排版。'}</p>{ai.result.sourceAssetId&&<button disabled={busy||generating} onClick={()=>void recompose()}>{busy?'正在排版…':'重新排版并应用'}</button>}{ai.result.sourceAssetId&&<details><summary>查看 AI 原始透明素材</summary><ImageThumbnail id={ai.result.sourceAssetId} alt="AI 原始透明素材"/></details>}</div>}
  </>:<>
   <div className="diy-preview"><canvas ref={canvas} aria-label={`${active.name}图案编辑画布`} style={{aspectRatio:String(active.aspect)}} onPointerDown={e=>{if(!art||busy)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,offsetX:art.x,offsetY:art.y};}} onPointerMove={e=>{if(!drag.current)return;const box=e.currentTarget.getBoundingClientRect();changeArt({x:Math.max(-1,Math.min(1,drag.current.offsetX+(e.clientX-drag.current.x)/box.width)),y:Math.max(-1,Math.min(1,drag.current.offsetY+(e.clientY-drag.current.y)/box.height))});}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}/>{!art&&<span>为{active.name}添加一张图案</span>}</div>
   <div className="diy-actions"><button disabled={busy||generating} onClick={()=>input.current?.click()}>{busy?'正在处理…':art?'替换图片':'上传图案'}</button>{art&&<button disabled={busy||generating} onClick={()=>{const faces={...value.faces};delete faces[face];onChange({...value,faces});}}>移除图案</button>}</div>
   <p className="livery-hint">PNG / JPG / WebP，单张不超过 12 MB。透明区域显示底色；拖动画布调整位置。</p>
   {art&&<div className="diy-controls">{[{key:'scale',name:'缩放',min:.1,max:4,step:.01},{key:'rotation',name:'旋转',min:-180,max:180,step:1},{key:'x',name:'水平位置',min:-1,max:1,step:.01},{key:'y',name:'垂直位置',min:-1,max:1,step:.01},{key:'opacity',name:'不透明度',min:0,max:1,step:.01}].map(c=><label key={c.key}>{c.name}<input disabled={busy||generating} aria-label={c.name} type="range" min={c.min} max={c.max} step={c.step} value={art[c.key as keyof Omit<FaceArtwork,'assetId'>]} onChange={e=>changeArt({[c.key]:Number(e.target.value)})}/><output>{c.key==='rotation'?`${art.rotation}°`:`${Math.round(art[c.key as keyof Omit<FaceArtwork,'assetId'>]*100)}%`}</output></label>)}<div className="diy-actions"><button disabled={busy||generating} onClick={()=>changeArt(newArtwork(art.assetId))}>重置位置</button>{(face==='left'||face==='right')&&<button disabled={busy||generating} onClick={()=>onChange({...value,faces:{...value.faces,[face==='left'?'right':'left']:{...art}}})}>复制到另一侧</button>}</div></div>}
   <p className="livery-hint">切换部位可查看对应视角。曲面接缝以 3D 预览为准，车窗、灯具与轮胎保持原样。</p>
  </>}
 </section>;
}
