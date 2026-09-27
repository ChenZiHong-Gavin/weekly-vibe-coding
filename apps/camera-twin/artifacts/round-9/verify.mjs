import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildCamera } from '../../src/model/r6iii.js';
import { buildCamera as buildBefore } from './r6iii-before.js';
import { collectParts } from '../../src/model/contract.js';
const root=buildCamera(THREE), before=buildBefore(THREE), parts=collectParts(root), previous=collectParts(before);
const c=root.userData.controls,p=parts.get('power_switch');
const fingerprint=part=>{
  const h=createHash('sha256');
  part.traverse(o=>{
    h.update(JSON.stringify([o.name,o.position.toArray(),o.rotation.toArray(),o.scale.toArray()]));
    if(o.isMesh){
      for(const [name,a] of Object.entries(o.geometry.attributes))h.update(name).update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));
      if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));
      h.update(JSON.stringify([o.material.type,o.material.color.getHex(),o.material.roughness,o.material.metalness]));
    }
  });
  return h.digest('hex');
};
const untouched=[];
for(const [id,part] of parts)if(!['power_switch','quick_control_dial_2'].includes(id)){
  assert.equal(fingerprint(part),fingerprint(previous.get(id)),`${id} must remain unchanged`);untouched.push(id);
}
const labelPositions=()=>['OFF','LOCK','ON'].map(s=>root.getObjectByName('mark_'+s).getWorldPosition(new THREE.Vector3()).toArray());
root.updateMatrixWorld(true);const labels=labelPositions(),states=[];
for(const [label,t,x,z] of [['OFF',0,4.10,.02],['ON',.5,6.12,.06],['LOCK',1,5.05,-.30]]){
  c.power(t);root.updateMatrixWorld(true);
  const tab=p.localToWorld(new THREE.Vector3(0,.285,-1));
  const radial=new THREE.Vector2(tab.x-p.position.x,tab.z-p.position.z).normalize();
  const mark=new THREE.Vector2(x-p.position.x,z-p.position.z).normalize();
  assert.ok(radial.distanceTo(mark)<1e-12,`${label} tab must point to the fixed legend`);
  assert.deepEqual(labelPositions(),labels);
  states.push({label,t,degrees:THREE.MathUtils.radToDeg(p.rotation.y)});
}
assert.ok(states[0].degrees>states[2].degrees && states[2].degrees>states[1].degrees,'physical order OFF LOCK ON');
for(const t of [NaN,Infinity,-1,0,.25,.5,.75,1,2]){c.power(t);assert.ok(Number.isFinite(p.rotation.y));}
c.power(0);const angle=p.rotation.y;c.power(1);c.power(0);assert.equal(p.rotation.y,angle);
const tabMeshes=p.children.filter(m=>m.isMesh && m.material.color.getHex()===0x42464a);
let minimumTabClearance=Infinity;
for(const t of [0,.5,1]){
 c.power(t);root.updateMatrixWorld(true);
 for(let x=-.36;x<=.36;x+=.015)for(let z=-1.22;z<=-.78;z+=.015){
  const point=p.localToWorld(new THREE.Vector3(x,0,z));
  const above=new THREE.Raycaster(new THREE.Vector3(point.x,10,point.z),new THREE.Vector3(0,-1,0)).intersectObject(parts.get('quick_control_dial_2'),true);
  const below=new THREE.Raycaster(new THREE.Vector3(point.x,3.1,point.z),new THREE.Vector3(0,1,0)).intersectObjects(tabMeshes);
  if(above.length && below.length)minimumTabClearance=Math.min(minimumTabClearance,below[0].point.y-above[0].point.y);
 }
}
assert.ok(minimumTabClearance>=0,`tab intersects dial: ${minimumTabClearance}`);
const report={minimumTabClearanceCm:minimumTabClearance,unchangedParts:untouched.length,states,stationaryLegends:true,physicalOrder:['OFF','LOCK','ON'],finiteAndReversible:true};
writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
