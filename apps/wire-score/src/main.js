/* ============================================================
 * 電線譜  —  電線當五線譜，鳥是音符，琴在下面
 *
 * 畫面：夕陽、兩根電線杆、五根電線；畫面底下一排琴鍵。
 * 五根線從下到上是 宮 商 角 徵 羽（C D E G A），所以鳥怎麼落都好聽。
 * 鳥在線上的橫向位置就是時間：一道風從左到右掃過，掃到誰，誰就跳一下、琴就彈那個音。
 *
 * 沒有按鈕、沒有說明。打開就是鳥飛回來。
 * 彈過的鳥自己飛走；風還沒掃到的地方，鳥又陸續落回來——每一輪都是一首新的曲子。
 * 想插手也可以：點電線落一隻鳥，點鳥驚飛，按琴鍵喚鳥。
 * 視覺保持水墨：宣紙底、極細墨線、朱紅點睛。
 * ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  // C · 枯筆焦墨：熟宣暖米、三階墨、藤黃薄染、灰赭夕陽
  var PAPER = '#EFE7D5', PAPER_RGB = '239,231,213';
  var INK_L = '200,193,174', INK_M = '119,117,106', INK_D = '52,58,52';
  var GAMBOGE = '215,199,146', OCHRE = '175,139,102';
  var INK = INK_D, INK2 = INK_M, CINNABAR = OCHRE;   // 舊名字沿用
  // 固定種子的隨機數：筆毫、飛白、紙紋都靠它，動畫裡不閃
  function srand(seed) {
    var a = (seed * 1664525 + 1013904223) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ============================================================
   * 1. 佈局
   * ============================================================ */
  var L = {};
  var BS = 1;                                   // 鳥的比例
  var SLOTS = 64;                               // 一輪 64 格：四小節，每格一個十六分音
  var WIRE_NAMES = ['羽', '徵', '角', '商', '宮'];  // 從上到下
  var WIRE_FREQ = [440.00, 392.00, 329.63, 293.66, 261.63];

  // 古琴七弦，正調：徵 羽 宮 商 角 徵 羽（G2 A2 C3 D3 E3 G3 A3）。
  // 電線上的宮商角徵羽對應三到七弦；鳥是按音，比空弦高一個八度；低音的胖鳥彈空弦。
  var STRINGS = [
    { f: 98.00 }, { f: 110.00 }, { f: 130.81, wire: 4 }, { f: 146.83, wire: 3 },
    { f: 164.81, wire: 2 }, { f: 196.00, wire: 1 }, { f: 220.00, wire: 0 }
  ];
  var HUI = [1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4, 4 / 5, 5 / 6, 7 / 8];   // 十三徽

  var birds = [], clouds = [], swallows = [], petals = [];

  function layoutScene() {
    L.wx0 = W * 0.10; L.wx1 = W * 0.90;
    var top = H * 0.30, gap = clamp(H * 0.068, 34, 90);
    L.wireY = [];
    for (var i = 0; i < 5; i++) L.wireY.push(top + i * gap);
    L.gap = gap;
    L.sag = gap * 0.18;
    L.poleTop = top - gap * 0.9;
    L.groundY = L.wireY[4] + gap * 1.9;
    L.sunX = W * 0.68; L.sunY = H * 0.23; L.sunR = clamp(Math.min(W, H) * 0.045, 24, 56);
    BS = clamp(gap / 82, 0.5, 1.0);

    // 琴：尾在左、首在右；岳山靠右，龍齦在左
    L.qx0 = W * 0.15; L.qx1 = W * 0.85;
    L.qy1 = H - (W < 820 ? 36 : 54);
    L.qy0 = Math.max(L.groundY + gap * 0.7, L.qy1 - clamp(H * 0.17, 80, 160));
    L.yueX = L.qx1 - (L.qx1 - L.qx0) * 0.07;        // 岳山
    L.longX = L.qx0 + (L.qx1 - L.qx0) * 0.025;      // 龍齦
    L.sy = [];
    var inset = (L.qy1 - L.qy0) * 0.16;
    for (var si = 0; si < 7; si++) L.sy.push(L.qy0 + inset + (L.qy1 - L.qy0 - 2 * inset) * si / 6);

    clouds = [];
    for (var c = 0; c < 4; c++)
      clouds.push({ x: rand(0, W), y: H * (0.08 + c * 0.05) + rand(-8, 8), w: rand(W * 0.1, W * 0.2), op: rand(0.06, 0.13), drift: rand(0.15, 0.4) });
    if (swallows.length === 0)
      for (var s = 0; s < 2; s++)
        swallows.push({ x: rand(0, W), y: rand(H * 0.06, H * 0.2), s: rand(0.7, 1.1), flap: rand(0, TAU), z: rand(0.5, 1) });
    for (var b = 0; b < birds.length; b++) settleBird(birds[b]);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutScene();
    buildBackground();
  }
  window.addEventListener('resize', resize);

  function wireYAt(i, x) {
    var u = clamp((x - L.wx0) / (L.wx1 - L.wx0), 0, 1);
    return L.wireY[i] + L.sag * 4 * u * (1 - u);
  }
  function slotX(slot) { return L.wx0 + (slot + 0.5) / SLOTS * (L.wx1 - L.wx0); }

  /* ============================================================
   * 2. 鳥：落線（音符）、被彈過就飛走、風沒掃到的地方又落回來
   * ============================================================ */
  function birdAt(wire, slot) {
    for (var i = 0; i < birds.length; i++)
      if (birds[i].wire === wire && birds[i].slot === slot && birds[i].state !== 'leaving') return birds[i];
    return null;
  }
  function aliveCount() {
    var n = 0; for (var i = 0; i < birds.length; i++) if (birds[i].state !== 'leaving') n++;
    return n;
  }
  function settleBird(b) {
    b.px = slotX(b.slot); b.py = wireYAt(b.wire, b.px);
    if (b.state === 'perched') { b.x = b.px; b.y = b.py; }
  }
  function addBird(wire, slot, fromSide) {
    if (birdAt(wire, slot)) return null;
    var b = {
      wire: wire, slot: slot, state: 'landing', t: 0, dur: rand(0.8, 1.2),
      face: 1, s: rand(0.9, 1.1), fat: rand(0.85, 1.15), tailA: rand(-0.12, 0.2),
      flap: rand(0, TAU), hop: 0, idle: rand(2, 7), tilt: 0, leaveAt: -1
    };
    settleBird(b);
    var side = fromSide || (Math.random() < 0.5 ? -1 : 1);
    b.x0 = side < 0 ? -60 : W + 60; b.y0 = b.py - rand(H * 0.15, H * 0.3);
    b.cx = (b.x0 + b.px) / 2; b.cy = Math.min(b.y0, b.py) - H * 0.12;
    b.face = b.px > b.x0 ? 1 : -1;
    b.x = b.x0; b.y = b.y0;
    birds.push(b);
    return b;
  }
  function scareBird(b, quiet) {
    if (b.state === 'leaving') return;
    b.state = 'leaving'; b.t = 0; b.dur = rand(1.0, 1.5);
    b.x0 = b.x; b.y0 = b.y;
    b.x1 = b.x + b.face * rand(W * 0.15, W * 0.35); b.y1 = -80;
    b.cx = b.x + b.face * W * 0.05; b.cy = b.y - H * 0.2;
    if (!quiet) chirp(0.6);
  }
  function updateBirds(dt) {
    for (var i = birds.length - 1; i >= 0; i--) {
      var b = birds[i];
      b.flap += dt * 14;
      if (b.state === 'landing') {
        b.t += dt / b.dur;
        var u = easeInOut(clamp(b.t, 0, 1)), iu = 1 - u;
        b.x = iu * iu * b.x0 + 2 * iu * u * b.cx + u * u * b.px;
        b.y = iu * iu * b.y0 + 2 * iu * u * b.cy + u * u * b.py;
        if (b.t >= 1) { b.state = 'perched'; b.x = b.px; b.y = b.py; b.hop = 0.5; b.face = Math.random() < 0.5 ? 1 : -1; }
      } else if (b.state === 'leaving') {
        b.t += dt / b.dur;
        var v = clamp(b.t, 0, 1), iv = 1 - v;
        b.x = iv * iv * b.x0 + 2 * iv * v * b.cx + v * v * b.x1;
        b.y = iv * iv * b.y0 + 2 * iv * v * b.cy + v * v * b.y1;
        if (b.t >= 1) birds.splice(i, 1);
      } else {
        if (b.hop > 0) b.hop = Math.max(0, b.hop - dt * 3.2);
        if (b.leaveAt >= 0 && nowT >= b.leaveAt) { scareBird(b, true); continue; }
        b.idle -= dt;
        if (b.idle <= 0) {
          b.idle = rand(2.5, 9);
          if (Math.random() < 0.5) b.face = -b.face; else b.tilt = 0.18;
        }
        b.tilt *= Math.pow(0.02, dt);
      }
    }
  }

  // 風掃到的鳥：跳、鳴、琴響；過一會兒自己飛走
  function strikeBird(b) {
    b.hop = 1;
    var f = WIRE_FREQ[b.wire], v = b.vel || 0.6;
    if (b.bass) playNote(f / 2, v, 4.5); else playNote(f, v, (b.slot % BAR === 0) ? 3.2 : 2.2);
    handPlay(stringOfWire(b.wire), b.bass);
    if (!b.bass) chirp(0.18 + v * 0.1);
    pressKeyByWire(b.wire);
    if (b.leaveAt < 0) b.leaveAt = nowT + rand(0.4, 1.2);
  }

  /* ============================================================
   * 3. 一輪（風）：從左到右掃過電線
   * ============================================================ */
  var loopSec = 7, phase = 0, playing = false;
  function updateLoop(dt) {
    if (!playing) return;
    var prev = phase;
    phase += dt / loopSec;
    var wrapped = false;
    if (phase >= 1) { phase -= 1; wrapped = true; }
    if (wrapped) onWrap();
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      if (b.state !== 'perched') continue;
      var p = (b.slot + 0.5) / SLOTS;
      var hit = wrapped ? (p > prev || p <= phase) : (p > prev && p <= phase);
      if (hit) strikeBird(b);
    }
  }

  /* ============================================================
   * 4. 作曲：一輪就是一句。節奏從民歌常見的節奏型裡抽，旋律是「動機 — 接續 — 模進 — 收尾」，
   *    句尾落宮（全終止）或徵（半終止），強拍重、弱拍輕，宮線上隔小節落一隻胖鳥當低音。
   *    風掃過的鳥飛走，下一句的鳥落在風身後的空線上，所以每一輪都是新的一句，又連成一首歌。
   * ============================================================ */
  var BAR = 16;
  // 一小節的節奏型（十六分格上的起音點）
  var RHYTHMS = [
    [0, 4, 8, 12], [0, 4, 8, 10, 12], [0, 2, 4, 8, 12], [0, 4, 6, 8, 12, 14],
    [0, 3, 4, 8, 12], [0, 6, 8, 12], [0, 2, 4, 6, 8, 12], [0, 4, 8, 12, 14], [0, 4, 8], [0, 4, 8, 11, 12]
  ];
  var ENDINGS = [[0, 4, 8], [0, 8], [0, 2, 4, 8], [0, 4, 8]];
  var song = { a: null, b: null, idx: 0 };      // 當前這首歌的節奏骨架，用幾句就換
  var phraseQueue = [];                           // 下一句還沒落的鳥

  // 度數：0 宮 1 商 2 角 3 徵 4 羽  →  線：wire = 4 - degree
  function walk(from, n, bias, target) {
    var out = [], d = from;
    for (var i = 0; i < n; i++) {
      var step;
      if (target !== undefined && i === n - 1) step = target - d;
      else if (target !== undefined && i === n - 2) step = clamp(target - d, -1, 1) + (target - d === 0 ? pick([-1, 1]) : 0);
      else {
        var r = Math.random() + bias;
        step = r < 0.18 ? -2 : r < 0.5 ? -1 : r < 0.6 ? 0 : r < 0.9 ? 1 : 2;
      }
      d = d + step;
      if (d < 0) d = -d; if (d > 4) d = 8 - d;
      d = clamp(d, 0, 4);
      out.push(d);
    }
    return out;
  }
  function velAt(slot) {
    var k = slot % BAR;
    return k === 0 ? 1.0 : k % 8 === 0 ? 0.78 : k % 4 === 0 ? 0.62 : 0.46;
  }
  function composePhrase() {
    if (!song.a || song.idx >= 4) { song.a = pick(RHYTHMS); song.b = pick(RHYTHMS); song.idx = 0; }
    var half = song.idx % 2 === 0;                // 第一、三句半終止落徵，第二、四句全終止落宮
    song.idx++;
    var bars = [song.a, song.b, song.a, pick(ENDINGS)];
    var notes = [];
    var m1 = walk(pick([0, 0, 2, 3]), bars[0].length, 0.12);
    var m2 = walk(m1[m1.length - 1], bars[1].length, 0.08);
    var t = pick([0, 0, 1, -1]);
    var m3 = m1.map(function (d) { return clamp(d + t, 0, 4); });
    var m4 = walk(m3[m3.length - 1], bars[3].length, -0.15, half ? 3 : 0);
    var mel = [m1, m2, m3, m4];
    for (var b = 0; b < 4; b++)
      for (var k = 0; k < bars[b].length; k++) {
        var slot = b * BAR + bars[b][k];
        notes.push({ wire: 4 - mel[b][k], slot: slot, vel: velAt(slot) });
      }
    // 低音：第一、三小節的強拍，宮線上一隻胖鳥（第三小節偶爾落徵）
    for (var bb = 0; bb < 4; bb += 2) {
      var bw = (bb === 2 && Math.random() < 0.4) ? 1 : 4, bs = bb * BAR;
      if (!notes.some(function (n) { return n.slot === bs && n.wire === bw; }))
        notes.push({ wire: bw, slot: bs, vel: 0.7, bass: true });
    }
    // 偶爾在第二、四小節強拍疊一個三度
    for (var cb = 1; cb < 4; cb += 2)
      if (Math.random() < 0.35) {
        var root = notes.filter(function (n) { return n.slot === cb * BAR && !n.bass; })[0];
        if (root && root.wire - 2 >= 0) notes.push({ wire: root.wire - 2, slot: root.slot, vel: root.vel * 0.7 });
      }
    return notes;
  }
  function landNote(n, side) {
    var b = addBird(n.wire, n.slot, side);
    if (!b) return null;
    b.vel = n.vel; b.bass = !!n.bass;
    if (b.bass) { b.fat = 1.35; b.s = 1.18; }
    return b;
  }
  // 下一句的鳥落在風身後：風掃過的鳥剛飛走，那裡正空著
  function updateFlock() {
    if (!playing) return;
    for (var i = phraseQueue.length - 1; i >= 0; i--) {
      var n = phraseQueue[i];
      if ((n.slot + 0.5) / SLOTS < phase - 0.06) { landNote(n, n.slot < SLOTS / 2 ? -1 : 1); phraseQueue.splice(i, 1); }
    }
  }
  function onWrap() {
    for (var i = 0; i < phraseQueue.length; i++) landNote(phraseQueue[i], 1);   // 句尾那幾隻一起落
    phraseQueue = composePhrase();
  }
  // 開場：第一句整句落好，再起風
  function seedFlock() {
    var notes = composePhrase().sort(function (a, b) { return a.slot - b.slot; }), delay = 0;
    for (var i = 0; i < notes.length; i++) {
      (function (n, d) { setTimeout(function () { landNote(n, n.slot < SLOTS / 2 ? -1 : 1); }, d); })(notes[i], delay);
      delay += 130;
    }
    phraseQueue = composePhrase();
    return delay;
  }

  /* ============================================================
   * 5. 琴弦
   * ============================================================ */
  var plucked = {};                 // 弦 → 撥動的時刻
  function pressKeyByWire(wire) {
    for (var i = 0; i < STRINGS.length; i++) if (STRINGS[i].wire === wire) { plucked[i] = nowT; return; }
  }
  function keyHit(x, y) {
    if (x < L.longX || x > L.yueX || y < L.qy0 || y > L.qy1) return null;
    var best = -1, bd = (L.sy[1] - L.sy[0]) * 0.55;
    for (var i = 0; i < 7; i++) { var d = Math.abs(y - L.sy[i]); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return null;
    return { id: best, f: STRINGS[best].f, wire: STRINGS[best].wire };
  }

  /* ============================================================
   * 6. 手：右手在岳山旁撥弦，左手在七徽上按弦；按音都在七徽，所以左手只在弦之間上下走；
   *       空弦（低音）時左手抬起。手是寫意的幾筆：袖一抹、掌一團、指幾筆。
   * ============================================================ */
  var handR = { x: 0, y: 0, tx: 0, ty: 0, pluck: 0, init: false };
  var handL = { x: 0, y: 0, tx: 0, ty: 0, press: 0, lifted: true, init: false };
  function stringOfWire(wire) {
    for (var i = 0; i < STRINGS.length; i++) if (STRINGS[i].wire === wire) return i;
    return 4;
  }
  function handPlay(si, open) {
    var len = L.yueX - L.longX;
    handR.tx = L.yueX - len * 0.055; handR.ty = L.sy[si]; handR.pluck = 1;
    if (open) { handL.lifted = true; }
    else { handL.lifted = false; handL.tx = L.yueX - len * HUI[6]; handL.ty = L.sy[si]; handL.press = 1; }
  }
  function updateHands(dt) {
    var len = L.yueX - L.longX, k = 1 - Math.exp(-dt * 16);
    if (!handR.init) { handR.init = handL.init = true; handR.tx = handR.x = L.yueX - len * 0.055; handR.ty = handR.y = L.sy[4]; handL.tx = handL.x = L.yueX - len * HUI[6]; handL.ty = handL.y = L.sy[4]; }
    var breathe = Math.sin(nowT * 1.1) * 1.2;
    var lty = handL.lifted ? L.sy[3] + (L.qy1 - L.qy0) * 0.22 : handL.ty;
    handR.x += (handR.tx - handR.x) * k; handR.y += (handR.ty + breathe - handR.y) * k;
    handL.x += (handL.tx - handL.x) * k; handL.y += (lty + breathe - handL.y) * k;
    handR.pluck = Math.max(0, handR.pluck - dt * 5);
    handL.press = Math.max(0, handL.press - dt * 4);
  }
  // 一隻手：俯視，指尖朝上，食指指尖在原點。輪廓一筆焦墨（有提按），掌心一層淡墨，袖子枯筆往畫外去。
  // dir = 1 右手（拇指在左），-1 左手（鏡像）
  var HAND_OUTLINE = [
    [-6, 78], [-12, 56], [-20, 44], [-27, 34], [-22, 30], [-13, 38], [-6, 34],
    [-4, 18], [-2, 4], [0, 0], [3, 1], [5, 14], [6, 26],
    [9, 14], [11, 8], [14, 7], [17, 11], [18, 26],
    [21, 20], [24, 15], [27, 16], [29, 21], [30, 33],
    [32, 30], [35, 27], [38, 30], [38, 40], [37, 50],
    [36, 62], [30, 80]
  ];
  function drawHand(h, dir, pluck, seed) {
    var HS = clamp((L.qy1 - L.qy0) / 110, 0.65, 1.3);
    var lift = pluck ? -Math.sin(pluck * Math.PI) * 5 : 0;
    ctx.save();
    ctx.translate(h.x, h.y + lift);
    ctx.scale(dir * HS, HS);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 袖：枯筆一抹，往畫外去
    ribbonStroke([[6, 80], [12, 120], [20, 170], [28, 230]], 42, INK_L, 0.5, seed + 1, 1.5, true);
    dryStroke([[-12, 90], [-4, 140], [6, 200]], 2.2, INK_D, 0.6, seed + 2, 2, 0.6);
    dryStroke([[26, 86], [32, 140], [40, 200]], 2.2, INK_D, 0.6, seed + 3, 2, 0.6);
    // 掌心：淡墨一層
    ctx.fillStyle = 'rgba(' + INK_L + ',0.42)';
    ctx.beginPath(); smoothPath(HAND_OUTLINE, true); ctx.fill();
    // 輪廓：焦墨，一筆有提按
    var pts = HAND_OUTLINE.concat([HAND_OUTLINE[0]]);
    ribbonStroke(pts, 1.7, INK_D, 0.88, seed, 1.1, true);
    // 指根幾道短痕、指尖一點
    ctx.strokeStyle = 'rgba(' + INK_D + ',0.5)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(7, 30); ctx.lineTo(8, 40); ctx.moveTo(19, 30); ctx.lineTo(20, 40); ctx.moveTo(31, 36); ctx.lineTo(32, 46); ctx.stroke();
    ctx.fillStyle = 'rgba(' + INK_D + ',0.9)';
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawHands() {
    if (!handR.init) return;
    drawHand(handL, -1, 0, 11);
    drawHand(handR, 1, handR.pluck, 23);
  }

  /* ============================================================
   * 7. 聲
   * ============================================================ */
  var audio = { ctx: null, master: null, dry: null };
  function initAudio() {
    if (audio.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = audio.ctx = new AC();
    audio.master = ac.createGain(); audio.master.gain.value = 0.8;
    audio.master.connect(ac.destination);
    // 混響：合成一段衰減的噪聲當脈衝
    var rl = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, rl, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var dd = ir.getChannelData(ch);
      for (var i = 0; i < rl; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6);
    }
    var conv = ac.createConvolver(); conv.buffer = ir;
    var wet = ac.createGain(); wet.gain.value = 0.32;
    audio.dry = ac.createGain(); audio.dry.gain.value = 1;
    audio.dry.connect(audio.master); audio.dry.connect(conv); conv.connect(wet); wet.connect(audio.master);
    // 風：濾過的噪聲，慢慢起伏
    var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (var k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
    var wg = ac.createGain(); wg.gain.value = 0.035;
    var lfo = ac.createOscillator(); lfo.frequency.value = 0.09;
    var lg = ac.createGain(); lg.gain.value = 0.022;
    lfo.connect(lg); lg.connect(wg.gain);
    src.connect(lp); lp.connect(wg); wg.connect(audio.master);
    src.start(); lfo.start();
  }
  // 瀏覽器要手勢才肯出聲：任何一次點、按、觸都算；點過這個域名的話，重開也會直接放行
  function unlockAudio() {
    initAudio();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  }
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);
  setInterval(function () { if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); }, 1500);

  // 拨弦：Karplus-Strong 離線合成成一段 buffer（緩存），絲弦的暗、長、微微的雜音都在裡面
  var pluckCache = {};
  function pluckBuffer(freq, len) {
    var key = Math.round(freq) + ':' + len;
    if (pluckCache[key]) return pluckCache[key];
    var ac = audio.ctx, sr = ac.sampleRate, N = Math.floor(sr * len), p = Math.round(sr / freq);
    var buf = ac.createBuffer(1, N, sr), d = buf.getChannelData(0);
    var ring = new Float32Array(p);
    for (var i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
    for (var pass = 0; pass < 2; pass++)                              // 先把激勵抹軟一點，丝弦不亮
      for (var k = 1; k < p; k++) ring[k] = (ring[k] + ring[k - 1]) * 0.5;
    var decay = Math.pow(0.001, 1 / (sr * (len * 0.85)));           // 到尾巴衰到 -60dB
    var idx = 0, prev = 0;
    for (var n = 0; n < N; n++) {
      var cur = ring[idx], nxt = ring[(idx + 1) % p];
      var v = (cur + nxt) * 0.5 * decay;
      ring[idx] = v; idx = (idx + 1) % p;
      d[n] = v * 0.7 + prev * 0.3; prev = d[n];                        // 再壓一下高頻
    }
    pluckCache[key] = buf;
    return buf;
  }
  function playNote(freq, vel, len) {
    if (!audio.ctx || audio.ctx.state !== 'running') return;
    len = len || 2.2;
    var ac = audio.ctx, t = ac.currentTime;
    var src = ac.createBufferSource(); src.buffer = pluckBuffer(freq, len);
    var g = ac.createGain(); g.gain.value = 0.9 * vel;
    var body = ac.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 2600 + vel * 1800; body.Q.value = 0.5;
    src.connect(body); body.connect(g); g.connect(audio.dry);
    src.start(t); src.stop(t + len);
    // 指甲觸弦的一點噪聲
    var nb = ac.createBufferSource(); nb.buffer = pluckBuffer(freq * 3.1, 0.06);
    var ng = ac.createGain(); ng.gain.value = 0.12 * vel;
    nb.connect(ng); ng.connect(audio.dry); nb.start(t); nb.stop(t + 0.06);
  }
  function chirp(vol) {
    if (!audio.ctx || audio.ctx.state !== 'running') return;
    var ac = audio.ctx, t = ac.currentTime + Math.random() * 0.05;
    var o = ac.createOscillator(), g = ac.createGain();
    var f0 = rand(2600, 3800);
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045 * vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(audio.dry); o.start(t); o.stop(t + 0.16);
  }

  /* ============================================================
   * 8. 渲染。靜態的紙、天、雲、山、日、杆、琴在 resize 時畫一次存成底層；
   *    每幀只畫風、線、鳥、弦、手。筆觸全是程序畫的：枯筆 = 多條不等寬筆毫沿同一路徑、各有缺墨段。
   * ============================================================ */
  var bg = document.createElement('canvas'), bgc = bg.getContext('2d');

  // 經過一串點的平滑路徑（接在當前 ctx 路徑上）
  function smoothPath(pts, close) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    var n = pts.length;
    for (var i = 1; i < n - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    if (close) ctx.closePath();
  }
  // 把折線按弧長重取樣
  function resample(pts, step) {
    var out = [pts[0].slice()], carry = 0;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
      var len = Math.hypot(bx - ax, by - ay), t = carry;
      while (t < len) { out.push([ax + (bx - ax) * t / len, ay + (by - ay) * t / len]); t += step; }
      carry = t - len;
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  // 有提按的一筆：寬度沿路徑慢慢變，起筆略頓、收筆收尖；用帶狀多邊形填出來
  function ribbonStroke(pts, baseW, rgb, alpha, seed, wobble, closed) {
    var rnd = srand(seed), P = resample(pts, 1.2), n = P.length, left = [], right = [];
    var ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, f1 = 0.08 + rnd() * 0.06, f2 = 0.021 + rnd() * 0.02;
    for (var i = 0; i < n; i++) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      var u = i / (n - 1);
      var press = closed ? 1 : (0.55 + 0.45 * Math.sin(Math.min(1, u * 8) * 1.57)) * (u > 0.85 ? (1 - u) / 0.15 * 0.8 + 0.2 : 1);
      var w = baseW * press * (1 + 0.35 * Math.sin(i * f1 + ph1) * Math.sin(i * f2 + ph2));
      var jitter = (Math.sin(i * 0.37 + ph1) * 0.5 + Math.sin(i * 0.11 + ph2) * 0.5) * (wobble || 0);
      left.push([P[i][0] + nx * (w / 2 + jitter), P[i][1] + ny * (w / 2 + jitter)]);
      right.push([P[i][0] - nx * (w / 2 - jitter), P[i][1] - ny * (w / 2 - jitter)]);
    }
    ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (var k = 1; k < n; k++) ctx.lineTo(left[k][0], left[k][1]);
    for (var m = n - 1; m >= 0; m--) ctx.lineTo(right[m][0], right[m][1]);
    ctx.closePath(); ctx.fill();
  }
  // 枯筆：hairs 條不等寬筆毫沿同一路徑，各自偏移、各自有缺墨段（缺墨處直接露紙）
  function dryStroke(pts, width, rgb, alpha, seed, hairs, dryness) {
    var rnd = srand(seed), P = resample(pts, 1.5), n = P.length;
    ctx.lineCap = 'round';
    for (var h = 0; h < hairs; h++) {
      var off = (rnd() - 0.5) * width * 0.9, lw = width / hairs * (0.5 + rnd() * 1.3), al = alpha * (0.5 + rnd() * 0.6);
      var inkLeft = 10 + rnd() * 40, gapLeft = 0, drawing = true;
      ctx.strokeStyle = 'rgba(' + rgb + ',' + al.toFixed(3) + ')'; ctx.lineWidth = lw;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < n; i++) {
        var a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        var x = P[i][0] + nx * off, y = P[i][1] + ny * off;
        if (drawing) {
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          inkLeft -= 1.5;
          if (inkLeft <= 0) { drawing = false; started = false; gapLeft = 0.8 + rnd() * 4 * dryness; }
        } else {
          gapLeft -= 1.5;
          if (gapLeft <= 0) { drawing = true; inkLeft = 8 + rnd() * 50 * (1.2 - dryness); }
        }
      }
      ctx.stroke();
    }
  }
  // 失圓的濃墨一點
  function inkDot(x, y, r, rgb, alpha, seed) {
    var rnd = srand(seed);
    ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')';
    ctx.beginPath();
    for (var i = 0; i <= 14; i++) {
      var a = i / 14 * TAU, rr = r * (0.86 + rnd() * 0.28);
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---- 靜態底層 ----
  function buildBackground() {
    bg.width = canvas.width; bg.height = canvas.height;
    var main = ctx; ctx = bgc;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawPaper();
    drawSkyWash();
    drawClouds();
    drawDistantWash();
    drawSun();
    drawGroundLine();
    drawPoles();
    drawWireLabels();
    drawQinBody();
    ctx = main;
  }
  // 紙：細粒 + 纖維，全幅
  function drawPaper() {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    var img = ctx.getImageData(0, 0, bg.width, bg.height), d = img.data, rnd = srand(7);
    for (var i = 0; i < d.length; i += 4) {
      var g = (rnd() - 0.5) * 9;
      d[i] += g; d[i + 1] += g; d[i + 2] += g * 0.9;
    }
    ctx.putImageData(img, 0, 0);
    var nF = Math.floor(W * H / 1000 * 2.2), r2 = srand(13);
    ctx.lineCap = 'round';
    for (var k = 0; k < nF; k++) {
      var x = r2() * W, y = r2() * H, len = 3 + r2() * 7, ang = (r2() - 0.5) * 1.2 + (r2() < 0.5 ? 0 : 3.14);
      ctx.strokeStyle = 'rgba(' + INK_M + ',' + (0.05 + r2() * 0.08).toFixed(3) + ')'; ctx.lineWidth = 0.3 + r2() * 0.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
  }
  // 天：一層極淡、不均勻的藤黃染
  function drawSkyWash() {
    var rnd = srand(21);
    for (var i = 0; i < 8; i++) {
      var y = rnd() * L.groundY * 0.75, w = W * (0.4 + rnd() * 0.4), h = 60 + rnd() * 90, x = rnd() * W;
      ctx.fillStyle = 'rgba(' + GAMBOGE + ',' + (0.025 + rnd() * 0.03).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, TAU); ctx.fill();
    }
  }
  // 雲：幾筆扁長的枯筆橫掃
  function drawClouds() {
    var rnd = srand(31);
    var rows = [[0.07, 0.25, 0.1], [0.13, 0.5, 0.18], [0.19, 0.78, 0.14], [0.23, 0.9, 0.12]];
    for (var i = 0; i < rows.length; i++) {
      var y = H * rows[i][0], x0 = W * rows[i][1] - W * rows[i][2], x1 = W * rows[i][1] + W * rows[i][2];
      var pts = [];
      for (var k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y + Math.sin(k * 1.3 + i) * 2.5]);
      ribbonStroke(pts, 7 + rnd() * 5, INK_L, 0.38, 100 + i, 1.2, false);
      dryStroke(pts, 10 + rnd() * 6, INK_L, 0.3, 120 + i, 3, 0.3);
    }
  }
  // 遠山：淡墨拖出來的低山，裡面是橫向枯筆的拖痕
  function drawDistantWash() {
    var gy = L.groundY;
    function hills() {
      ctx.beginPath(); ctx.moveTo(-W * 0.02, gy);
      ctx.quadraticCurveTo(W * 0.16, gy - H * 0.1, W * 0.3, gy - H * 0.04);
      ctx.quadraticCurveTo(W * 0.42, gy - H * 0.11, W * 0.55, gy - H * 0.03);
      ctx.lineTo(W * 0.55, gy); ctx.closePath();
      ctx.moveTo(W * 0.6, gy);
      ctx.quadraticCurveTo(W * 0.74, gy - H * 0.14, W * 0.84, gy - H * 0.05);
      ctx.quadraticCurveTo(W * 0.92, gy - H * 0.12, W * 1.02, gy - H * 0.02);
      ctx.lineTo(W * 1.02, gy); ctx.closePath();
    }
    ctx.save(); hills(); ctx.clip();
    ctx.fillStyle = 'rgba(' + INK_L + ',0.4)'; ctx.fillRect(0, gy - H * 0.16, W, H * 0.17);
    for (var k = 0; k < 7; k++) {
      var y = gy - H * 0.14 + k * H * 0.02;
      dryStroke([[0, y], [W * 0.5, y + 2], [W, y]], 6, INK_L, 0.45, 200 + k, 4, 0.4);
    }
    ctx.restore();
  }
  // 夕陽：灰赭一面，橫向乾擦出來，帶一點飛白
  function drawSun() {
    ctx.save();
    ctx.beginPath(); ctx.arc(L.sunX, L.sunY, L.sunR, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(' + OCHRE + ',0.55)'; ctx.fillRect(L.sunX - L.sunR, L.sunY - L.sunR, L.sunR * 2, L.sunR * 2);
    for (var y = L.sunY - L.sunR, k = 0; y <= L.sunY + L.sunR; y += 2.2, k++)
      dryStroke([[L.sunX - L.sunR - 4, y], [L.sunX + L.sunR + 4, y]], 2.4, OCHRE, 0.45, 300 + k, 2, 0.55);
    ctx.restore();
    inkDot(L.sunX, L.sunY, L.sunR, OCHRE, 0.12, 301);
  }
  function drawGroundLine() {
    ribbonStroke([[0, L.groundY + 4], [W * 0.5, L.groundY + 5], [W, L.groundY + 4]], 1.1, INK_M, 0.35, 41, 0.4, true);
  }
  // 電線杆：焦墨枯筆，杆頂、橫擔端要硬、有斷續
  function drawPoles() {
    var xs = [L.wx0, L.wx1];
    for (var i = 0; i < 2; i++) {
      var x = xs[i], sd = 400 + i * 10;
      dryStroke([[x, L.poleTop], [x + (i ? -0.6 : 0.6), (L.poleTop + L.groundY) / 2], [x, L.groundY + 6]], 5.5, INK_D, 0.92, sd, 8, 0.8);
      var a1 = L.poleTop + L.gap * 0.45, a2 = L.poleTop + L.gap * 1.6;
      dryStroke([[x - L.gap * 0.95, a1 + 0.5], [x + L.gap * 0.95, a1 - 0.5]], 3.4, INK_D, 0.9, sd + 1, 5, 0.65);
      dryStroke([[x - L.gap * 0.8, a2], [x + L.gap * 0.8, a2]], 3, INK_D, 0.9, sd + 2, 5, 0.65);
      for (var k = -1; k <= 1; k += 2) {
        inkDot(x + k * L.gap * 0.7, a1 - 3.5, 2.4, INK_D, 0.85, sd + 3 + k);
        inkDot(x + k * L.gap * 0.55, a2 - 3.5, 2.4, INK_D, 0.85, sd + 6 + k);
      }
    }
  }
  function drawWireLabels() {
    ctx.fillStyle = 'rgba(' + OCHRE + ',0.75)';
    ctx.font = Math.round(13 * clamp(BS * 1.6, 0.9, 1.4)) + 'px "Songti SC","STSong","SimSun","Noto Serif SC",serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var i = 0; i < 5; i++) ctx.fillText(WIRE_NAMES[i], L.wx0 - L.gap * 1.05, L.wireY[i]);
  }
  // 琴身：大部分留紙白，靠枯墨邊、岳山與十三徽成立
  function drawQinBody() {
    var x0 = L.qx0, x1 = L.qx1, y0 = L.qy0, y1 = L.qy1, h = y1 - y0;
    var outline = [[x0, y0 + h * 0.08], [(x0 + x1) * 0.5, y0 - h * 0.02], [x1, y0], [x1, y1], [(x0 + x1) * 0.5, y1 + h * 0.02], [x0, y1 - h * 0.08], [x0, y0 + h * 0.08]];
    // 琴面：極薄的兩三道橫掃
    ctx.save(); ctx.beginPath(); smoothPath(outline, true); ctx.clip();
    for (var k = 0; k < 2; k++) {
      var yy = y0 + h * (0.3 + k * 0.4);
      dryStroke([[x0 + 30, yy], [x1 - 30, yy + 2]], h * 0.14, INK_L, 0.07, 500 + k, 3, 0.3);
    }
    ctx.restore();
    // 琴緣：焦墨枯筆
    dryStroke(outline, 3.4, INK_D, 0.9, 510, 8, 0.8);
    // 岳山、龍齦
    dryStroke([[L.yueX, y0 + h * 0.06], [L.yueX, y1 - h * 0.06]], 4.5, INK_D, 0.92, 520, 5, 0.45);
    dryStroke([[L.longX, y0 + h * 0.14], [L.longX, y1 - h * 0.14]], 2, INK_D, 0.85, 521, 3, 0.5);
    // 十三徽
    var len = L.yueX - L.longX;
    for (var hI = 0; hI < HUI.length; hI++)
      inkDot(L.yueX - len * HUI[hI], y0 + h * 0.07, hI === 6 ? 2.7 : 2, INK_D, 0.8, 530 + hI);
    // 宮商角徵羽
    ctx.fillStyle = 'rgba(' + OCHRE + ',0.75)';
    ctx.font = Math.round(clamp((L.sy[1] - L.sy[0]) * 0.8, 9, 13)) + 'px "Songti SC","STSong","SimSun","Noto Serif SC",serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var i = 0; i < 7; i++) if (STRINGS[i].wire !== undefined) ctx.fillText(WIRE_NAMES[STRINGS[i].wire], L.longX - 9, L.sy[i]);
  }

  // ---- 每幀 ----
  function render() {
    ctx.drawImage(bg, 0, 0, W, H);
    drawSwallows();
    if (Math.random() < 0.03) spawnPetal();
    drawPetals();
    drawPlayhead();
    drawWires();
    for (var i = 0; i < birds.length; i++) drawBird(birds[i]);
    drawStrings();
    drawHands();
  }
  function drawSwallows() {
    for (var i = 0; i < swallows.length; i++) {
      var s = swallows[i]; s.x += 0.55 * s.z; s.flap += 0.15;
      if (s.x > W + 40) s.x = -40;
      var wingUp = Math.sin(s.flap) * 0.5 + 0.5;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.s, s.s);
      ctx.strokeStyle = 'rgba(' + INK_D + ',0.6)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      var yb = -6 * wingUp;
      ctx.beginPath(); ctx.moveTo(-9, yb); ctx.quadraticCurveTo(-3, 2, 0, 0); ctx.quadraticCurveTo(3, 2, 9, yb); ctx.stroke();
      ctx.restore();
    }
  }
  function spawnPetal() {
    petals.push({ x: -20, y: rand(H * 0.1, H * 0.6), vy: rand(6, 16), rot: rand(0, TAU), spin: rand(-1.4, 1.4), size: rand(3, 6), sway: rand(0, TAU), op: rand(0.3, 0.6) });
  }
  function drawPetals() {
    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i]; p.sway += 0.05; p.rot += p.spin * 0.03;
      p.x += (9 + Math.sin(p.sway) * 6) * 0.16; p.y += p.vy * 0.096 + Math.sin(p.sway) * 0.3;
      if (p.x > W + 30 || p.y > H + 30) { petals.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(' + OCHRE + ',' + p.op + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  // 五根線：細而連續，微微提按，少飛白；一打開從左到右牽出來
  var ink = 0;
  function drawWires() {
    for (var i = 0; i < 5; i++) {
      var pi = clamp(ink * 1.5 - i * 0.12, 0, 1);
      if (pi <= 0) continue;
      var pts = [], n = 48;
      for (var k = 0; k <= n; k++) { var u = k / n * pi, x = lerp(L.wx0, L.wx1, u); pts.push([x, wireYAt(i, x)]); }
      ribbonStroke(pts, 1.25, INK_D, 0.82 * (0.5 + 0.5 * pi), 600 + i, 0.35, true);
      dryStroke(pts, 1.6, INK_M, 0.25, 610 + i, 1, 0.5);
    }
  }
  // 風：一道淡淡的豎向墨痕
  function drawPlayhead() {
    if (!playing) return;
    var x = L.wx0 + phase * (L.wx1 - L.wx0);
    var y0 = L.poleTop, y1 = L.groundY;
    var g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    g.addColorStop(0, 'rgba(' + INK_M + ',0)'); g.addColorStop(0.5, 'rgba(' + INK_M + ',0.08)'); g.addColorStop(1, 'rgba(' + INK_M + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - 18, y0, 36, y1 - y0);
    inkDot(x, y1 + 4, 2.4, OCHRE, 0.8, 700);
  }
  // 鳥：三筆。焦墨一點是頭，煙灰一掃是身，枯筆一撇是尾。
  function drawBird(b) {
    var flying = b.state !== 'perched';
    var hopY = b.hop > 0 ? -Math.sin(b.hop * Math.PI) * 9 * BS : 0;
    if (b.seed === undefined) b.seed = Math.floor(Math.random() * 10000);
    ctx.save();
    ctx.translate(b.x, b.y + hopY);
    var face = flying ? (b.state === 'leaving' ? b.face : (b.px > b.x0 ? 1 : -1)) : b.face;
    ctx.scale(face * BS * b.s, BS * b.s);
    ctx.rotate(-b.tilt);
    ctx.lineCap = 'round';
    if (flying) {
      var w = Math.sin(b.flap);
      ctx.fillStyle = 'rgba(' + INK_M + ',0.7)';
      ctx.beginPath(); ctx.moveTo(10, -9); ctx.bezierCurveTo(2, -14, -8, -12, -16, -6); ctx.bezierCurveTo(-8, -4, 0, -3, 8, -6); ctx.closePath(); ctx.fill();
      inkDot(11, -10, 4.2, INK_D, 0.92, b.seed);
      ctx.strokeStyle = 'rgba(' + INK_D + ',0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-1, -9); ctx.quadraticCurveTo(2, -10 - 12 * w, 13, -12 - 18 * w); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-8, -9 - 10 * w, -17, -10 - 16 * w); ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-23, -3); ctx.stroke();
    } else {
      ctx.save(); ctx.scale(1, b.fat);
      ctx.fillStyle = 'rgba(' + INK_M + ',0.78)';
      ctx.beginPath(); ctx.moveTo(11, -12); ctx.bezierCurveTo(2, -18, -8, -14, -16, -5); ctx.bezierCurveTo(-10, -3, -2, -2, 8, -5); ctx.closePath(); ctx.fill();
      ctx.restore();
      inkDot(12, -13 * b.fat, 4.8, INK_D, 0.94, b.seed);
      ctx.strokeStyle = 'rgba(' + INK_D + ',0.85)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(16, -13 * b.fat); ctx.lineTo(21, -12 * b.fat); ctx.stroke();
      dryStroke([[-15, -5], [-21, -3 - b.tailA * 20], [-27, -1 - b.tailA * 30]], 2.2, INK_D, 0.85, b.seed + 1, 2, 0.6);
      if (b.hop > 0) {
        var k = Math.sin(b.hop * Math.PI);
        ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(' + INK_D + ',0.7)';
        ctx.beginPath(); ctx.moveTo(-2, -11); ctx.quadraticCurveTo(1, -14 - 10 * k, 9, -17 - 14 * k); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 七弦：煙灰細線；撥到的弦顫，泛一點灰赭
  function drawStrings() {
    for (var i = 0; i < 7; i++) {
      var y = L.sy[i], pt = plucked[i], a = 0;
      if (pt !== undefined) { a = clamp(1 - (nowT - pt) / 0.9, 0, 1); if (a <= 0) delete plucked[i]; }
      ctx.strokeStyle = a > 0 ? 'rgba(' + OCHRE + ',' + (0.5 + 0.45 * a) + ')' : 'rgba(' + INK_M + ',' + (0.7 + i * 0.03) + ')';
      ctx.lineWidth = 1.3 - i * 0.06;
      ctx.beginPath(); ctx.moveTo(L.longX, y);
      if (a > 0) {
        var amp = 2.6 * a * a, n = 36;
        for (var k = 1; k <= n; k++) {
          var u = k / n, xx = lerp(L.longX, L.yueX, u);
          ctx.lineTo(xx, y + Math.sin(u * Math.PI) * Math.sin(nowT * 140 + i) * amp);
        }
      } else ctx.lineTo(L.yueX, y);
      ctx.stroke();
    }
  }

  /* ============================================================
   * 9. 交互：點線落鳥、點鳥驚飛、彈琴喚鳥（都不說明，自己發現）
   * ============================================================ */
  function birdHit(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i]; if (b.state !== 'perched') continue;
      var d = Math.hypot(x - b.x, y - (b.y - 9 * BS));
      if (d < Math.max(14, 24 * BS) && d < bd) { best = b; bd = d; }
    }
    return best;
  }
  function wireHit(x, y) {
    if (ink < 1 || x < L.wx0 || x > L.wx1) return -1;
    var best = -1, bd = L.gap * 0.5;
    for (var i = 0; i < 5; i++) {
      var d = Math.abs(y - wireYAt(i, x));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function xToSlot(x) { return clamp(Math.floor((x - L.wx0) / (L.wx1 - L.wx0) * SLOTS), 0, SLOTS - 1); }

  canvas.addEventListener('pointerdown', function (e) {
    var x = e.clientX, y = e.clientY;
    var b = birdHit(x, y);
    if (b) { scareBird(b); return; }
    var k = keyHit(x, y);
    if (k) {
      plucked[k.id] = nowT; playNote(k.f, 0.9, 3.5); handPlay(k.id, true);
      if (k.wire !== undefined) {
        var slot = playing ? Math.round(phase * SLOTS) % SLOTS : xToSlot(x);
        if (!birdAt(k.wire, slot)) { var nb1 = addBird(k.wire, slot, x < W / 2 ? -1 : 1); if (nb1) nb1.vel = velAt(slot); }
      }
      return;
    }
    var w = wireHit(x, y);
    if (w >= 0) {
      var s = xToSlot(x);
      if (birdAt(w, s)) { scareBird(birdAt(w, s)); return; }
      var nb2 = addBird(w, s, x < W / 2 ? -1 : 1); if (nb2) nb2.vel = velAt(s);
      playNote(WIRE_FREQ[w], 0.5, 2.2);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    var over = birdHit(e.clientX, e.clientY) || keyHit(e.clientX, e.clientY);
    canvas.classList.toggle('over-bird', !!over);
  });

  // 鍵盤：[ ] 調一輪快慢；空格 停 / 續
  window.addEventListener('keydown', function (e) {
    if (e.key === '[') loopSec = clamp(loopSec + 1, 5, 20);
    else if (e.key === ']') loopSec = clamp(loopSec - 1, 5, 20);
    else if (e.key === ' ') { e.preventDefault(); playing = !playing; }
  });

  /* ============================================================
   * 10. 主循環 & 開場：線牽出來，鳥飛回來
   * ============================================================ */
  var nowT = 0, last = 0, inkStart = -1;
  function frame(ts) {
    var t = ts / 1000;
    var dt = last ? clamp(t - last, 0, 0.033) : 0.016;
    last = t; nowT = t;
    if (inkStart < 0) {
      inkStart = t + 0.3;
      var seedDelay = seedFlock();
      setTimeout(function () { playing = true; }, Math.max(seedDelay * 0.6, 2000));
    }
    if (ink < 1) ink = clamp((t - inkStart) / 1.6, 0, 1);
    updateLoop(dt);
    updateBirds(dt);
    updateFlock();
    updateHands(dt);
    render();
    requestAnimationFrame(frame);
  }

  resize();
  initAudio();
  requestAnimationFrame(frame);

  // 截圖用：?demo 線已牽好、一句已在線上
  if (/[?&]demo/.test(location.search)) {
    ink = 1; inkStart = 0; playing = true; phase = 0.42;
    var dn = composePhrase();
    for (var q = 0; q < dn.length; q++) landNote(dn[q], 1);
    for (var r = 0; r < birds.length; r++) { birds[r].state = 'perched'; settleBird(birds[r]); birds[r].face = Math.random() < 0.6 ? 1 : -1; }
    phraseQueue = composePhrase();
  }
})();
