import * as THREE from 'three';
import { validateCamera } from './contract.js';
import * as real from './r6iii.js';
import * as placeholder from './placeholder.js';

/** Returns { root, source: 'r6iii'|'placeholder', report }. Falls back to the placeholder when the real builder is not implemented or invalid. */
export function loadCamera() {
  if (real.IMPLEMENTED) {
    try { const root = real.buildCamera(THREE); const report = validateCamera(root, THREE); if (report.ok) return { root, source: 'r6iii', report }; console.warn('r6iii 模型未通过契约检查，回退到占位模型', report); }
    catch (e) { console.warn('r6iii 模型构建失败，回退到占位模型', e); }
  }
  const root = placeholder.buildCamera(THREE);
  return { root, source: 'placeholder', report: validateCamera(root, THREE) };
}
