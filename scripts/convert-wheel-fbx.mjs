import {readFileSync,writeFileSync} from 'node:fs';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
const b=readFileSync('/Users/chenfeiyu/Downloads/轮子 2.FBX');
const model=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const data=await new GLTFExporter().parseAsync(model,{binary:true});
writeFileSync('assets/w206/wheel-2-import.glb',Buffer.from(data));
console.log('Converted',data.byteLength);
