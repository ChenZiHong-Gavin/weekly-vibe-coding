/* ============================================================
 * 手部追踪 —— 用真实的手来"拉线"。
 *
 * 摄像头画面全程本地处理（MediaPipe HandLandmarker，浏览器内运行），
 * 只把手的 21 个关节点算出来，喂给 main.js：
 *   · 手往下拉 = 收线（张力上升）
 *   · 手抬起   = 放线
 *   · 猛地一顿 = 顿线（张力尖峰）
 * 手不直接移动风筝——风筝只对"线"的张力与几何做物理反应。
 *
 * 需要：摄像头授权 + 本地服务（http://localhost，file:// 拿不到摄像头）+ 首次联网下载模型。
 * 拿不到时，main.js 自动回退到鼠标/键盘。
 * ============================================================ */

// 与 main.js 共享的手部状态
const hand = {
  active: false,
  landmarks: null,   // [{x,y}] × 21，已镜像
  tipX: null, tipY: null,   // 食指指尖（归一化，已镜像）
  grab: false        // 握拳 = 抓住线
};
window.__hand = hand;

const btn = document.getElementById('btnHand');
const video = document.getElementById('cam');

let landmarker = null;
let running = false;
let lastT = 0;

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function start() {
  if (running) { stop(); return; }
  btn.textContent = '啟動中…';
  try {
    // 摄像头
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    });
    video.srcObject = stream;
    await video.play();

    // 追踪器
    const vision = await import(CDN + '/vision_bundle.mjs');
    const fileset = await vision.FilesetResolver.forVisionTasks(CDN + '/wasm');
    landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      numHands: 1,
      runningMode: 'VIDEO'
    });

    running = true;
    hand.active = true;
    btn.classList.add('on');
    btn.textContent = '收手';
    requestAnimationFrame(loop);
  } catch (e) {
    console.warn('hand tracking failed', e);
    btn.textContent = '手·失敗';
    hand.active = false; running = false;
    if (video.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    setTimeout(() => { btn.textContent = '用手牽線'; }, 2200);
  }
}

function stop() {
  running = false;
  hand.active = false;
  hand.landmarks = null;
  hand.reelN = 0; hand.tug = 0;
  btn.classList.remove('on');
  btn.textContent = '用手牽線';
  if (video.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
}

function loop(ts) {
  if (!running) return;
  const t = ts / 1000;
  const dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
  lastT = t;

  if (landmarker && video.readyState >= 2) {
    let res = null;
    try { res = landmarker.detectForVideo(video, ts); } catch (e) { /* 偶发丢帧 */ }
    const lms = res && res.landmarks && res.landmarks[0];
    if (lms) {
      // 镜像 x（摄像头是镜像的，符合直觉）
      const mirrored = lms.map(p => ({ x: 1 - p.x, y: p.y }));
      hand.landmarks = mirrored;
      const tip = mirrored[8];        // 食指指尖
      hand.tipX = tip.x; hand.tipY = tip.y;

      // 握拳检测：四个指尖到手腕的平均距离 / 手掌长度；握拳时比值小 = 抓住线
      const ref = Math.hypot(mirrored[9].x - mirrored[0].x, mirrored[9].y - mirrored[0].y) || 0.001;
      let sum = 0;
      [8, 12, 16, 20].forEach(i => { sum += Math.hypot(mirrored[i].x - mirrored[0].x, mirrored[i].y - mirrored[0].y); });
      const openRatio = (sum / 4) / ref;
      hand.grab = openRatio < 1.85;   // 握拳
    } else {
      hand.landmarks = null;
      hand.grab = false;
    }
  }

  requestAnimationFrame(loop);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

btn.addEventListener('click', start);
