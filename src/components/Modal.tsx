import {useEffect,useRef,type ReactNode} from 'react';
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
 return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-heading"><h2>{title}</h2><button aria-label="关闭" onClick={onClose}>关闭</button></div>{children}</dialog>;
}
