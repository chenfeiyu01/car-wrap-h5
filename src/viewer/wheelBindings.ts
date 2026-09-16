import * as THREE from 'three';
// Explicit mesh inventory from the supplied models; never match interior steering wheels.
const car10Parts=new Set(["Studio_Car02_Mesh1013", "Studio_Car04_Mesh1011", "Studio_Car05_Mesh1010", "Studio_Car10_Mesh1005", "Studio_Car24_Mesh863", "Studio_Car25_Mesh853", "Studio_Car28_Mesh820", "Studio_Car33_Mesh769", "Studio_Car150_Mesh957", "Studio_Car151_Mesh956", "Studio_Car162_Mesh944", "Studio_Car164_Mesh942", "Studio_Car165_Mesh941", "Studio_Car166_Mesh940", "Studio_Car167_Mesh939", "Studio_Car170_Mesh937", "Studio_Car171_Mesh936", "Studio_Car172_Mesh935", "Studio_Car173_Mesh934", "Studio_Car176_Mesh931", "Studio_Car177_Mesh930", "Studio_Car178_Mesh929", "Studio_Car180_Mesh926", "Studio_Car182_Mesh924", "Studio_Car183_Mesh923", "Studio_Car184_Mesh922", "Studio_Car185_Mesh921", "Studio_Car304_Mesh795", "Studio_Car305_Mesh794", "Studio_Car312_Mesh786", "Studio_Car313_Mesh785", "Studio_Car314_Mesh784", "Studio_Car315_Mesh783", "Studio_Car317_Mesh782", "Studio_Car318_Mesh781", "Studio_Car342_Mesh756", "Studio_Car344_Mesh754", "Studio_Car345_Mesh753", "Studio_Car346_Mesh752", "Studio_Car347_Mesh751", "Studio_Car348_Mesh750", "Studio_Car349_Mesh749", "Studio_Car350_Mesh747", "Studio_Car351_Mesh746", "Studio_Car352_Mesh745", "Studio_Car355_Mesh742", "Studio_Car356_Mesh741", "wheelFtL001_tyre00001", "wheelFtL002_tyre00008", "wheelFtL003_tyre00004", "wheelFtL004_tyre00005"]);
const clean=(name:string)=>name.replace(/\./g,'');
export function wheelBindings(model:THREE.Object3D,vehicleId:string){
 const tires:THREE.Mesh[]=[],parts:THREE.Mesh[]=[],brakes:THREE.Object3D[]=[];
 model.updateWorldMatrix(true,true);
 model.traverse(o=>{
  if(o.userData.stockBrake)brakes.push(o);
  if(!(o instanceof THREE.Mesh))return;
  const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name);
  if(vehicleId==='w206'){
   if(materials.some(m=>m==='Tyre'||m==='Side wall'))tires.push(o);
   let parent:THREE.Object3D|null=o,slot=false;while(parent){if(parent.userData.wheelSlot)slot=true;parent=parent.parent;}
   if(slot){if(materials.every(m=>m.includes('Wheel Brake Disk')))brakes.push(o);else parts.push(o);}
  }else if(vehicleId==='car10'){
   if(materials.includes('tyre'))tires.push(o);
   if(car10Parts.has(clean(o.name)))parts.push(o);
   if(materials.some(m=>m==='BRAKE_Disk'||m==='caliper'))brakes.push(o);
  }else if(vehicleId==='yu7'){
   if(o.name.includes('carTyre_')){tires.push(o);parts.push(o);}
   else if(/carWheel(?:LogoFont|LogoBase|AirVent|Hub|Rim)_ACAL09/.test(o.name))parts.push(o);
   if(/car(?:BrakeDisc|Caliper)_/.test(o.name))brakes.push(o);
  }else if(vehicleId==='q50'){
   if(materials.includes('tire1'))tires.push(o);
   if(materials.some(m=>['tire1','LRim_c1','LRim_c2'].includes(m)))parts.push(o);
   if(materials.includes('disk')||o.name==='Mesh_2_MET_0')brakes.push(o);
  }
 });
 const inverse=new THREE.Matrix4().copy(model.matrixWorld).invert();
 const tireBounds=new THREE.Box3();for(const tire of tires)tireBounds.union(new THREE.Box3().setFromObject(tire).applyMatrix4(inverse));
 const center=tireBounds.getCenter(new THREE.Vector3()),boxes=Array.from({length:4},()=>new THREE.Box3());
 const point=new THREE.Vector3(),matrix=new THREE.Matrix4();
 // Q50 combines all four tires in one mesh, so derive four mounts from actual vertices.
 for(const tire of tires){matrix.multiplyMatrices(inverse,tire.matrixWorld);const positions=tire.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(matrix);boxes[(point.x>=center.x?2:0)+(point.z>=center.z?1:0)].expandByPoint(point);}
 }
 return {boxes:boxes.filter(b=>!b.isEmpty()),parts:[...new Set(parts)],brakes:[...new Set(brakes)]};
}
