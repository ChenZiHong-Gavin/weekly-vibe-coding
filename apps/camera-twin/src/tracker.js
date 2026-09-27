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

export function createTracker({ stage, els, onStatus }) {
  const state = { running: false, markerMm: 40, video: null, stream: null, detector: null, posit: null, offsetQ: null, offsetP: null, lastSeen: 0, smooth: 0.35, positionGain: 1, fps: 0, raf: 0 };
  const root = () => stage.state.root;
  const canvas = els.preview; const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const flip = new THREE.Matrix4().makeScale(1, -1, -1); // OpenCV camera axes -> three.js axes
  const target = { q: new THREE.Quaternion(), p: new THREE.Vector3() };
  const base = { q: new THREE.Quaternion(), p: new THREE.Vector3() };
  const status = (text, ok) => onStatus?.(text, ok);

  async function start() {
    if (state.running) return;
    await loadVendor();
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    state.video = document.createElement('video'); state.video.srcObject = state.stream; state.video.muted = true; state.video.playsInline = true; await state.video.play();
    canvas.width = state.video.videoWidth || 640; canvas.height = state.video.videoHeight || 480;
    state.detector = new window.AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 4 });
    state.posit = new window.POS.Posit(state.markerMm, canvas.width);
    base.q.copy(root().quaternion); base.p.copy(root().position);
    state.running = true; status('摄像头已开，寻找标记…', true); loop();
  }
  function stop() {
    state.running = false; cancelAnimationFrame(state.raf);
    state.stream?.getTracks().forEach(t => t.stop()); state.stream = null; state.video = null;
    if (root()) { root().quaternion.copy(base.q); root().position.copy(base.p); }
    status('同步已停止', false);
  }
  function setMarkerSize(mm) { state.markerMm = mm; if (state.posit) state.posit = new window.POS.Posit(mm, canvas.width); }
  /** Take the current marker pose as "the model's default pose" so later motion is relative. */
  function align() { if (!state.lastPose) { status('还没看到标记，先把标记对准摄像头', false); return; } state.offsetQ = state.lastPose.q.clone().invert(); state.offsetP = state.lastPose.p.clone(); status('已对齐，转动真机试试', true); }

  let frames = 0, fpsAt = performance.now();
  function loop() {
    if (!state.running) return;
    state.raf = requestAnimationFrame(loop);
    const v = state.video; if (!v || v.readyState < 2) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
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
    status(`标记 ${m.id} · 距离 ${(T[2] / 10).toFixed(0)} cm · ${state.fps} fps`, true);
    if (!state.offsetQ) return; // not aligned yet: show detection only
    // offsetQ = inverse(pose at align): relative rotation since alignment, applied on top of the model's base pose
    target.q.copy(q).multiply(state.offsetQ).premultiply(base.q);
    target.p.copy(p).sub(state.offsetP).multiplyScalar(state.positionGain).clampLength(0, 12).add(base.p);
    root().quaternion.slerp(target.q, state.smooth); root().position.lerp(target.p, state.smooth);
  }
  function markerSVG(id, mm) { const dict = new window.AR.Dictionary('ARUCO_MIP_36h12'); return dict.generateSVG(id).replace('<svg ', `<svg width="${mm}mm" height="${mm}mm" `); }
  function printMarkers() {
    const mm = state.markerMm; const w = window.open('', '_blank');
    w.document.write(`<!doctype html><title>ArUco 标记</title><style>body{font-family:sans-serif;padding:20px}figure{display:inline-block;margin:0 24px 24px 0;text-align:center}svg{display:block;border:1px solid #ccc}@media print{p{display:none}}</style><p>按 100% 比例打印。id 0 贴在热靴盖顶部（箭头朝镜头方向），id 1 贴在背面屏幕旁；边长 ${mm} mm，四周留白边。</p>${[0, 1].map(id => `<figure>${markerSVG(id, mm)}<figcaption>id ${id}</figcaption></figure>`).join('')}<script>setTimeout(()=>print(),300)</script>`);
    w.document.close();
  }
  return { start, stop, align, setMarkerSize, printMarkers, state };
}
