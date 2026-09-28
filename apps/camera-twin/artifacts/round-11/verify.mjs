import * as T from 'three';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {buildCamera} from '../../src/model/r6iii.js';
const root=buildCamera(T);root.updateMatrixWorld(true);
const dial=root.getObjectByName('main_dial'),grip=root.getObjectByName('grip');
const size=new T.Box3().setFromObject(dial).getSize(new T.Vector3());
assert.ok(Math.abs(size.x-.5)<1e-6);assert.ok(Math.abs(size.y-1.3)<.005);assert.ok(Math.abs(size.z-1.3)<.005);
const pos=dial.children[0].geometry.attributes.position;
const radii=Array.from({length:256},(_,i)=>Math.hypot(pos.getY(256+i),pos.getZ(256+i)));
const crests=radii.filter((r,i)=>r>radii[(i+255)%256]&&r>radii[(i+1)%256]).length;assert.equal(crests,64);
const samples=[-2.55,-2.1,-1.65].map(z=>{
  const surface=new T.Raycaster(new T.Vector3(5.28,8,z),new T.Vector3(0,-1,0)).intersectObject(grip,true)[0].point.y;
  return {z,surfaceY:surface,exposedArcFraction:Math.acos((surface-dial.position.y)/.65)/Math.PI};
});
assert.ok(samples.every(s=>s.exposedArcFraction>.28&&s.exposedArcFraction<.39));
const shader=dial.children[0].material;assert.equal(shader.metalness,0);assert.ok(shader.roughness>.9);
assert.equal(dial.userData.part,'main_dial');assert.equal(dial.userData.rotationAxis,'x');
await writeFile(new URL('verification.json',import.meta.url),JSON.stringify({dimensionsCm:size,teeth:crests,rotationAxis:dial.userData.rotationAxis,samples,material:{roughness:shader.roughness,metalness:shader.metalness}},null,2));
