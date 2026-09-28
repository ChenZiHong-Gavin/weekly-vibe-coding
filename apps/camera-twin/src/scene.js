import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEW_DIRS = { front: [0, 0.15, -1], back: [0, 0.15, 1], top: [0, 1, 0.001], left: [-1, 0.15, 0], right: [1, 0.15, 0], bottom: [0, -1, 0.001], overview: [-0.8, 0.6, -1] };

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf4f1ea);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 500);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.1;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b5, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-18, 28, -22); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff2e0, 0.8); fill.position.set(22, 10, 18); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShadowMaterial({ opacity: 0.18 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const state = { root: null, parts: new Map(), highlighted: new Set(), lessonTargets: new Set(), isolated: null, flight: null, hovered: null };
  let dirty = true; const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);
  const originalMaterials = new WeakMap();
  const raycaster = new THREE.Raycaster();

  function setModel(root) {
    if (state.root) scene.remove(state.root);
    state.root = root; scene.add(root); state.parts.clear();
    root.traverse(o => { if (o.userData?.part) state.parts.set(o.userData.part, o); });
    const box = new THREE.Box3().setFromObject(root); floor.position.y = box.min.y - 0.01;
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; originalMaterials.set(o, o.material); } });
    setView('overview', true); invalidate();
  }
  function fit(objects, dirArr, instant) {
    const box = new THREE.Box3(); objects.forEach(o => box.expandByObject(o));
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
    let dir;
    if (dirArr) dir = new THREE.Vector3(...dirArr).normalize();
    else {
      // Look at a part from outside the body: from the body centre through the part, tilted slightly up and toward the current camera.
      const rootCenter = new THREE.Box3().setFromObject(state.root).getCenter(new THREE.Vector3());
      const outward = center.clone().sub(rootCenter); outward.y *= 0.4;
      const current = camera.position.clone().sub(controls.target).normalize();
      dir = outward.length() > 0.8 ? outward.normalize().multiplyScalar(0.8).add(current.multiplyScalar(0.35)).add(new THREE.Vector3(0, 0.3, 0)).normalize() : current;
    }
    const dist = Math.max(Math.max(size, 2) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.25, 16);
    const to = center.clone().add(dir.multiplyScalar(dist));
    if (instant) { camera.position.copy(to); controls.target.copy(center); state.flight = null; invalidate(); return; }
    state.flight = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: center, t: 0 };
  }
  function setView(name, instant = false) { if (name === 'keep' || !state.root) return; fit([state.root], VIEW_DIRS[name] || VIEW_DIRS.overview, instant); }
  function focus(ids, viewName) { const objs = ids.map(id => state.parts.get(id)).filter(Boolean); if (!objs.length) return; fit(objs, viewName && viewName !== 'keep' ? VIEW_DIRS[viewName] : null); }
  // Two highlight channels: selection (red) and lesson targets (teal). Selection wins when both apply.
  function applyHighlights() {
    const tint = (id, color, intensity) => state.parts.get(id)?.traverse(m => { if (m.isMesh && originalMaterials.has(m)) { const mat = originalMaterials.get(m).clone(); mat.emissive = new THREE.Color(color); mat.emissiveIntensity = intensity; m.material = mat; } });
    for (const id of state.parts.keys()) state.parts.get(id).traverse(m => { if (m.isMesh && originalMaterials.has(m) && m.material !== originalMaterials.get(m)) m.material = originalMaterials.get(m); });
    for (const id of state.lessonTargets) tint(id, 0x1f8a70, 0.7);
    for (const id of state.highlighted) tint(id, 0xc8412b, 0.55);
    invalidate();
  }
  function highlight(ids) { state.highlighted = new Set(ids.filter(id => state.parts.has(id))); applyHighlights(); }
  function setLessonTargets(ids) { state.lessonTargets = new Set((ids || []).filter(id => state.parts.has(id))); applyHighlights(); }
  function isolate(ids) {
    state.isolated = ids ? new Set(ids) : null;
    if (!state.root) return;
    const keep = new Set(); if (ids) ids.forEach(id => state.parts.get(id)?.traverse(o => keep.add(o)));
    state.root.traverse(o => { if (o === state.root) return; if (!ids) { o.visible = o.userData.part !== 'body_cap'; return; } o.visible = keep.has(o) || [...keep].some(k => k.parent === o || isAncestor(o, k)); });
    invalidate();
  }
  const isAncestor = (a, o) => { let p = o.parent; while (p) { if (p === a) return true; p = p.parent; } return false; };
  function control(name, value) { const fn = state.root?.userData?.controls?.[name]; if (typeof fn === 'function') { fn(value); invalidate(); } }
  function pickHit(clientX, clientY) {
    if (!state.root) return null;
    const r = canvas.getBoundingClientRect(); const p = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(p, camera);
    for (const hit of raycaster.intersectObject(state.root, true)) { let o = hit.object; if (!o.visible) continue; while (o && !o.userData?.part) o = o.parent; if (o && o.userData.part !== 'body') return { id: o.userData.part, object: hit.object, uv: hit.uv || null, point: hit.point }; }
    return null;
  }
  function pick(clientX, clientY) { return pickHit(clientX, clientY)?.id || null; }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(() => { resize(); invalidate(); }).observe(canvas); resize();
  // Render on demand: only when the camera moves, something in the scene changed, or a flight is in progress.
  renderer.setAnimationLoop(() => {
    if (state.flight) { const f = state.flight; f.t = Math.min(1, f.t + 0.035); const e = 1 - Math.pow(1 - f.t, 3); camera.position.lerpVectors(f.from, f.to, e); controls.target.lerpVectors(f.tFrom, f.tTo, e); if (f.t >= 1) state.flight = null; dirty = true; }
    const moved = controls.update();
    if (dirty || moved) { renderer.render(scene, camera); dirty = false; }
  });
  return { setModel, setView, focus, highlight, setLessonTargets, isolate, control, pick, pickHit, invalidate, controls, state, THREE };
}
