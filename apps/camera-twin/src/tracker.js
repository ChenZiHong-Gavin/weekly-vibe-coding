// Real-camera sync: an ArUco marker stuck on the physical camera is tracked by the webcam (js-aruco2 + POSIT),
// and the 3D model follows its rotation and position. Marker ids 0 (top / hot-shoe cover) and 1 (back) are supported.
import * as THREE from 'three';

const VENDOR = ['./vendor/js-aruco2/cv.js', './vendor/js-aruco2/svd.js', './vendor/js-aruco2/aruco.js', './vendor/js-aruco2/posit1.js'];
let vendorLoaded = null;
function loadVendor() {
  if (vendorLoaded) return vendorLoaded;
  vendorLoaded = VENDOR.reduce((p, src) => p.then(() => new Promise((ok, bad) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => bad(new Error('无法加载 ' + src)); document.head.appendChild(el); })), Promise.resolve());
  return vendorLoaded;
}

const OBJECTRON_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/objectron/';
let objectronLoaded = null;
function loadObjectron() {
  if (objectronLoaded) return objectronLoaded;
  objectronLoaded = new Promise((ok, bad) => { const el = document.createElement('script'); el.src = OBJECTRON_CDN + 'objectron.js'; el.onload = ok; el.onerror = () => bad(new Error('无法加载 MediaPipe Objectron（需要联网）')); document.head.appendChild(el); });
  return objectronLoaded;
}
/** Rotation of an Objectron 3D box from its 8 vertices (index 1..8: bit2 = x, bit1 = y, bit0 = z). */
function boxRotation(kp) {
  const v = i => new THREE.Vector3(kp[i].point3d.x, kp[i].point3d.y, kp[i].point3d.z);
  const mean = idx => idx.reduce((a, i) => a.add(v(i)), new THREE.Vector3()).multiplyScalar(1 / idx.length);
  const ex = mean([5, 6, 7, 8]).sub(mean([1, 2, 3, 4])), ey = mean([3, 4, 7, 8]).sub(mean([1, 2, 5, 6])), ez = mean([2, 4, 6, 8]).sub(mean([1, 3, 5, 7]));
  const size = [ex.length(), ey.length(), ez.length()];
  ex.normalize(); ey.sub(ex.clone().multiplyScalar(ey.dot(ex))).normalize(); const ez2 = new THREE.Vector3().crossVectors(ex, ey); if (ez2.dot(ez) < 0) ez2.negate();
  const m = new THREE.Matrix4().makeBasis(ex, ey, ez2); if (m.determinant() < 0) { ez2.negate(); m.makeBasis(ex, ey, ez2); }
  return { q: new THREE.Quaternion().setFromRotationMatrix(m), center: v(0), size };
}

