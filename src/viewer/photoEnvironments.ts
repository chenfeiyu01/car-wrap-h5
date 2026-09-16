import {Vector3} from 'three';

export const photoEnvironments={
 mountain:{asset:'skidpan',rotation:Math.PI,height:1.25,radius:60,exposure:.85,intensity:.85,sunUV:[.173584,.36084],sunIntensity:.35,shadowOpacity:.16},
 sunset:{asset:'modern_buildings_2',rotation:Math.PI,height:1.2,radius:50,exposure:.8,intensity:.9,sunUV:[.60083,.312012],sunIntensity:2.2,shadowOpacity:.34},
} as const;

export function environmentLightDirection(uv:readonly [number,number],rotation:number){
 const azimuth=uv[0]*Math.PI*2,polar=uv[1]*Math.PI;
 return new Vector3(-Math.cos(azimuth)*Math.sin(polar),Math.cos(polar),-Math.sin(azimuth)*Math.sin(polar)).applyAxisAngle(new Vector3(0,1,0),rotation);
}
