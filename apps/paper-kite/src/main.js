/* ============================================================
 * 紙鳶 · 御風  —  水墨牽線（蛾風筝 + 绳索物理）
 *
 * 玩法（参考 Genreal《风筝模拟器》）：
 *   你真实的手 → 屏幕里的墨手 → 握着一根【会甩会荡的绳子】，
 *   绳那头是一只【蛾形风筝】，在风里飘、往上浮。
 *   手一动 = 移动握绳的那端 → 绳子和蛾靠物理甩、荡、飘。
 *   手动的是"绳"，不是直接拖风筝；场景（芦苇/花瓣）固定不动。
 *
 * 绳与飘带用 Verlet 质点约束仿真；风驱动蛾的升力与扑动。
 * 视觉保持水墨：宣纸底、极细墨线、朱红点睛。
 * ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  var INK = '58,54,48', INK2 = '120,112,100', CINNABAR = '156,58,48', PAPER = '#f3f0e7';

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutScene(); placeDefaults(); buildRope();
  }
  window.addEventListener('resize', resize);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ============================================================
   * 1. 风：基础风 + 阵风 + 分层。产出风速与风向。
   * ============================================================ */
  var wind = {
    base: 3.6, baseTarget: 3.6, dirDeg: 90, dirTarget: 90,
    gust: 0, gusts: [], nextGustAt: 1.4, speed: 3.6, realWeather: false
  };
  function updateWind(dt, t, elev) {
    if (Math.random() < dt * 0.16 && !wind.realWeather) {
      wind.baseTarget = clamp(wind.base + rand(-1.6, 1.9), 2.8, 8.0);   // 下限保证风筝飞得住
      wind.dirTarget = 90 + clamp((wind.dirDeg - 90) + rand(-10, 10), -22, 22);
    }
    wind.base += (wind.baseTarget - wind.base) * clamp(dt * 0.4, 0, 1);
    wind.dirDeg += (wind.dirTarget - wind.dirDeg) * clamp(dt * 0.5, 0, 1);
    wind.nextGustAt -= dt;
    if (wind.nextGustAt <= 0) {
      wind.gusts.push({ age: 0, dur: rand(0.9, 2.8), peak: rand(1.4, 4.8) });
      wind.nextGustAt = rand(1.1, 4.0);
    }
    var g = 0;
    for (var i = wind.gusts.length - 1; i >= 0; i--) {
      var gu = wind.gusts[i]; gu.age += dt;
      var p = gu.age / gu.dur;
      if (p >= 1) { wind.gusts.splice(i, 1); continue; }
      g += gu.peak * Math.sin(p * Math.PI) * (1 - p * 0.3);
    }
    wind.gust += (g - wind.gust) * clamp(dt * 6, 0, 1);
    var layer = smoothstep(0.15, 0.6, clamp(elev, 0, 1)) * 1.6;
    wind.speed = clamp(wind.base + wind.gust + layer, 0, 15);
  }
  function windSign() { return wind.dirDeg >= 90 ? 1 : -1; }
  var apparentPull = 0;   // 拽线产生的表观风（拽一下 → 风筝窜上去）
  function windVec() {
    var a = (wind.dirDeg - 90) * Math.PI / 180;   // 0 = 向右(+x)
    var spd = (wind.speed + apparentPull) * WIND_SCALE;
    return { x: spd * Math.cos(a), y: spd * Math.sin(a) };
  }

  /* ============================================================
   * 2. 真·风筝物理：空气动力学风筝 + 不可伸长的线。
   *
   *    线不再是 Verlet 软链（那会像橡皮筋），而是一条【硬约束】：
   *      风筝到系线点的距离 ≤ 线长；超了就直接拉回、并消掉向外的速度
   *      → 线绝对不伸长、不反弹；松弛时画成悬链线（会垂）。
   *    风筝本身是真气动体：升力/阻力随相对风与迎角变化，会爬升、
   *      过冲、失风下沉、在阵风里起伏 —— 飞的动作从物理里长出来。
   *    飘带仍是软链（尾巴本就该软）。
   * ============================================================ */
  var WIND_SCALE = 42;   // 风速 m/s → px/s
  var M = 1;             // 风筝质量
  var G = 700;           // 重力加速度
  var KL = 0.06;         // 升力增益（升力垂直于相对风、恒朝上 → 失风后能自己爬回来）
  var KD = 0.016;        // 阻力增益
  var VDAMP = 1.2;       // 速度阻尼（让它稳下来、不乱摆）
  var VMAX = 2400;
  var G_TAIL = 900, DAMP = 0.98;   // 飘带

  var anchor = { x: 0, y: 0 };     // 线轮 / 系线点：固定不动
  var bfly = { x: 0, y: 0, vx: 0, vy: 0, tilt: 0, taut: 0, altM: 0 };   // 风筝（气动体）
  var tails = [];
  var ropeLen = 300, LEN_MIN = 120, LEN_MAX = 700;

  // 手：屏幕坐标 + 是否握住线
  var handS = { x: 0, y: 0, active: false, grab: false, has: false };
  var grabbing = false, lastHandY = 0, GRAB_R = 64, REEL_GAIN = 0.8;
  function updateHandState(dt) {
    var h = window.__hand;
    if (h && h.active && h.tipX != null && h.landmarks) {
      // 第一人称：手只在线轮附近一小块里活动（相对稳定），不满屏乱跑
      var cx = anchor.x, cy = GROUND_Y - 120;
      var tx = cx + (clamp(h.tipX, 0, 1) - 0.5) * W * 0.32;
      var ty = cy + (clamp(h.tipY, 0, 1) - 0.5) * H * 0.30;
      if (!handS.has) { handS.x = tx; handS.y = ty; handS.has = true; }
      handS.x += (tx - handS.x) * clamp(dt * 16, 0, 1);
      handS.y += (ty - handS.y) * clamp(dt * 16, 0, 1);
      handS.active = true; handS.grab = !!h.grab;
    } else { handS.active = false; handS.grab = false; }
  }

  function P(x, y) { return { x: x, y: y, px: x, py: y, im: 1 }; }
  function integrate(pt, ax, ay, dt2) {
    var vx = (pt.x - pt.px) * DAMP, vy = (pt.y - pt.py) * DAMP;
    pt.px = pt.x; pt.py = pt.y;
    pt.x += vx + ax * dt2; pt.y += vy + ay * dt2;
  }
  function constrain(a, b, rest) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
    var diff = (d - rest) / d;
    var s = a.im + b.im; if (s <= 0) return;
    a.x += dx * diff * (a.im / s); a.y += dy * diff * (a.im / s);
    b.x -= dx * diff * (b.im / s); b.y -= dy * diff * (b.im / s);
  }
  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6;
    var tt = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy));
  }

  function buildRope() {
    LEN_MAX = clamp(H * 0.82, 320, 900);
    ropeLen = clamp(H * 0.62, 240, 720);
    LEN_MIN = ropeLen * 0.5;   // 收到最短也让风筝留在半空，不沉底
    bfly.x = anchor.x + ropeLen * 0.5; bfly.y = anchor.y - ropeLen * 0.78;   // 斜上方（下风侧），有升力区
    bfly.vx = 0; bfly.vy = 0;
    tails = [];
    var tailN = 12, tailSeg = 12, t = { pts: [], seg: tailSeg };
    for (var j = 0; j <= tailN; j++) t.pts.push(P(bfly.x, bfly.y + j * tailSeg));
    t.pts[0].im = 0;
    tails.push(t);
  }

  // 风筝一个子步：气动力 + 重力 → 速度/位置 → 硬线约束
  function kiteStep(h) {
    var wv = windVec();
    var vrx = wv.x - bfly.vx, vry = wv.y - bfly.vy;
    var s = Math.hypot(vrx, vry) || 1e-3;
    var dxn = vrx / s, dyn = vry / s;              // 相对风方向 = 阻力方向
    var lpx = dyn, lpy = -dxn;                     // 垂直于相对风
    if (lpy > 0) { lpx = -lpx; lpy = -lpy; }       // 取朝上(-y)的那个 → 升力恒朝上、可自恢复
    var fr = FRAMES[currentFrame];                          // 不同骨架不同脾气
    var Flift = KL * fr.kl * s * s, Fdrag = KD * s * s;
    var ax = (Flift * lpx + Fdrag * dxn) / M - VDAMP * fr.vd * bfly.vx;
    var ay = (Flift * lpy + Fdrag * dyn) / M + G * fr.g - VDAMP * fr.vd * bfly.vy;   // +G 向下
    bfly.vx += ax * h; bfly.vy += ay * h;
    var spd = Math.hypot(bfly.vx, bfly.vy);
    if (spd > VMAX) { bfly.vx *= VMAX / spd; bfly.vy *= VMAX / spd; }
    bfly.x += bfly.vx * h; bfly.y += bfly.vy * h;

    // 硬线约束：不可伸长，只拉不推（超出线长 → 拉回圆上 + 消掉向外速度，不反弹）
    var ex = bfly.x - anchor.x, ey = bfly.y - anchor.y, ed = Math.hypot(ex, ey) || 1e-3;
    if (ed > ropeLen) {
      var ox = ex / ed, oy = ey / ed;
      bfly.x = anchor.x + ox * ropeLen; bfly.y = anchor.y + oy * ropeLen;
      var vr = bfly.vx * ox + bfly.vy * oy;
      if (vr > 0) { bfly.vx -= vr * ox; bfly.vy -= vr * oy; }
    }
    if (bfly.y > GROUND_Y) { bfly.y = GROUND_Y; if (bfly.vy > 0) bfly.vy = 0; bfly.vx *= 0.7; }
    bfly.x = clamp(bfly.x, 10, W - 10); bfly.y = clamp(bfly.y, 10, GROUND_Y);
    if (!isFinite(bfly.x) || !isFinite(bfly.y)) buildRope();
  }

  function updatePhysics(dt) {
    // 握拳即抓住线；往下拽 = 给风筝一股表观风让它窜上去（打泵），顺带轻微收线；往上送 = 放线
    if (handS.active && handS.grab) {
      if (!grabbing) { grabbing = true; lastHandY = handS.y; }
      var dyH = handS.y - lastHandY; lastHandY = handS.y;
      if (dyH > 0) apparentPull = clamp(apparentPull + dyH * 0.05, 0, 5);
      ropeLen = clamp(ropeLen - dyH * REEL_GAIN, LEN_MIN, LEN_MAX);
    } else grabbing = false;
    apparentPull *= 0.92;   // 表观风衰减

    // 风筝气动 + 硬约束（子步长求解，稳）
    var sub = 5, h = dt / sub;
    for (var it = 0; it < sub; it++) kiteStep(h);

    // 飘带（软链，挂在风筝上）
    var dt2 = dt * dt, sgn = windSign(), push = 150 * wind.speed * sgn;
    for (var k = 0; k < tails.length; k++) {
      var tp = tails[k].pts;
      for (var j = 1; j < tp.length; j++)
        integrate(tp[j], push * 0.5 + Math.sin(nowT * 5 + j) * 120 * sgn, G_TAIL, dt2);
    }
    for (var itc = 0; itc < 10; itc++)
      for (var kk = 0; kk < tails.length; kk++) {
        var t = tails[kk]; t.pts[0].x = bfly.x; t.pts[0].y = bfly.y + 6;
        for (var jj = 0; jj < t.pts.length - 1; jj++) constrain(t.pts[jj], t.pts[jj + 1], t.seg);
        for (var jc = 0; jc < t.pts.length; jc++) { t.pts[jc].x = clamp(t.pts[jc].x, 4, W - 4); t.pts[jc].y = clamp(t.pts[jc].y, 6, GROUND_Y); }
      }

    // 姿态 & 读数
    var lineAng = Math.atan2(bfly.y - anchor.y, bfly.x - anchor.x);
    bfly.tilt = lineAng + Math.PI / 2 + clamp(bfly.vx * 0.004, -0.35, 0.35);
    var dist = Math.hypot(bfly.x - anchor.x, bfly.y - anchor.y);
    bfly.taut = smoothstep(ropeLen * 0.88, ropeLen * 0.99, dist);   // 接近线长 → 绷直
    bfly.altM = Math.max(0, (anchor.y - bfly.y) * 0.6);
  }

  /* ============================================================
   * 3. 声音：绳的弦鸣（随绷紧+风）+ 风的白噪。
   * ============================================================ */
  var audio = { ctx: null, on: true, ready: false };   // 默认开
  function initAudio() {
    if (audio.ready) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ac = new AC(); audio.ctx = ac;
      audio.master = ac.createGain(); audio.master.gain.value = 0; audio.master.connect(ac.destination);
      audio.humOsc = ac.createOscillator(); audio.humOsc.type = 'triangle';
      audio.humFilter = ac.createBiquadFilter(); audio.humFilter.type = 'bandpass'; audio.humFilter.Q.value = 6;
      audio.humFilter.frequency.value = 200;
      audio.humGain = ac.createGain(); audio.humGain.gain.value = 0;
      audio.humOsc.connect(audio.humFilter); audio.humFilter.connect(audio.humGain); audio.humGain.connect(audio.master);
      audio.humOsc.start();
      var vib = ac.createOscillator(), vibG = ac.createGain();
      vib.frequency.value = 5.5; vibG.gain.value = 7; vib.connect(vibG); vibG.connect(audio.humOsc.frequency); vib.start();
      var buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      audio.windSrc = ac.createBufferSource(); audio.windSrc.buffer = buf; audio.windSrc.loop = true;
      audio.windFilter = ac.createBiquadFilter(); audio.windFilter.type = 'lowpass'; audio.windFilter.frequency.value = 500;
      audio.windGain = ac.createGain(); audio.windGain.gain.value = 0;
      audio.windSrc.connect(audio.windFilter); audio.windFilter.connect(audio.windGain); audio.windGain.connect(audio.master);
      audio.windSrc.start();

      // —— 环境声：远处水声（低频噪声 + 慢速起伏）——
      audio.waterSrc = ac.createBufferSource(); audio.waterSrc.buffer = buf; audio.waterSrc.loop = true;
      var wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 190; wf.Q.value = 0.7;
      audio.waterGain = ac.createGain(); audio.waterGain.gain.value = 0.032;
      audio.waterSrc.connect(wf); wf.connect(audio.waterGain); audio.waterGain.connect(audio.master);
      var wlfo = ac.createOscillator(), wlg = ac.createGain();
      wlfo.frequency.value = 0.22; wlg.gain.value = 0.02;               // 一荡一荡的水声
      wlfo.connect(wlg); wlg.connect(audio.waterGain.gain); wlfo.start();
      audio.waterSrc.start();

      // —— 暮色虫鸣：高频噪声带通 + 轻颤，极淡的黄昏底噪 ——
      audio.bugSrc = ac.createBufferSource(); audio.bugSrc.buffer = buf; audio.bugSrc.loop = true;
      var bf = ac.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2600; bf.Q.value = 4;
      audio.bugGain = ac.createGain(); audio.bugGain.gain.value = 0.006;
      audio.bugSrc.connect(bf); bf.connect(audio.bugGain); audio.bugGain.connect(audio.master);
      var blfo = ac.createOscillator(), blg = ac.createGain();
      blfo.frequency.value = 7; blg.gain.value = 0.004;
      blfo.connect(blg); blg.connect(audio.bugGain.gain); blfo.start();
      audio.bugSrc.start();

      audio.ready = true;
      scheduleBird();                                                   // 归鸟啼鸣
    } catch (e) { console.warn('audio init failed', e); }
  }

  // 远处归鸟：偶尔一两声清脆的啼叫（音高滑动 + 快包络）
  function chirp() {
    var ac = audio.ctx, now = ac.currentTime;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    var f0 = 1500 + Math.random() * 1300;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.5, now + 0.06);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.75, now + 0.2);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.028, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    o.connect(g); g.connect(audio.master); o.start(now); o.stop(now + 0.28);
  }
  function scheduleBird() {
    setTimeout(function () {
      if (audio.ready && audio.on) { chirp(); if (Math.random() < 0.45) setTimeout(chirp, 260 + Math.random() * 200); }
      scheduleBird();
    }, (3.5 + Math.random() * 8) * 1000);
  }
  function updateAudio() {
    if (!audio.ready || !audio.on) return;
    var ac = audio.ctx, now = ac.currentTime, w = wind.speed;
    var freq = 120 + w * 30 + (bfly ? bfly.taut * 60 : 0);
    audio.humFilter.frequency.setTargetAtTime(freq, now, 0.07);
    audio.humOsc.frequency.setTargetAtTime(freq, now, 0.07);
    audio.humGain.gain.setTargetAtTime((bfly ? bfly.taut : 0) * clamp(w / 9, 0, 1) * 0.13, now, 0.09);
    audio.windFilter.frequency.setTargetAtTime(300 + w * 90, now, 0.15);
    audio.windGain.gain.setTargetAtTime(clamp(w / 14, 0, 1) * 0.1 + wind.gust * 0.02, now, 0.12);
    audio.master.gain.setTargetAtTime(0.9, now, 0.2);
  }

  /* ============================================================
   * 4. 场景（水墨，固定不动）：芦苇、远山淡墨、飞燕、随风花瓣。
   * ============================================================ */
  var reeds = [], petals = [], swallows = [], clouds = [], GROUND_Y = 0;
  function layoutScene() {
    GROUND_Y = H - 40;
    // 云霞：几缕横向淡云
    clouds = [];
    for (var c = 0; c < 4; c++)
      clouds.push({ x: rand(0, W), y: H * (0.14 + c * 0.08) + rand(-8, 8), w: rand(W * 0.1, W * 0.2), op: rand(0.06, 0.13), drift: rand(0.15, 0.4) });
    reeds = [];
    var baseX = W * 0.12, span = W * 0.2, n = Math.floor(W / 48) + 5;
    for (var i = 0; i < n; i++) {
      var cluster = Math.random() < 0.6;
      reeds.push({
        x: baseX + (Math.random() * Math.random()) * span * (cluster ? 1 : 2.6) + rand(-8, 8),
        h: rand(54, 130), phase: rand(0, 6.28), stiff: rand(0.55, 1.0), head: Math.random() < 0.5, dark: rand(0.3, 0.6)
      });
    }
    if (swallows.length === 0)
      for (var s = 0; s < 2; s++)
        swallows.push({ x: rand(0, W), y: rand(H * 0.12, H * 0.36), s: rand(0.7, 1.1), flap: rand(0, 6.28), z: rand(0.5, 1) });
  }
  function spawnPetal() {
    petals.push({ x: -20, y: rand(H * 0.2, H * 0.8), vy: rand(6, 16), rot: rand(0, 6.28), spin: rand(-1.4, 1.4), size: rand(3.5, 7), sway: rand(0, 6.28), op: rand(0.35, 0.75) });
  }

  /* ============================================================
   * 5. 渲染
   * ============================================================ */
  function render(t) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    // 夕阳暖调天空（轻透，留白）
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, 'rgba(236,224,206,0)');
    sky.addColorStop(0.62, 'rgba(233,196,158,0.12)');
    sky.addColorStop(1, 'rgba(216,158,126,0.16)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    drawSun();
    drawClouds(t);
    drawDistantWash();
    drawWater(t);
    drawBoat();
    drawSwallows(t);
    if (Math.random() < 0.04 + clamp(wind.speed / 40, 0, 0.12)) spawnPetal();
    drawPetals();

    drawReel();
    drawTails();
    drawRope();
    drawKite();
    drawReeds(t);
    drawGroundLine();
    drawInkHand();
  }

  // 线轮 / 系线点：固定在地上
  function drawReel() {
    ctx.strokeStyle = 'rgba(' + INK + ',0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 6, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(' + INK + ',0.4)';
    ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 2, 0, 6.283); ctx.fill();
  }

  // 夕阳：小而柔的朱红日轮 + 淡光晕
  var sunX = 0, sunY = 0, sunR = 0;
  function drawSun() {
    sunX = W * 0.72; sunY = H * 0.30; sunR = clamp(Math.min(W, H) * 0.038, 24, 48);
    var halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 6);
    halo.addColorStop(0, 'rgba(214,120,84,0.22)');
    halo.addColorStop(0.5, 'rgba(222,150,104,0.08)');
    halo.addColorStop(1, 'rgba(222,150,104,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    var disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    disc.addColorStop(0, 'rgba(228,150,110,0.7)');
    disc.addColorStop(1, 'rgba(' + CINNABAR + ',0.42)');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, 6.283); ctx.fill();
  }

  // 云霞：几缕横向的暖色淡云，缓缓漂
  function drawClouds(t) {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.x += c.drift * windSign();
      if (c.x - c.w > W + 40) c.x = -c.w - 40; if (c.x + c.w < -40) c.x = W + c.w + 40;
      var warm = clamp(1 - Math.abs(c.x - sunX) / (W * 0.55), 0, 1);
      var col = warm > 0.35 ? '224,160,120' : '150,148,146';
      ctx.save(); ctx.globalAlpha = c.op;
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w, c.w * 0.11, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.35, c.y + 5, c.w * 0.6, c.w * 0.08, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  }

  // 水光：淡雅一带水面 + 少许波光 + 夕阳的柔和倒影（留白为主）
  function drawWater(t) {
    var top = H * 0.68, bot = H * 0.82;
    var g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(168,178,194,0.05)');
    g.addColorStop(1, 'rgba(140,152,176,0.13)');
    ctx.fillStyle = g; ctx.fillRect(0, top, W, bot - top);
    // 几笔横向波光（细、淡）
    ctx.strokeStyle = 'rgba(' + INK2 + ',0.12)'; ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
      var y = top + (bot - top) * (i + 0.6) / 5, ph = t * 0.4 + i * 1.6;
      ctx.beginPath();
      for (var x = 0; x <= W; x += 28) {
        var yy = y + Math.sin(x * 0.022 + ph) * 1.4;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // 夕阳倒影：柔和的橙红波光竖列，短而疏
    ctx.strokeStyle = 'rgba(212,120,86,0.28)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (var j = 0; j < 7; j++) {
      var yy2 = top + (bot - top) * (j + 0.4) / 7;
      var w2 = (12 + Math.sin(t * 2.2 + j * 0.9) * 7) * (1 - j / 9);
      ctx.beginPath(); ctx.moveTo(sunX - w2, yy2); ctx.lineTo(sunX + w2, yy2); ctx.stroke();
    }
  }

  // 孤舟：水面上一叶小舟（写意一笔），随水轻轻漂、起伏、微摇
  function drawBoat() {
    var bx = W * 0.26 + Math.sin(nowT * 0.16) * W * 0.05;   // 缓缓横漂
    var by = H * 0.775 + Math.sin(nowT * 0.9) * 2.6;         // 轻轻起伏
    var rock = Math.sin(nowT * 0.9 + 0.5) * 0.05;            // 微微摇
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(rock);
    ctx.strokeStyle = 'rgba(' + INK + ',0.62)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(0, 8, 22, -1); ctx.stroke();   // 船身
    ctx.lineWidth = 1.6;                                                                        // 篷/人
    ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(4, -15); ctx.moveTo(4, -15); ctx.lineTo(13, -6); ctx.stroke();
    ctx.restore();
    // 倒影（随波微微晃）
    ctx.save(); ctx.globalAlpha = 0.24;
    ctx.strokeStyle = 'rgba(' + INK + ',0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var wob = Math.sin(nowT * 2.2) * 1.5;
    ctx.beginPath(); ctx.moveTo(bx - 16 + wob, by + 6); ctx.quadraticCurveTo(bx + wob, by + 11, bx + 16 + wob, by + 6); ctx.stroke();
    ctx.restore();
  }

  function drawDistantWash() {
    var gy = H * 0.68;   // 远山落在水的远岸
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = 'rgb(' + INK2 + ')';
    ctx.beginPath(); ctx.moveTo(-W * 0.02, gy);
    ctx.quadraticCurveTo(W * 0.16, gy - H * 0.1, W * 0.3, gy - H * 0.04);
    ctx.quadraticCurveTo(W * 0.42, gy - H * 0.11, W * 0.55, gy - H * 0.03);
    ctx.lineTo(W * 0.55, gy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.6, gy);
    ctx.quadraticCurveTo(W * 0.74, gy - H * 0.14, W * 0.84, gy - H * 0.05);
    ctx.quadraticCurveTo(W * 0.92, gy - H * 0.12, W * 1.02, gy - H * 0.02);
    ctx.lineTo(W * 1.02, gy); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawGroundLine() {
    ctx.strokeStyle = 'rgba(' + INK2 + ',0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 4); ctx.lineTo(W, GROUND_Y + 4); ctx.stroke();
  }
  function drawReeds(t) {
    var gy = GROUND_Y + 4, bend = windSign() * clamp(wind.speed / 7, 0, 1.5);
    for (var i = 0; i < reeds.length; i++) {
      var r = reeds[i];
      var sway = Math.sin(t * 2.2 + r.phase) * (0.12 + wind.gust * 0.05);
      var tip = (bend + sway) * r.h * r.stiff;
      ctx.strokeStyle = 'rgba(' + INK2 + ',' + r.dark + ')'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r.x, gy);
      var ex = r.x + tip, ey = gy - r.h;
      ctx.quadraticCurveTo(r.x + tip * 0.45, gy - r.h * 0.6, ex, ey); ctx.stroke();
      if (r.head) { ctx.fillStyle = 'rgba(' + INK2 + ',' + (r.dark * 0.8) + ')'; ctx.beginPath(); ctx.ellipse(ex, ey, 2.6, 6, Math.atan2(tip, r.h), 0, 6.283); ctx.fill(); }
    }
  }
  function drawSwallows(t) {
    var drift = windSign() * (0.3 + wind.speed * 0.12);
    for (var i = 0; i < swallows.length; i++) {
      var s = swallows[i]; s.x += drift * s.z; s.flap += 0.15;
      if (s.x > W + 40) s.x = -40; if (s.x < -40) s.x = W + 40;
      var wingUp = Math.sin(s.flap) * 0.5 + 0.5;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.s * (drift < 0 ? -1 : 1), s.s);
      ctx.strokeStyle = 'rgba(' + INK + ',0.5)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      var yb = -6 * wingUp;
      ctx.beginPath(); ctx.moveTo(-9, yb); ctx.quadraticCurveTo(-3, 2, 0, 0); ctx.quadraticCurveTo(3, 2, 9, yb); ctx.stroke();
      ctx.restore();
    }
  }
  function drawPetals() {
    var wx = windSign() * wind.speed * 3.2;
    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i]; p.sway += 0.05; p.rot += p.spin * 0.03;
      p.x += (wx + Math.sin(p.sway) * 6) * 0.16; p.y += p.vy * 0.096 + Math.sin(p.sway) * 0.3;
      if (p.x > W + 30 || p.y > H + 30) { petals.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(' + CINNABAR + ',' + p.op + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
  }

  // 线：悬链线——绷紧近直、松弛下垂。握着线时经过手（系线点→手→风筝）。
  function drawRope() {
    ctx.strokeStyle = 'rgba(' + INK2 + ',' + (0.3 + (bfly.taut || 0) * 0.34) + ')';
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    if (grabbing && handS.active) {
      catenary(anchor.x, anchor.y, handS.x, handS.y);
      catenary(handS.x, handS.y, bfly.x, bfly.y);
    } else {
      catenary(anchor.x, anchor.y, bfly.x, bfly.y);
    }
  }
  function catenary(ax, ay, bx, by) {
    var len = Math.hypot(bx - ax, by - ay);
    var sag = (1 - (bfly.taut || 0)) * len * 0.26 + 3;   // 越松越垂
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by); ctx.stroke();
  }

  function drawTails() {
    for (var k = 0; k < tails.length; k++) {
      var pts = tails[k].pts;
      ctx.strokeStyle = 'rgba(' + INK + ',0.34)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      var last = pts[pts.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke();
      // 尾上的朱红结（原来的样子）
      ctx.fillStyle = 'rgba(' + CINNABAR + ',0.72)';
      for (var j = 2; j < pts.length; j += 2) {
        ctx.beginPath(); ctx.ellipse(pts[j].x, pts[j].y, 2.6, 2.2, 0, 0, 6.283); ctx.fill();
      }
    }
  }

  // 菱形风筝：朱红罩染 + 墨线轮廓 + 骨架 + 提线（原来的样子）
  /* ============================================================
   * 5b. 风筝设计：选骨架 + 对称笔刷画皮 → 烘焙成贴图供飞行渲染。
   *     不同骨架有不同飞行脾气（升力/重量/阻尼）。
   * ============================================================ */
  var K_W = 58, K_TOP = 54, K_BOT = 78, KITE_FLY_SCALE = 0.42;
  var FRAMES = {
    diamond: { name: '菱', kl: 1.0, g: 1.0, vd: 1.0,
      path: function (c) { c.moveTo(0, -K_TOP); c.lineTo(K_W, 0); c.lineTo(0, K_BOT); c.lineTo(-K_W, 0); c.closePath(); },
      struts: function (c) { c.moveTo(0, -K_TOP); c.lineTo(0, K_BOT); c.moveTo(-K_W, 0); c.lineTo(K_W, 0); } },
    swallow: { name: '燕', kl: 1.18, g: 0.9, vd: 0.8,
      path: function (c) {
        c.moveTo(0, -K_TOP * 0.86);
        c.bezierCurveTo(K_W * 1.15, -K_TOP * 0.5, K_W * 1.25, K_BOT * 0.12, K_W * 0.5, K_BOT * 0.32);
        c.quadraticCurveTo(K_W * 0.22, K_BOT * 0.5, 0, K_BOT);
        c.quadraticCurveTo(-K_W * 0.22, K_BOT * 0.5, -K_W * 0.5, K_BOT * 0.32);
        c.bezierCurveTo(-K_W * 1.25, K_BOT * 0.12, -K_W * 1.15, -K_TOP * 0.5, 0, -K_TOP * 0.86);
        c.closePath();
      },
      struts: function (c) { c.moveTo(0, -K_TOP * 0.86); c.lineTo(0, K_BOT); c.moveTo(-K_W * 1.1, -K_TOP * 0.1); c.lineTo(K_W * 1.1, -K_TOP * 0.1); } },
    delta: { name: '翼', kl: 1.32, g: 0.95, vd: 0.95,
      path: function (c) { c.moveTo(0, -K_TOP); c.lineTo(K_W * 1.15, K_BOT * 0.55); c.lineTo(0, K_BOT * 0.18); c.lineTo(-K_W * 1.15, K_BOT * 0.55); c.closePath(); },
      struts: function (c) { c.moveTo(0, -K_TOP); c.lineTo(0, K_BOT * 0.18); c.moveTo(0, -K_TOP); c.lineTo(K_W * 1.15, K_BOT * 0.55); c.moveTo(0, -K_TOP); c.lineTo(-K_W * 1.15, K_BOT * 0.55); } },
    hex: { name: '六', kl: 0.95, g: 1.15, vd: 1.3,
      path: function (c) { c.moveTo(0, -K_TOP); c.lineTo(K_W, -K_TOP * 0.32); c.lineTo(K_W, K_BOT * 0.4); c.lineTo(0, K_BOT); c.lineTo(-K_W, K_BOT * 0.4); c.lineTo(-K_W, -K_TOP * 0.32); c.closePath(); },
      struts: function (c) { c.moveTo(0, -K_TOP); c.lineTo(0, K_BOT); c.moveTo(-K_W, -K_TOP * 0.32); c.lineTo(K_W, -K_TOP * 0.32); c.moveTo(-K_W, K_BOT * 0.4); c.lineTo(K_W, K_BOT * 0.4); } }
  };

  var designMode = false, currentFrame = 'diamond', currentColor = '58,54,48', tool = 'brush';
  var marks = [], curStroke = null;   // 每个 mark = 笔迹 {kind:'stroke'} 或 图章 {kind:'stamp'}
  var kiteTex = null, texCX = 0, texCY = 0;
  var designViewS = 1, designViewCx = 0, designViewCy = 0;
  var STAMP_S = 20;

  // 传统纹样图章（单位坐标 ~±1，用当前色）
  var STAMPS = {
    flower: function (c, col) {                       // 花
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.fillStyle = 'rgba(' + col + ',0.45)'; c.lineWidth = 0.1;
      for (var k = 0; k < 5; k++) { c.save(); c.rotate(k * 2 * Math.PI / 5);
        c.beginPath(); c.ellipse(0, -0.6, 0.3, 0.48, 0, 0, 6.283); c.fill(); c.stroke(); c.restore(); }
      c.beginPath(); c.arc(0, 0, 0.2, 0, 6.283); c.fillStyle = 'rgba(' + col + ',0.85)'; c.fill();
    },
    cloud: function (c, col) {                        // 如意云纹
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.lineWidth = 0.16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-0.9, 0.35);
      c.bezierCurveTo(-0.95, -0.45, -0.1, -0.5, -0.05, 0.15);
      c.bezierCurveTo(0.0, -0.5, 0.9, -0.45, 0.9, 0.35); c.stroke();
      c.beginPath(); c.arc(-0.9, 0.3, 0.18, Math.PI * 0.1, Math.PI * 1.5); c.stroke();
      c.beginPath(); c.arc(0.9, 0.3, 0.18, -Math.PI * 0.5, Math.PI * 0.9); c.stroke();
    },
    meander: function (c, col) {                      // 回纹
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.lineWidth = 0.15; c.lineJoin = 'miter';
      c.beginPath();
      c.moveTo(-0.85, 0.85); c.lineTo(-0.85, -0.85); c.lineTo(0.85, -0.85); c.lineTo(0.85, 0.5);
      c.lineTo(-0.45, 0.5); c.lineTo(-0.45, -0.45); c.lineTo(0.45, -0.45); c.lineTo(0.45, 0.2); c.stroke();
    },
    bat: function (c, col) {                          // 蝙蝠（福）
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.fillStyle = 'rgba(' + col + ',0.55)'; c.lineWidth = 0.09;
      c.beginPath(); c.moveTo(0, 0.12);
      c.quadraticCurveTo(0.4, -0.5, 0.92, -0.2);
      c.quadraticCurveTo(0.68, -0.02, 0.96, 0.18);
      c.quadraticCurveTo(0.58, 0.12, 0.34, 0.38);
      c.quadraticCurveTo(0.2, 0.16, 0, 0.36);
      c.quadraticCurveTo(-0.2, 0.16, -0.34, 0.38);
      c.quadraticCurveTo(-0.58, 0.12, -0.96, 0.18);
      c.quadraticCurveTo(-0.68, -0.02, -0.92, -0.2);
      c.quadraticCurveTo(-0.4, -0.5, 0, 0.12); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -0.04, 0.12, 0, 6.283); c.fill();
    },
    fish: function (c, col) {                         // 鱼
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.fillStyle = 'rgba(' + col + ',0.45)'; c.lineWidth = 0.09;
      c.beginPath(); c.moveTo(0.72, 0);
      c.quadraticCurveTo(0.0, -0.5, -0.58, -0.16);
      c.lineTo(-0.96, -0.42); c.lineTo(-0.74, 0); c.lineTo(-0.96, 0.42); c.lineTo(-0.58, 0.16);
      c.quadraticCurveTo(0.0, 0.5, 0.72, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(0.42, -0.1, 0.07, 0, 6.283); c.fillStyle = 'rgba(' + col + ',0.9)'; c.fill();
    },
    coin: function (c, col) {                         // 古钱
      c.strokeStyle = 'rgba(' + col + ',0.82)'; c.lineWidth = 0.13;
      c.beginPath(); c.arc(0, 0, 0.85, 0, 6.283); c.stroke();
      c.beginPath(); c.rect(-0.28, -0.28, 0.56, 0.56); c.stroke();
    }
  };
  function placeStamp(c, m, flip) {
    c.save(); c.translate(m.x * flip, m.y); c.scale(m.s * flip, m.s);
    STAMPS[m.type](c, m.color); c.restore();
  }

  // 画骨架 + 画皮（局部坐标，原点 = 风筝中心）
  function paintKite(c, wash) {
    var fr = FRAMES[currentFrame];
    c.save();
    c.beginPath(); fr.path(c);
    c.fillStyle = 'rgba(' + CINNABAR + ',' + wash + ')'; c.fill();
    c.clip();
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.kind === 'stroke') {
        c.strokeStyle = 'rgba(' + m.color + ',0.82)'; c.lineWidth = m.w; c.lineCap = 'round'; c.lineJoin = 'round';
        strokePath(c, m.pts, 1); strokePath(c, m.pts, -1);           // 原笔 + 镜像
      } else {                                                        // 图章
        placeStamp(c, m, 1);
        if (Math.abs(m.x) > 6) placeStamp(c, m, -1);                  // 离轴 → 对称成对；在轴上 → 只一枚
      }
    }
    c.restore();
    c.beginPath(); fr.path(c); c.strokeStyle = 'rgba(' + INK + ',0.8)'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
    c.beginPath(); fr.struts(c); c.strokeStyle = 'rgba(' + INK + ',0.4)'; c.lineWidth = 1.2; c.stroke();
  }
  function strokePath(c, pts, mx) {
    if (!pts.length) return;
    c.beginPath(); c.moveTo(pts[0][0] * mx, pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0] * mx, pts[i][1]);
    if (pts.length === 1) c.lineTo(pts[0][0] * mx + 0.5, pts[0][1] + 0.5);
    c.stroke();
  }
  function bakeKiteTex() {
    var pad = 30, halfW = K_W * 1.3 + pad;
    var cv = document.createElement('canvas');
    cv.width = Math.ceil(halfW * 2); cv.height = Math.ceil(K_TOP + K_BOT + pad * 2);
    var c = cv.getContext('2d');
    texCX = halfW; texCY = pad + K_TOP;
    c.translate(texCX, texCY);
    paintKite(c, 0.16);
    kiteTex = cv;
  }

  // 设计模式全屏视图
  function drawDesign() {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    var cx = W * 0.5, cy = H * 0.48;
    var s = clamp(Math.min(W, H) / (K_TOP + K_BOT) * 0.62, 1.3, 3.4);
    designViewS = s; designViewCx = cx; designViewCy = cy;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(' + INK2 + ',0.28)'; ctx.lineWidth = 0.6 / s; ctx.setLineDash([6 / s, 6 / s]);
    ctx.beginPath(); ctx.moveTo(0, -K_TOP - 18); ctx.lineTo(0, K_BOT + 18); ctx.stroke(); ctx.setLineDash([]);
    paintKite(ctx, 0.14);
    ctx.restore();
    ctx.fillStyle = 'rgba(' + INK + ',0.55)'; ctx.font = '22px "Songti SC", serif'; ctx.textAlign = 'center';
    ctx.fillText('選骨架 · 蘸色畫皮或蓋紋樣章 · 半邊落筆，另一半自成', cx, H * 0.1);
  }

  function designLocal(e) {
    var x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    var y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    return [(x - designViewCx) / designViewS, (y - designViewCy) / designViewS];
  }
  function onPaintDown(e) {
    if (!designMode) return; e.preventDefault();
    var p = designLocal(e);
    if (tool === 'brush') { curStroke = { kind: 'stroke', color: currentColor, w: 7, pts: [p] }; marks.push(curStroke); }
    else marks.push({ kind: 'stamp', type: tool, x: p[0], y: p[1], s: STAMP_S, color: currentColor });   // 盖章
  }
  function onPaintMove(e) {
    if (!designMode || !curStroke) return; e.preventDefault();
    var p = designLocal(e), last = curStroke.pts[curStroke.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.5) curStroke.pts.push(p);
  }
  function onPaintUp() { curStroke = null; }
  canvas.addEventListener('mousedown', onPaintDown);
  canvas.addEventListener('mousemove', onPaintMove);
  window.addEventListener('mouseup', onPaintUp);
  canvas.addEventListener('touchstart', onPaintDown, { passive: false });
  canvas.addEventListener('touchmove', onPaintMove, { passive: false });
  window.addEventListener('touchend', onPaintUp);

  // 飞行时：把烘焙好的风筝贴图画到风筝位置
  function drawKite() {
    if (!kiteTex) return;
    ctx.save();
    ctx.translate(bfly.x, bfly.y); ctx.rotate(bfly.tilt || 0);
    ctx.scale(KITE_FLY_SCALE, KITE_FLY_SCALE);
    ctx.drawImage(kiteTex, -texCX, -texCY);
    ctx.restore();
  }

  // 水墨的手：用追踪的 21 关节点画，画在手的真实位置（handS），大小按手掌长度归一。
  // 食指指尖对齐 handS；握拳抓线时指尖染朱红。
  var HAND_CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
  function drawInkHand() {
    var h = window.__hand;
    if (!handS.active || !h || !h.landmarks) return;   // 没手就不画（风筝自己在飞）
    var lm = h.landmarks, tip = lm[8], wrist = lm[0], mid = lm[9];
    var palm = Math.hypot(mid.x - wrist.x, mid.y - wrist.y) || 0.001;
    var S = clamp(105 / palm, 340, 1600);   // 第一人称近景，手画大一点
    function sx(p) { return handS.x + (p.x - tip.x) * S; }
    function sy(p) { return handS.y + (p.y - tip.y) * S; }
    ctx.strokeStyle = grabbing ? 'rgba(' + INK + ',0.78)' : 'rgba(' + INK + ',0.55)';
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < HAND_CONN.length; i++) { var a = lm[HAND_CONN[i][0]], b = lm[HAND_CONN[i][1]]; ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b)); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(' + INK + ',0.28)';
    for (var j = 0; j < lm.length; j++) { ctx.beginPath(); ctx.arc(sx(lm[j]), sy(lm[j]), 2.2, 0, 6.283); ctx.fill(); }
    // 指尖：抓线时朱红实心，否则淡圈
    ctx.beginPath(); ctx.arc(handS.x, handS.y, grabbing ? 4 : 3, 0, 6.283);
    ctx.fillStyle = grabbing ? 'rgba(' + CINNABAR + ',0.9)' : 'rgba(' + CINNABAR + ',0.5)'; ctx.fill();
  }

  /* ============================================================
   * 6. 交互：手去"拉线"（抓/放逻辑在 updatePhysics / updateHandState）。
   * ============================================================ */
  // 首次交互唤起并恢复音频上下文（默认开声，浏览器要求手势后才能出声）
  document.addEventListener('pointerdown', function once() {
    initAudio();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    document.removeEventListener('pointerdown', once);
  });

  /* -------------------- 控制按钮 -------------------- */
  var btnSound = document.getElementById('btnSound');
  function toggleSound(force) {
    audio.on = (typeof force === 'boolean') ? force : !audio.on;
    if (audio.on) { initAudio(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); }
    btnSound.classList.toggle('on', audio.on);
    if (!audio.on && audio.master) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1);
  }
  btnSound.addEventListener('click', function () { toggleSound(); });
  btnSound.classList.add('on');   // 默认开

  /* -------------------- 诗字 & HUD -------------------- */
  var capEl = document.getElementById('caption'), capTimer = null;
  function showCaption(text) {
    capEl.textContent = text; capEl.classList.add('show');
    if (capTimer) clearTimeout(capTimer);
    capTimer = setTimeout(function () { capEl.classList.remove('show'); }, 2600);
  }
  var hintEl = document.getElementById('hint');
  var btnHand = document.getElementById('btnHand');
  if (btnHand) btnHand.addEventListener('click', function () { setTimeout(function () { hintEl.classList.add('gone'); }, 3000); });

  var hudSpeed = document.getElementById('windSpeed');
  var hudArrow = document.getElementById('windArrow');
  var hudLayer = document.getElementById('layer');
  var hudAlt = document.getElementById('altitude');
  var hudAcc = 0;
  function updateHud(dt) {
    hudAcc += dt; if (hudAcc < 0.15) return; hudAcc = 0;
    hudSpeed.textContent = wind.speed.toFixed(1);
    hudArrow.style.transform = 'rotate(' + wind.dirDeg + 'deg)';
    hudAlt.textContent = Math.round((bfly && bfly.altM) || 0);
    hudLayer.textContent = (window.__hand && window.__hand.active) ? '牽線中' : '待牽';
  }

  /* ============================================================
   * 7. 主循环
   * ============================================================ */
  var nowT = 0, last = 0;
  function frame(ts) {
    var t = ts / 1000;
    var dt = last ? clamp(t - last, 0, 0.033) : 0.016;
    last = t; nowT = t;
    if (designMode) { drawDesign(); requestAnimationFrame(frame); return; }
    var elev = clamp((anchor.y - (bfly ? bfly.y : anchor.y)) / (H * 0.6), 0, 1);
    updateWind(dt, t, elev);
    updateHandState(dt);
    updatePhysics(dt);
    updateAudio();
    render(t);
    updateHud(dt);
    requestAnimationFrame(frame);
  }

  /* -------------------- 设计工具栏 -------------------- */
  var designBar = document.getElementById('designBar');
  var hudEl = document.getElementById('hud'), sealEl = document.getElementById('seal');
  function setDesignMode(on) {
    designMode = on;
    designBar.classList.toggle('hidden', !on);
    canvas.classList.toggle('designing', on);
    if (hudEl) hudEl.style.display = on ? 'none' : '';
    if (sealEl) sealEl.style.display = on ? 'none' : '';
    if (hintEl) hintEl.classList.add('gone');
    if (on) showCaption('設計你的風箏');
  }
  document.getElementById('btnDesign').addEventListener('click', function () { setDesignMode(!designMode); });
  document.getElementById('btnDoneDesign').addEventListener('click', function () { bakeKiteTex(); setDesignMode(false); showCaption('放 飛'); });
  document.getElementById('btnUndo').addEventListener('click', function () { marks.pop(); });
  document.getElementById('btnClear').addEventListener('click', function () { marks = []; });
  [].forEach.call(document.querySelectorAll('.frameBtn'), function (b) {
    b.addEventListener('click', function () {
      currentFrame = b.getAttribute('data-frame');
      [].forEach.call(document.querySelectorAll('.frameBtn'), function (x) { x.classList.toggle('on', x === b); });
    });
  });
  [].forEach.call(document.querySelectorAll('.toolBtn'), function (b) {
    b.addEventListener('click', function () {
      tool = b.getAttribute('data-tool');
      [].forEach.call(document.querySelectorAll('.toolBtn'), function (x) { x.classList.toggle('on', x === b); });
    });
  });
  [].forEach.call(document.querySelectorAll('.colorBtn'), function (b) {
    b.addEventListener('click', function () {
      currentColor = b.getAttribute('data-color');
      [].forEach.call(document.querySelectorAll('.colorBtn'), function (x) { x.classList.toggle('on', x === b); });
    });
  });

  /* -------------------- 启动 -------------------- */
  function placeDefaults() { anchor.x = W * 0.4; anchor.y = GROUND_Y - 10; }   // 线轮在底部偏左(上风侧)，风筝斜上方落在画面中上
  resize();
  bakeKiteTex();                       // 先烘焙默认菱形风筝

  // 开场"入画"：轻点淡出，并借这次手势启动声音
  var introEl = document.getElementById('intro');
  if (introEl) introEl.addEventListener('click', function () {
    introEl.classList.add('gone');
    initAudio(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    setTimeout(function () { introEl.style.display = 'none'; showCaption('風 起'); }, 1500);
  });

  requestAnimationFrame(frame);
})();
