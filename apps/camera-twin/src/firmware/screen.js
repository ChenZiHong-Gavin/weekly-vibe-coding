// Draws the rear LCD / EVF picture for a firmware state onto a 2D canvas (3:2). Pure canvas, no Three.js.
import { fmtEc } from './state.js';

export const SCREEN_W = 960, SCREEN_H = 640;

export function createScreenRenderer(canvas, fw) {
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');
  const W = SCREEN_W, H = SCREEN_H;
  const font = (px, weight = 500) => `${weight} ${px}px -apple-system, "PingFang SC", "Helvetica Neue", Arial, sans-serif`;
  const scene = document.createElement('canvas'); scene.width = W; scene.height = H; paintScene(scene.getContext('2d'), W, H);
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H; paintScene(bg.getContext('2d'), W, H, 'bg');
  const fg = document.createElement('canvas'); fg.width = W; fg.height = H; paintScene(fg.getContext('2d'), W, H, 'fg');
  const supportsFilter = 'filter' in ctx;

  function draw() {
    const d = fw.display();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (d.power === 'off' || d.screen === 'off') { ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H); return d; }
    if (d.screen === 'menu') drawMenu(d);
    else if (d.screen === 'playback') drawPlayback(d);
    else { drawLiveView(d); if (d.screen === 'quick') drawQuick(d); }
    if (d.dialog) drawDialog(d.dialog);
    if (d.toast) drawToast(d.toast);
    return d;
  }
  function drawLiveView(d) {
    const { brightness } = fw.exposure();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // depth of field: wide apertures blur the far hills, the tree in front stays sharp
    const N = parseFloat(d.aperture), blur = supportsFilter ? Math.max(0, 7 - N * 0.45) : 0;
    if (blur > 0.3) { ctx.filter = `blur(${blur.toFixed(1)}px)`; ctx.drawImage(bg, 0, 0); ctx.filter = 'none'; ctx.drawImage(fg, 0, 0); } else ctx.drawImage(scene, 0, 0);
    // exposure: multiply / screen via alpha overlays (keeps it cheap and obviously wrong when 5 stops off)
    if (brightness < 1) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.97, 1 - brightness)})`; ctx.fillRect(0, 0, W, H); }
    else if (brightness > 1) { ctx.fillStyle = `rgba(255,252,240,${Math.min(0.95, 1 - 1 / brightness)})`; ctx.fillRect(0, 0, W, H); }
    if (d.stillMovie === 'movie') { // 16:9 letterbox like the movie standby screen
      ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, 50); ctx.fillRect(0, H - 50, W, 50);
      if (d.recording !== null) { ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(40, H / 2 - 230, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = font(26, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('REC  ' + tc(d.recording), 62, H / 2 - 230); }
      else { ctx.fillStyle = '#fff'; ctx.font = font(24, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('STBY  00:00:00', 30, H / 2 - 230); }
    }
    if (d.timer !== null) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = font(160, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(d.timer), W / 2, H / 2); }
    if (d.infoLevel === 0) return;
    // AF frame: shape follows the AF area setting
    ctx.strokeStyle = d.afLocked ? '#3ddc5a' : '#ffffff'; ctx.lineWidth = 3;
    if (d.afArea === '整个区域') { for (const [x, y] of [[40, 70], [W - 40, 70], [40, H - 90], [W - 40, H - 90]]) { ctx.beginPath(); ctx.moveTo(x + (x < W / 2 ? 0 : -24), y); ctx.lineTo(x + (x < W / 2 ? 24 : 0), y); ctx.moveTo(x, y + (y < H / 2 ? 0 : -24)); ctx.lineTo(x, y + (y < H / 2 ? 24 : 0)); ctx.stroke(); } }
    else if (d.afArea === '定点自动对焦') ctx.strokeRect(W / 2 - 24, H / 2 - 18, 48, 36);
    else if (d.afArea.startsWith('灵活')) ctx.strokeRect(W / 2 - 150, H / 2 - 90, 300, 180);
    else ctx.strokeRect(W / 2 - 70, H / 2 - 48, 140, 96);
    if (d.aeLock) { ctx.fillStyle = '#ffd23f'; ctx.font = font(30, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('✱', 22, 90); }
    // top bar
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = '#fff'; ctx.font = font(24, 600); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const top = d.stillMovie === 'movie' ? [d.movieSize, d.af, d.wb, 'IS ' + d.is] : [d.af, d.drive, d.wb, d.quality, d.metering];
    let x = 22; for (const t of top) { if (!t) continue; ctx.fillText(t, x, 27); x += ctx.measureText(t).width + 36; }
    ctx.textAlign = 'right'; ctx.fillText(d.stillMovie === 'movie' ? '2:14:35' : `[${d.remaining}]`, W - 22, 27);
    // bottom bar
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H - 76, W, 76);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = font(30, 700); ctx.fillText(d.mode, 22, H - 38);
    ctx.font = font(34, 600);
    ctx.fillStyle = d.shutterAuto ? '#9fb3c8' : '#fff'; ctx.fillText(d.shutter, 110, H - 38);
    ctx.fillStyle = d.apertureAuto ? '#9fb3c8' : '#fff'; ctx.fillText('F' + d.aperture, 270, H - 38);
    // EC scale
    const sx = 420, sy = H - 38; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 216, sy); ctx.stroke();
    for (let i = -3; i <= 3; i++) { const tx = sx + 108 + i * 36; ctx.beginPath(); ctx.moveTo(tx, sy - (i % 3 === 0 ? 12 : 6)); ctx.lineTo(tx, sy + (i % 3 === 0 ? 12 : 6)); ctx.stroke(); }
    ctx.font = font(18, 600); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('-3', sx, sy - 24); ctx.fillText('+3', sx + 216, sy - 24);
    const ecx = sx + 108 + (d.ec / 3) * 36; ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(ecx, sy + 4); ctx.lineTo(ecx - 8, sy + 20); ctx.lineTo(ecx + 8, sy + 20); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = font(30, 600); ctx.fillStyle = '#fff'; ctx.fillText('ISO ' + d.iso, 680, H - 38);
    ctx.textAlign = 'right'; ctx.font = font(22, 500); ctx.fillText('▮▮▮▯', W - 22, H - 38);
    if (d.infoLevel === 2) { // histogram-ish + level
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W - 230, 70, 208, 110); ctx.fillStyle = '#ddd';
      const { stops } = fw.exposure(); for (let i = 0; i < 26; i++) { const c = (i - 13) / 13 - stops / 4; const h = Math.max(4, 90 * Math.exp(-c * c * 6)); ctx.fillRect(W - 226 + i * 8, 176 - h, 6, h); }
    }
  }
  function drawMenu(d) {
    const v = fw.menuView();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // main tab icon row, as on the real camera: current tab's icon sits on a coloured block
    const ICON = { shoot: '📷', af: 'AF', play: '▶', net: '(( ))', setup: '🔧', ctrl: '◎', cfn: 'C.Fn', my: '★' };
    const tabW = W / v.tabs.length;
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(0, 0, W, 64);
    v.tabs.forEach((t, i) => { const x = i * tabW; if (i === v.tab) { ctx.fillStyle = t.color; ctx.fillRect(x + 4, 4, tabW - 8, 56); } ctx.fillStyle = i === v.tab ? '#fff' : '#bdbdc0'; ctx.font = font(ICON[t.id].length > 2 ? 22 : 30, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ICON[t.id], x + tabW / 2, 33); });
    // secondary tab title bar with page counter
    ctx.fillStyle = '#3b3b3e'; ctx.fillRect(0, 64, W, 46);
    ctx.fillStyle = '#fff'; ctx.font = font(24, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(v.pageName, 22, 87);
    ctx.textAlign = 'right'; ctx.fillText(`${v.page + 1}/${v.pages}`, W - 22, 87);
    ctx.fillStyle = v.color; ctx.fillRect(0, 108, W, 3);
    const rowH = 58, y0 = 118;
    v.items.forEach((it, i) => {
      const y = y0 + i * rowH; if (i === v.selected) { ctx.fillStyle = v.color; ctx.fillRect(14, y + 2, W - 28, rowH - 4); }
      ctx.fillStyle = '#fff'; ctx.font = font(27, i === v.selected ? 700 : 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(it.label, 30, y + rowH / 2);
      ctx.textAlign = 'right'; ctx.fillStyle = i === v.selected ? '#fff' : '#d9d9dc'; ctx.font = font(26, 500); ctx.fillText(it.value, W - 30, y + rowH / 2);
      ctx.strokeStyle = '#2e2e30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, y + rowH); ctx.lineTo(W - 14, y + rowH); ctx.stroke();
    });
    if (v.editing) drawOptions(v.editing.label, v.editing.options, v.editing.index, v.color);
    return d;
  }
  // Third level: option list. The current setting is shown in blue, as the manual says.
  function drawOptions(label, options, index, color) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 64, W, H - 64);
    const rowH = 54, visible = Math.min(options.length, 8), h = 60 + visible * rowH + 16, y0 = Math.max(70, (H - h) / 2);
    ctx.fillStyle = '#1c1c1e'; ctx.fillRect(60, y0, W - 120, h); ctx.fillStyle = color; ctx.fillRect(60, y0, W - 120, 52);
    ctx.fillStyle = '#fff'; ctx.font = font(26, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, 80, y0 + 26);
    const start = Math.max(0, Math.min(index - 3, options.length - visible));
    const current = fw.get(label);
    options.slice(start, start + visible).forEach((o, k) => { const i = start + k, y = y0 + 60 + k * rowH; if (i === index) { ctx.fillStyle = '#3a3a3d'; ctx.fillRect(68, y, W - 136, rowH - 4); } ctx.fillStyle = o === current ? '#4fa3ff' : '#fff'; ctx.font = font(26, i === index ? 700 : 500); ctx.fillText(o, 90, y + rowH / 2 - 2); if (o === current) { ctx.textAlign = 'right'; ctx.fillText('●', W - 90, y + rowH / 2 - 2); ctx.textAlign = 'left'; } });
    ctx.fillStyle = '#8a8a8e'; ctx.font = font(18, 500); ctx.fillText('速控转盘1 / 主拨盘 选择 · SET 确定 · MENU 取消', 80, y0 + h - 16);
  }
  function drawDialog(dlg) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
    const w = 640, h = 240, x = (W - w) / 2, y = (H - h) / 2;
    ctx.fillStyle = '#1c1c1e'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.font = font(28, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dlg.title, W / 2, y + 44);
    if (dlg.text) { ctx.font = font(22, 500); ctx.fillStyle = '#d9d9dc'; wrapText(dlg.text, W / 2, y + 96, w - 60, 28); }
    const bw = 200, gap = 24, total = dlg.options.length * bw + (dlg.options.length - 1) * gap; let bx = W / 2 - total / 2;
    dlg.options.forEach((o, i) => { ctx.fillStyle = i === dlg.index ? '#c8412b' : '#3a3a3d'; ctx.fillRect(bx, y + h - 72, bw, 48); ctx.fillStyle = '#fff'; ctx.font = font(24, 600); ctx.fillText(o, bx + bw / 2, y + h - 48); bx += bw + gap; });
  }
  function wrapText(text, cx, y, maxW, lh) { const chars = [...text]; let line = ''; for (const c of chars) { if (ctx.measureText(line + c).width > maxW) { ctx.fillText(line, cx, y); y += lh; line = c; } else line += c; } if (line) ctx.fillText(line, cx, y); }
  const tc = secs => `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  function drawQuick(d) {
    const items = fw.quickView();
    ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 54, W, H - 130);
    const cols = 5, cellW = (W - 40) / cols, cellH = 110;
    items.forEach((it, i) => {
      const cx = 20 + (i % cols) * cellW, cy = 70 + Math.floor(i / cols) * cellH;
      if (it.selected) { ctx.fillStyle = it.editing ? '#c8412b' : '#3d5a80'; ctx.fillRect(cx + 4, cy, cellW - 8, cellH - 10); }
      ctx.fillStyle = it.selected ? '#fff' : '#cfcfd2'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = font(18, 500); ctx.fillText(it.short, cx + 14, cy + 10);
      ctx.fillStyle = '#fff'; ctx.font = font(it.value.length > 6 ? 18 : 26, 700); ctx.fillText(it.value, cx + 14, cy + 44);
    });
    const sel = items.find(i => i.selected);
    ctx.fillStyle = '#fff'; ctx.font = font(20, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(sel.editing ? `${sel.short}：主拨盘 / 速控转盘1 修改 · SET 完成` : '速控屏幕：速控转盘1 选择 · 主拨盘直接修改 · SET 进入 · Q 退出', 24, H - 100);
  }
  function drawPlayback(d) {
    const shots = fw.state.shots, shot = shots[d.playIndex];
    if (!shot) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = font(30, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('没有图像', W / 2, H / 2); return d; }
    if (d.zoom) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(3, 3); ctx.translate(-W / 2, -H / 2); ctx.drawImage(scene, 0, 0); ctx.restore(); }
    else ctx.drawImage(scene, 0, 0);
    const b = shot.exposure.brightness;
    if (b < 1) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.97, 1 - b)})`; ctx.fillRect(0, 0, W, H); } else if (b > 1) { ctx.fillStyle = `rgba(255,252,240,${Math.min(0.95, 1 - 1 / b)})`; ctx.fillRect(0, 0, W, H); }
    if (shot.type === 'movie') { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 20, H / 2 - 30); ctx.lineTo(W / 2 + 34, H / 2); ctx.lineTo(W / 2 - 20, H / 2 + 30); ctx.closePath(); ctx.fill(); }
    if (d.zoom) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W - 150, H - 110, 130, 90); ctx.strokeStyle = '#fff'; ctx.strokeRect(W - 150 + 43, H - 110 + 30, 44, 30); }
    if (d.infoLevel === 0) return d;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, 50); ctx.fillStyle = '#fff'; ctx.font = font(24, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const meta = shot.type === 'movie' ? `${shot.size}  ${tc(shot.seconds)}` : `${shot.mode}  ${shot.shutter}  F${shot.aperture}  ISO ${shot.iso}  ${fmtEc(shot.ec)}`;
    ctx.fillText(`${d.playIndex + 1}/${shots.length}   ${meta}`, 20, 25);
    ctx.textAlign = 'right'; ctx.fillText(`${shot.protected ? '🔒 ' : ''}${shot.rating ? '★'.repeat(shot.rating) + ' ' : ''}${shot.type === 'movie' ? 'MVI' : 'IMG'}_${String(shot.id).padStart(4, '0')}.${shot.type === 'movie' ? 'MP4' : 'CR3'}`, W - 20, 25);
    if (d.infoLevel === 2) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W - 230, 70, 208, 110); ctx.fillStyle = '#ddd'; const st = shot.exposure.stops; for (let i = 0; i < 26; i++) { const c = (i - 13) / 13 - st / 4; const h = Math.max(4, 90 * Math.exp(-c * c * 6)); ctx.fillRect(W - 226 + i * 8, 176 - h, 6, h); } }
    return d;
  }
  function drawToast(text) { ctx.font = font(26, 600); const w = ctx.measureText(text).width + 48; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(W / 2 - w / 2, H / 2 + 90, w, 54); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, W / 2, H / 2 + 117); }
  return { draw, canvas };
}

/** A fixed "world" the lens is looking at: sky, hills, a lake, a tree. Deterministic, no assets. */
function paintScene(g, W, H, layer = 'all') {
  const bgOnly = layer === 'bg', fgOnly = layer === 'fg';
  if (fgOnly) { g.clearRect(0, 0, W, H); paintForeground(g, W, H); return; }
  const sky = g.createLinearGradient(0, 0, 0, H * 0.62); sky.addColorStop(0, '#5f9ad6'); sky.addColorStop(1, '#cfe3f2'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff4c2'; g.beginPath(); g.arc(W * 0.78, H * 0.2, 42, 0, Math.PI * 2); g.fill();
  const cloud = (x, y, s) => { g.fillStyle = 'rgba(255,255,255,.9)'; for (const [dx, dy, r] of [[0, 0, 26], [28, -8, 32], [60, 0, 24], [30, 10, 22]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } };
  cloud(120, 110, 1.2); cloud(420, 80, .9); cloud(700, 140, 1);
  const hills = (color, base, amp, seed) => { g.fillStyle = color; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) { const y = base - amp * (0.6 + 0.4 * Math.sin(x / 90 + seed)) * (0.7 + 0.3 * Math.sin(x / 37 + seed * 2)); g.lineTo(x, y); } g.lineTo(W, H); g.closePath(); g.fill(); };
  hills('#6f8fa8', H * 0.58, 90, 1.3); hills('#4f7f5a', H * 0.66, 70, 3.1); hills('#3e6b46', H * 0.74, 50, 5.7);
  const lake = g.createLinearGradient(0, H * 0.72, 0, H); lake.addColorStop(0, '#6fa8d0'); lake.addColorStop(1, '#2f5f86'); g.fillStyle = lake; g.fillRect(0, H * 0.74, W, H * 0.26);
  g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 18; i++) g.fillRect(W * 0.55 + (i % 5) * 40 + i * 3, H * 0.78 + i * 6, 60 - (i % 4) * 10, 2);
  if (!bgOnly) paintForeground(g, W, H);
}
function paintForeground(g, W, H) {
  g.fillStyle = '#7a6a4f'; g.fillRect(0, H * 0.78, W * 0.42, H * 0.22); g.fillStyle = '#8c7b5c'; g.fillRect(0, H * 0.78, W * 0.42, 6);
  g.fillStyle = '#3b2a1c'; g.fillRect(W * 0.16, H * 0.5, 16, H * 0.3);
  g.fillStyle = '#2f6b33'; for (const [dx, dy, r] of [[8, 0, 62], [-30, 30, 48], [46, 26, 52], [10, 50, 40]]) { g.beginPath(); g.arc(W * 0.16 + 8 + dx, H * 0.48 + dy, r, 0, Math.PI * 2); g.fill(); }
}
