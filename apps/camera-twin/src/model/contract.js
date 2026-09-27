// Shared by the browser, the tests and scripts/check-model.mjs.
// A camera builder must satisfy this contract; see docs/MODELING_BRIEF.md.
import parts from '../parts.json' with { type: 'json' };

export const PART_IDS = parts.parts.map(p => p.id);
export const REQUIRED_PART_IDS = PART_IDS.filter(id => !['body_cap', 'card_1', 'card_2', 'battery'].includes(id));
// Scene units: 1 unit = 1 cm. +Y up, +Z toward the photographer (screen side), +X = grip side seen from behind.
// Body-only footprint. When the lens is attached, depth grows by up to LENS_LENGTH_CM (checked separately).
export const BODY_SIZE_CM = { width: 13.84, height: 9.84, depth: 8.84 };
export const LENS_SIZE_CM = { length: 10.7, diameter: 8.4 };
export const SIZE_TOLERANCE = 0.25; // fraction

export const CONTROLS = {
  mode_dial: { min: 0, max: 1, note: '0..1 按 12 档模式转盘位置插值（A+ 到 C3）' },
  screen_open: { min: 0, max: 1, note: '0 屏幕合上（朝内）；1 完全侧翻展开并朝前' },
  card_door_open: { min: 0, max: 1, note: '存储卡插槽盖滑开程度' },
  power: { min: 0, max: 1, note: '0 OFF，0.5 ON，1 LOCK' },
  still_movie: { min: 0, max: 1, note: '0 照片，1 短片' },
  lens_attached: { min: 0, max: 1, note: '1 镜头装在卡口上；0 镜头拆下并沿光轴前移露出卡口' },
  lens_zoom: { min: 0, max: 1, note: '0 = 24mm（镜筒收回），1 = 105mm（镜筒伸出）' },
  battery_cover_open: { min: 0, max: 1, note: '电池仓盖打开程度，1 时电池露出' },
  lens_af_mf: { min: 0, max: 1, note: '镜头 AF/MF 拨杆：0 AF，1 MF' },
  lens_is: { min: 0, max: 1, note: '镜头防抖拨杆：0 OFF，1 ON' }
};

const fail = m => { throw new Error(m); };

export function collectParts(root) {
  const found = new Map();
  root.traverse(o => { const id = o.userData?.part; if (id) { if (found.has(id)) fail(`部件 ${id} 出现了两次`); found.set(id, o); } });
  return found;
}

/** Validate a built camera group. `THREE` is passed in so node and browser can share this file. */
export function validateCamera(root, THREE) {
  if (!root || !root.isObject3D) fail('builder 没有返回 Object3D');
  const found = collectParts(root);
  const missing = REQUIRED_PART_IDS.filter(id => !found.has(id));
  const unknown = [...found.keys()].filter(id => !PART_IDS.includes(id));
  if (unknown.length) fail(`未知部件 id：${unknown.join(', ')}`);
  let meshes = 0, tris = 0;
  root.updateMatrixWorld(true);
  root.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; const n = g.index ? g.index.count : g.attributes.position?.count || 0; tris += n / 3; const arr = g.attributes.position?.array || []; for (let i = 0; i < arr.length; i += 97) if (!Number.isFinite(arr[i])) fail(`网格 ${o.name || o.parent?.name} 含 NaN 顶点`); } });
  if (!meshes) fail('模型没有任何 Mesh');
  const box = new THREE.Box3().setFromObject(root); const size = box.getSize(new THREE.Vector3());
  const dims = { width: size.x, height: size.y, depth: size.z };
  // Measure the body without the lens so the lens can protrude forward.
  const lens = found.get('lens');
  const bodyBox = new THREE.Box3(); const inLens = o => { let p = o; while (p) { if (p === lens) return true; p = p.parent; } return false; };
  root.traverse(o => { if (o.isMesh && !inLens(o)) bodyBox.expandByObject(o); });
  const bodySize = bodyBox.getSize(new THREE.Vector3());
  const bodyDims = { width: bodySize.x, height: bodySize.y, depth: bodySize.z };
  const sizeIssues = Object.entries(BODY_SIZE_CM).filter(([k, v]) => Math.abs(bodyDims[k] - v) / v > SIZE_TOLERANCE).map(([k, v]) => `机身 ${k} 期望约 ${v}cm，实际 ${bodyDims[k].toFixed(2)}cm`);
  if (lens) { const lb = new THREE.Box3().setFromObject(lens), ls = lb.getSize(new THREE.Vector3()); const L = ls.z, Dm = Math.max(ls.x, ls.y); if (Math.abs(L - LENS_SIZE_CM.length) / LENS_SIZE_CM.length > SIZE_TOLERANCE) sizeIssues.push(`镜头长度期望约 ${LENS_SIZE_CM.length}cm，实际 ${L.toFixed(2)}cm`); if (Math.abs(Dm - LENS_SIZE_CM.diameter) / LENS_SIZE_CM.diameter > SIZE_TOLERANCE) sizeIssues.push(`镜头直径期望约 ${LENS_SIZE_CM.diameter}cm，实际 ${Dm.toFixed(2)}cm`); }
  const partsWithoutMesh = [...found].filter(([, o]) => { let m = false; o.traverse(c => { if (c.isMesh) m = true; }); return !m; }).map(([id]) => id);
  const controls = root.userData?.controls || {};
  const badControls = Object.keys(controls).filter(k => !CONTROLS[k] || typeof controls[k] !== 'function');
  return { ok: !missing.length && !sizeIssues.length && !partsWithoutMesh.length && !badControls.length, missing, sizeIssues, partsWithoutMesh, badControls, meshes, triangles: Math.round(tris), dims, bodyDims, controls: Object.keys(controls), parts: found.size };
}
