import {Box3,MathUtils,Mesh,Object3D,Vector3} from 'three';

export function framingPoints(model:Object3D){
 let vertexCount=0;
 model.traverse(object=>{if(object instanceof Mesh)vertexCount+=object.geometry.getAttribute('position')?.count??0;});
 const stride=Math.max(1,Math.floor(vertexCount/10000)),points:Vector3[]=[];
 model.updateWorldMatrix(true,true);
 model.traverse(object=>{if(object instanceof Mesh){const positions=object.geometry.getAttribute('position');if(!positions)return;for(let index=0;index<positions.count;index+=stride)points.push(new Vector3().fromBufferAttribute(positions,index).applyMatrix4(object.matrixWorld));}});
 return points;
}

export function vehicleFrame(bounds:Box3,fieldOfView:number,aspect:number,points?:Vector3[]){
 const size=bounds.getSize(new Vector3()),target=bounds.getCenter(new Vector3());
 target.y=bounds.min.y+size.y*.44;
 const direction=new Vector3(.62,.14,.78).normalize(),right=new Vector3().crossVectors(new Vector3(0,1,0),direction).normalize(),up=new Vector3().crossVectors(direction,right);
 const vertical=Math.tan(MathUtils.degToRad(fieldOfView/2)),horizontal=vertical*Math.max(.1,aspect);
 const corners:Vector3[]=[];
 if(!points?.length)for(const horizontalEdge of [bounds.min.x,bounds.max.x])for(const verticalEdge of [bounds.min.y,bounds.max.y])for(const depthEdge of [bounds.min.z,bounds.max.z])corners.push(new Vector3(horizontalEdge,verticalEdge,depthEdge));
 let distance=0,radius=0;const offset=new Vector3(),outline=points?.length?points:corners;
 for(const point of outline){
  offset.copy(point).sub(target);const depth=offset.dot(direction);
  distance=Math.max(distance,depth+Math.abs(offset.dot(right))/(horizontal*.9),depth+Math.abs(offset.dot(up))/(vertical*.76));
  radius=Math.max(radius,offset.length());
 }
 distance=Math.max(distance,radius/Math.sin(Math.atan(horizontal*.93)));
 return {target,position:target.clone().addScaledVector(direction,distance),distance};
}
