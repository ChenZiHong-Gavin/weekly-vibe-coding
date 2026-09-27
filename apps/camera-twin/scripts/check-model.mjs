// Headless contract check for src/model/r6iii.js (or --placeholder). Codex runs this after every modeling round.
import * as THREE from 'three';
import { validateCamera, REQUIRED_PART_IDS } from '../src/model/contract.js';
const usePlaceholder = process.argv.includes('--placeholder');
const mod = usePlaceholder ? await import('../src/model/placeholder.js') : await import('../src/model/r6iii.js');
if (!usePlaceholder && mod.IMPLEMENTED === false) { console.error('src/model/r6iii.js 仍是空槽：请实现 buildCamera 并把 IMPLEMENTED 设为 true'); process.exit(2); }
let root; try { root = mod.buildCamera(THREE); } catch (e) { console.error('buildCamera 抛出异常：', e); process.exit(2); }
const r = validateCamera(root, THREE);
console.log(JSON.stringify({ ...r, dims: Object.fromEntries(Object.entries(r.dims).map(([k, v]) => [k, +v.toFixed(2)])), requiredParts: REQUIRED_PART_IDS.length }, null, 2));
process.exit(r.ok ? 0 : 1);
