import type {DIYWrap,WrapFace} from '../data/diy';
import {useEffect,useRef,useState} from 'react';
import {VehicleScene,type Finish,type SceneState} from '../viewer/VehicleScene';
import {environments,type EnvironmentId,type LiveryId,type AccentId,type vehicles,type WheelId} from '../data/config';
import type {EnvironmentState} from '../viewer/environments';
type Props={wheelId:WheelId;diy?:DIYWrap;diyFace?:WrapFace;inset:number;immersive:boolean;onFullscreen:()=>void;onExit:()=>void;liveryId:LiveryId;accentId:AccentId;environmentId:EnvironmentId;vehicle:typeof vehicles[number];color:string;finish:Finish;captureRef:React.RefObject<(()=>Promise<string>)|null>;onReady:(value:boolean)=>void};
export function Viewer({wheelId,diy,diyFace,inset,immersive,onFullscreen,onExit,liveryId,accentId,environmentId,vehicle,color,finish,captureRef,onReady}:Props){
 const [environmentState,setEnvironmentState]=useState<EnvironmentState>({status:'loading',message:''}),[environmentRetry,setEnvironmentRetry]=useState(0);
 const [liveryState,setLiveryState]=useState<{status:'loading'|'ready'|'error';message:string}>({status:'loading',message:''}),[liveryRetry,setLiveryRetry]=useState(0);
 const [wheelState,setWheelState]=useState<{status:'loading'|'ready'|'error';message:string}>({status:'ready',message:''});
 const [wheelRetry,setWheelRetry]=useState(0);
 const [entered,setEntered]=useState(false);
 const host=useRef<HTMLDivElement>(null),scene=useRef<VehicleScene|null>(null);
 const [state,setState]=useState<SceneState>({status:'loading',message:'准备 3D 展厅…'}),[retry,setRetry]=useState(0),[quality,setQuality]=useState('balanced');
 useEffect(()=>{try{scene.current=new VehicleScene(host.current!,setState);captureRef.current=()=>scene.current!.capture();}catch{setState({status:'error',message:'当前设备无法开启 3D，请更换支持 WebGL 2 的浏览器'});}
 return()=>{scene.current?.dispose();scene.current=null;captureRef.current=null;};},[retry,captureRef]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>scene.current?.reset());return()=>cancelAnimationFrame(frame);},[immersive]);
 useEffect(()=>{scene.current?.setViewportInset(inset);},[inset,retry]);
 useEffect(()=>{scene.current?.setPaint(color,finish);},[color,finish,retry]);
 useEffect(()=>{void scene.current?.load(vehicle.file,vehicle.id);},[vehicle,retry]);
 useEffect(()=>{scene.current?.setQuality(quality);},[quality,retry]);
 useEffect(()=>{void scene.current?.setEnvironment(environmentId,setEnvironmentState);},[environmentId,environmentRetry,retry]);
 useEffect(()=>{let active=true;setLiveryState({status:'loading',message:liveryId==='custom'?'正在更新车衣…':''});const timer=setTimeout(()=>void scene.current?.setLivery(liveryId,accentId,state=>{if(active)setLiveryState(state);},diy),liveryId==='custom'?100:0);return()=>{active=false;clearTimeout(timer);};},[liveryId,accentId,liveryRetry,retry,diy]);
 useEffect(()=>{if(diyFace&&liveryId==='custom'&&state.status==='ready')scene.current?.focusWrapFace(diyFace);},[diyFace,liveryId,state.status]);
 useEffect(()=>{void scene.current?.setWheels(wheelId,setWheelState);},[wheelId,wheelRetry,retry]);
 const allReady=wheelState.status==='ready'&&state.status==='ready'&&environmentState.status==='ready'&&liveryState.status==='ready';
 const progress=Math.round((state.status==='ready'?70:(state.progress??0)*70/100)+(environmentState.status==='ready'?20:0)+(liveryState.status==='ready'?10:0));
 useEffect(()=>{onReady(allReady);if(allReady){const frame=requestAnimationFrame(()=>setEntered(true));return()=>cancelAnimationFrame(frame);}},[allReady,onReady]);
 return <section className={"viewer"+(immersive?" immersive-view":"")} aria-label="车辆展示"><div ref={host} className="canvas-host"/>
 {immersive?<button className="exit-fullscreen" aria-label="退出全屏" onClick={onExit}>×</button>:<button className="enter-fullscreen" onClick={onFullscreen}>全屏查看 ↗</button>}
 {liveryId!=='none'&&<button className="livery-view" onClick={()=>scene.current?.focusLiverySide()}>切换左右侧视</button>}
 <span className="demo-label">{environments.find(e=>e.id===environmentId)?.name} · 实时渲染</span>
 {environmentState.status!=='ready'&&<div className="environment-status" role="status">{environmentState.message}{environmentState.status==='error'&&<button onClick={()=>setEnvironmentRetry(x=>x+1)}>重试环境</button>}</div>}
 {wheelState.status!=='ready'&&<div className="wheel-status" role="status">{wheelState.message}{wheelState.status==='error'&&<button onClick={()=>setWheelRetry(x=>x+1)}>重试轮组</button>}</div>}
 {liveryState.status!=='ready'&&<div className="livery-status" role="status">{liveryState.message}{liveryState.status==='error'&&<button onClick={()=>setLiveryRetry(x=>x+1)}>重试涂装</button>}</div>}
 {(!entered||state.status!=='ready')&&<div className="viewer-state" role="status"><strong className="loading-brand"><span className="brand-logo"><img src="/brand/zan-cheda.png" alt="Zan 车搭"/></span></strong><p>{state.message||environmentState.message||liveryState.message||'准备完成'}</p><progress aria-label="资源加载进度" max={100} value={progress}/><small>{progress}% · 车身 / 环境 / 涂装</small>{state.status==='error'&&<button onClick={()=>setRetry(x=>x+1)}>重新加载</button>}</div>}
 {immersive&&<div className="rotate-prompt" role="status"><span>▯ ↻</span><strong>请将手机横过来</strong><p>若未自动横屏，请关闭系统竖屏锁定后转动手机。</p></div>}
 <div className="viewer-tools"><button aria-label="重置视角" onClick={()=>scene.current?.reset()}><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-3-6M17 2v5h-5"/></svg><span>重置视角</span></button><button aria-label="切换画质" onClick={()=>setQuality(x=>x==='balanced'?'low':'balanced')}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="15" rx="2"/><path d="M7 9v5m4-5v5M7 11.5h4m4-2.5h2v5h-2"/></svg><span>{quality==='balanced'?'高清画质':'省电画质'}</span></button></div>
 </section>;
}