export function createTracker({ stage, els, onStatus }) {
  const state = { running: false, mode: 'marker', flipYaw: true, objectron: null, busy: false, markerMm: 40, video: null, stream: null, detector: null, posit: null, offsetQ: null, offsetP: null, lastSeen: 0, smooth: 0.35, positionGain: 1, fps: 0, raf: 0 };
  const root = () => stage.state.root;
  const canvas = els.preview; const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const flip = new THREE.Matrix4().makeScale(1, -1, -1); // OpenCV camera axes -> three.js axes
  const target = { q: new THREE.Quaternion(), p: new THREE.Vector3() };
  const base = { q: new THREE.Quaternion(), p: new THREE.Vector3() };
  const status = (text, ok) => onStatus?.(text, ok);

  async function start(mode = state.mode) {
    if (state.running) return;
    state.mode = mode;
    if (mode === 'objectron') { await loadObjectron(); state.objectron = new window.Objectron({ locateFile: f => OBJECTRON_CDN + f }); state.objectron.setOptions({ modelName: 'Camera', maxNumObjects: 1, minDetectionConfidence: 0.4, minTrackingConfidence: 0.5, staticImageMode: true }); state.objectron.onResults(onObjectron); }
    else await loadVendor();
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    state.video = document.createElement('video'); state.video.srcObject = state.stream; state.video.muted = true; state.video.playsInline = true; await state.video.play();
    canvas.width = state.video.videoWidth || 640; canvas.height = state.video.videoHeight || 480;
    if (mode === 'marker') { state.detector = new window.AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 4 }); state.posit = new window.POS.Posit(state.markerMm, canvas.width); }
    base.q.copy(root().quaternion); base.p.copy(root().position);
    // The webcam frame becomes the viewing frame: look at the model from +Z so "what the webcam sees" is what you see.
    stage.setView('back'); root().quaternion.identity(); root().position.set(0, 0, 0);
    state.running = true; status(mode === 'objectron' ? '摄像头已开，把相机正面对着摄像头…' : '摄像头已开，寻找标记…', true); loop();
  }
  function stop() {
    state.running = false; cancelAnimationFrame(state.raf);
    state.stream?.getTracks().forEach(t => t.stop()); state.stream = null; state.video = null;
    if (root()) { root().quaternion.copy(base.q); root().position.copy(base.p); } state.offsetQ = null; state.zRef = null; state.lastPose = null;
    status('同步已停止', false);
  }
  function setMarkerSize(mm) { state.markerMm = mm; if (state.posit) state.posit = new window.POS.Posit(mm, canvas.width); }
  /** Take the current marker pose as "the model's default pose" so later motion is relative. */
  /** Optional trim: treat the current marker pose as "model facing straight at the webcam" to cancel a crooked sticker. */
  function align() { if (!state.lastPose) { status('还没看到标记，先把标记对准摄像头', false); return; } state.offsetQ = state.lastPose.q.clone().invert(); state.zRef = state.lastPose.p.z; status('已按当前姿势微调，转动真机试试', true); }
  function resetAlign() { state.offsetQ = null; state.zRef = null; }

  let frames = 0, fpsAt = performance.now();
  function loop() {
    if (!state.running) return;
    state.raf = requestAnimationFrame(loop);
    const v = state.video; if (!v || v.readyState < 2) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    if (state.mode === 'objectron') { if (!state.busy) { state.busy = true; state.frame = state.frame || document.createElement('canvas'); state.frame.width = canvas.width; state.frame.height = canvas.height; state.frame.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height); state.objectron.send({ image: state.frame }).catch(e => { state.lastError = String(e); }).finally(() => { state.busy = false; }); } return; }
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const markers = state.detector.detect(img);
    frames++; const now = performance.now(); if (now - fpsAt > 1000) { state.fps = frames; frames = 0; fpsAt = now; }
    const m = markers.find(x => x.id === 0) || markers.find(x => x.id === 1) || markers[0];
    if (!m) { if (now - state.lastSeen > 800) status(`未检测到标记 · ${state.fps} fps`, false); return; }
    state.lastSeen = now;
    // draw corners
    ctx.strokeStyle = '#3ddc5a'; ctx.lineWidth = 3; ctx.beginPath(); m.corners.forEach((c, i) => i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#3ddc5a'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('id ' + m.id, m.corners[0].x, m.corners[0].y - 6);
    // pose (POSIT expects corners centred on the image)
    const corners = m.corners.map(c => ({ x: c.x - canvas.width / 2, y: canvas.height / 2 - c.y }));
    const pose = state.posit.pose(corners); const R = pose.bestRotation, T = pose.bestTranslation;
    const rot = new THREE.Matrix4().set(R[0][0], R[0][1], R[0][2], 0, R[1][0], R[1][1], R[1][2], 0, R[2][0], R[2][1], R[2][2], 0, 0, 0, 0, 1);
    rot.premultiply(flip).multiply(flip);
    const q = new THREE.Quaternion().setFromRotationMatrix(rot);
    // marker on top of the body: marker +Z (normal) is the body's +Y, marker +Y (up in print) is the body's -Z (toward the lens)
    const markerToBody = m.id === 1 ? new THREE.Quaternion() : new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    q.multiply(markerToBody);
    const p = new THREE.Vector3(T[0], -T[1], -T[2]).multiplyScalar(0.1); // mm -> cm, into three.js axes
    state.lastPose = { q, p };
    status(`标记 ${m.id} · 距离 ${(T[2] / 10).toFixed(0)} cm · ${state.fps} fps${state.offsetQ ? ' · 已微调' : ''}`, true);
    // Absolute pose: the marker's known placement on the body gives the model's orientation directly, no alignment needed.
    // "对齐" is only an optional trim for a crooked sticker: offsetQ = inverse(pose at trim) * identity.
    target.q.copy(q); if (state.offsetQ) target.q.multiply(state.offsetQ);
    if (!state.zRef) state.zRef = p.z;
    target.p.set(p.x, p.y, (p.z - state.zRef) * 0.5).multiplyScalar(state.positionGain).clampLength(0, 14);
    root().quaternion.slerp(target.q, state.smooth); root().position.lerp(target.p, state.smooth);
  }
  function onObjectron(r) {
    state.results = (state.results || 0) + 1;
    frames++; const now = performance.now(); if (now - fpsAt > 1000) { state.fps = frames; frames = 0; fpsAt = now; }
    const det = r.objectDetections?.[0];
    if (!det) { if (now - state.lastSeen > 800) status(`未识别到相机 · ${state.fps} fps`, false); return; }
    state.lastSeen = now;
    // draw the 3D box edges in 2D
    const P = det.keypoints.map(k => [k.point2d.x * canvas.width, k.point2d.y * canvas.height]);
    ctx.strokeStyle = '#3ddc5a'; ctx.lineWidth = 2; ctx.beginPath();
    for (const [a, b] of [[1, 2], [1, 3], [1, 5], [2, 4], [2, 6], [3, 4], [3, 7], [4, 8], [5, 6], [5, 7], [6, 8], [7, 8]]) { ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); }
    ctx.stroke();
    const { q, center, size } = boxRotation(det.keypoints);
    if (state.flipYaw) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    state.lastPose = { q, p: center };
    status(`无标记识别 · 盒 ${size.map(x => (x * 100).toFixed(0)).join('×')} · ${state.fps} fps${state.offsetQ ? ' · 已微调' : ''}`, true);
    target.q.copy(q); if (state.offsetQ) target.q.multiply(state.offsetQ);
    target.p.set(center.x * 20, center.y * 20, 0).clampLength(0, 14);
    root().quaternion.slerp(target.q, 0.2); root().position.lerp(target.p, 0.2);
  }
  function toggleFlip() { state.flipYaw = !state.flipYaw; status(state.flipYaw ? "已翻转朝向" : "已恢复朝向", true); }
  function markerSVG(id, mm) { const dict = new window.AR.Dictionary('ARUCO_MIP_36h12'); return dict.generateSVG(id).replace('<svg ', `<svg width="${mm}mm" height="${mm}mm" `); }
  function printMarkers() {
    const mm = state.markerMm; const w = window.open('', '_blank');
    w.document.write(`<!doctype html><title>ArUco 标记</title><style>body{font-family:sans-serif;padding:20px}figure{display:inline-block;margin:0 24px 24px 0;text-align:center}svg{display:block;border:1px solid #ccc}@media print{p{display:none}}</style><p>按 100% 比例打印。id 0 贴在热靴盖顶部（箭头朝镜头方向），id 1 贴在背面屏幕旁；边长 ${mm} mm，四周留白边。</p>${[0, 1].map(id => `<figure>${markerSVG(id, mm)}<figcaption>id ${id}</figcaption></figure>`).join('')}<script>setTimeout(()=>print(),300)</script>`);
    w.document.close();
  }
  return { start, stop, align, resetAlign, flip: toggleFlip, setMarkerSize, printMarkers, state };
}
