// Records a ~1 minute demo video of the real app, straight into cooking: board work -> mix -> into
// the pot -> stew -> a late ingredient -> reduce -> serve -> back into the pot.
//
// Picture: Chrome's screencast at device scale 2 (sharp text), every frame with its own timestamp,
// assembled into a 1080p H.264 at a high bitrate. A visible cursor and captions are page overlays.
// Sound: the page itself logs when each animation really starts (knife strokes, a piece landing in
// the pot, a pot step, the dish flying to the plate), on the same clock as the frames; then
// tests/demo-audio.py places real recordings (tests/demo-sounds/) on those moments.
//
// Usage: npm run dev, then `node tests/demo-video.mjs [url]` -> docs/video/memory-kitchen-demo.mp4
import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const url = process.argv[2] || 'http://127.0.0.1:5181/';
const W = 1920, H = 1080;
const outDir = 'docs/video';
const work = `${outDir}/.work`;
await rm(work, { recursive: true, force: true });
await mkdir(`${work}/frames`, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const page = await context.newPage();

// Overlays (cursor, caption) and the sound-cue log. Times are epoch ms on the browser's clock.
await page.addInitScript(() => {
  window.__cues = [];
  const now = () => performance.timeOrigin + performance.now();
  const cue = (type, extra = {}) => window.__cues.push({ t: now(), type, ...extra });
  const css = `
    #demo-cursor{position:fixed;z-index:99999;left:-40px;top:-40px;width:30px;height:30px;pointer-events:none;transform:translate(-4px,-3px);transition:transform .08s;filter:drop-shadow(1px 3px 3px #0006)}
    #demo-cursor.down{transform:translate(-4px,-3px) scale(.86)}
    #demo-caption{position:fixed;z-index:99998;left:50%;top:22px;transform:translateX(-50%);pointer-events:none;padding:10px 26px 12px;border-radius:3px;background:#2b241bde;color:#fbf1dd;font:26px/1.5 "Kaiti SC","STKaiti",serif;letter-spacing:.06em;box-shadow:0 8px 20px #0004;opacity:0;transition:opacity .35s;white-space:nowrap}
    #demo-caption small{display:block;font-size:17px;color:#e3cfa8;letter-spacing:.03em;text-align:center}`;
  const setup = () => {
    if (document.getElementById('demo-cursor')) return;
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    const cur = document.createElement('div'); cur.id = 'demo-cursor';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l15 9-6.5 1.5L8 19z" fill="#fffaf0" stroke="#2b241b" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const cap = document.createElement('div'); cap.id = 'demo-caption';
    document.body.append(cur, cap);
    const move = (e) => { cur.style.left = `${e.clientX}px`; cur.style.top = `${e.clientY}px`; };
    for (const ev of ['mousemove', 'dragover', 'drag', 'pointermove']) window.addEventListener(ev, move, true);
    window.addEventListener('mousedown', (e) => {
      cur.classList.add('down');
      if (e.target.closest('button')) cue('click');
      else if (e.target.closest('.photo')) cue('pick');
    }, true);
    window.addEventListener('mouseup', () => cur.classList.remove('down'), true);
    window.addEventListener('dragend', () => cur.classList.remove('down'), true);
    window.addEventListener('drop', (e) => { cur.classList.remove('down'); if (e.target.closest('.photo')) cue('mixdrop'); }, true);

    // A board operation starts playing: knife / pestle timing comes from its plan. Import the very
    // module instance the app loaded (the dev server may have given it a ?t= cache-buster).
    const hook = () => {
      const src = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /\/src\/kitchen\.js(\?|$)/.test(n));
      if (!src) return setTimeout(hook, 50);
      import(src).then((k) => k.onPlay((id) => {
        const live = k.liveOperation(id);
        if (!live) return;
        const plan = live.op.plan || {};
        cue('op', { op: live.op.op, n: plan.n || 0, ms: k.OP_PLAY_MS });
      }));
    };
    hook();
    // Pot: a new ingredient starts falling; a pot step starts; the dish flies to the plate and lands.
    const watch = () => {
      const pot = document.getElementById('pot'), methods = document.getElementById('methods');
      if (!pot || !methods || !methods.childElementCount) return setTimeout(watch, 50);
      let count = Number(pot.dataset.count || 0), stepping = false;
      new MutationObserver(() => {
        const n = Number(pot.dataset.count || 0);
        if (n > count) cue('drop');
        count = n;
      }).observe(pot, { attributes: true, attributeFilter: ['data-count'] });
      new MutationObserver(() => {
        const btns = [...methods.querySelectorAll('button')];
        const busy = btns.length > 0 && btns.every((b) => b.disabled) && pot.dataset.stage !== 'cooking' && pot.dataset.stage !== 'done';
        if (busy && !stepping) {
          const heat = Number(document.querySelector('#heats .is-active')?.dataset.value || 2);
          cue('step', { op: window.__lastPotOp, heat });
        }
        stepping = busy;
      }).observe(methods, { attributes: true, subtree: true, attributeFilter: ['disabled'] });
      methods.addEventListener('click', (e) => { const b = e.target.closest('[data-value]'); if (b) window.__lastPotOp = b.dataset.value; }, true);
      new MutationObserver((list) => {
        for (const m of list) {
          for (const node of m.addedNodes) if (node.classList?.contains('dish-flight')) cue('fly');
          for (const node of m.removedNodes) if (node.classList?.contains('dish-flight')) cue('land');
        }
      }).observe(document.body, { childList: true });
    };
    watch();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
});

const sleep = (ms) => page.waitForTimeout(ms);
const caption = (main, sub = '') => page.evaluate(([m, s]) => {
  const c = document.getElementById('demo-caption');
  if (!m) { c.style.opacity = 0; return; }
  c.innerHTML = s ? `${m}<small>${s}</small>` : m; c.style.opacity = 1;
}, [main, sub]);

async function moveTo(locator, { steps = 28, dx = 0, dy = 0 } = {}) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps });
}
async function click(locator, pause = 350) {
  await moveTo(locator); await sleep(pause);
  await page.mouse.down(); await sleep(90); await page.mouse.up();
}
async function drag(from, to) {
  await moveTo(from); await sleep(300);
  await page.mouse.down(); await sleep(150);
  await moveTo(to, { steps: 45 }); await sleep(250);
  await page.mouse.up();
}
const photo = (name) => page.locator('#photos .photo', { has: page.locator('.photo__name', { hasText: name }) });
const boardIdle = () => page.waitForFunction(() => !document.querySelector('.photo--working') && ![...document.querySelectorAll('#preps button')].some((b) => b.disabled), null, { timeout: 20000 });
const potIdle = () => page.waitForFunction(() => ![...document.querySelectorAll('#methods button')].some((b) => b.disabled), null, { timeout: 20000 });
async function tool(name, op) {
  await click(photo(name).locator('.photo__img')); await sleep(400);
  await click(page.locator(`#preps [data-value="${op}"]`));
  await sleep(300); await boardIdle(); await sleep(500);
}
async function potStep(heat, op) {
  await click(page.locator(`#heats [data-value="${heat}"]`)); await sleep(300);
  await click(page.locator(`#methods [data-value="${op}"]`));
  await page.waitForFunction(() => [...document.querySelectorAll('#methods button')].every((b) => b.disabled));
  await potIdle(); await sleep(500);
}

await page.goto(url);
await page.waitForFunction(() => document.querySelectorAll('#photos .photo').length === 4);
await page.mouse.move(W * 0.55, H * 0.5);
await sleep(800);

// Start capturing: every composited frame with its timestamp.
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `${work}/frames/${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, ts: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
await sleep(600);

await caption('案板上摆着几张旧照片', '照片就是食材');
await moveTo(page.locator('#photos')); await sleep(1500);

await caption('先在案板上处理：切片', '每一刀都真的切在照片上，做了就回不去');
await tool('海边的傍晚', 'slice');
await sleep(400);

await caption('捣碎', '外婆家的厨房，捣成一团一团');
await tool('外婆家的厨房', 'mash');

await caption('切丁，再把两张拌在一起', '把一张拖到另一张上');
await tool('雨天的车窗', 'dice');
await drag(photo('夏天的操场'), photo('雨天的车窗'));
await page.waitForFunction(() => document.querySelectorAll('#photos .photo').length === 3, null, { timeout: 20000 });
await page.waitForFunction(() => !document.querySelector('.photo--working'), null, { timeout: 20000 });
await sleep(1200);

await caption('处理好了，原样下锅', '捣碎的，就一团一团地落进锅里');
await drag(photo('外婆家的厨房'), page.locator('#pot'));
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '1');
await sleep(1800);

await caption('锅里：中火，炖', '每一步只作用在此刻锅里的食材上');
await potStep('2', 'stew');

await caption('再下两样', '切好的海边，拌好的雨天和操场，都没赶上前面的炖');
await drag(photo('海边的傍晚'), page.locator('#pot'));
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '2');
await sleep(1300);
await drag(photo('雨天的车窗拌夏天的操场'), page.locator('#pot'));
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '3');
await sleep(1500);

await caption('大火，炒', '案板上的四张照片，全在锅里了');
await potStep('3', 'stirfry');

await caption('中火，收汁', '先下的煮得久，后下的还看得出原样');
await potStep('2', 'reduce');
await sleep(400);

await caption('出锅', '锅里的碎块聚成一张新的记忆，端上盘子');
await click(page.locator('#btn-cook'));
await page.waitForFunction(() => document.querySelector('#pot').dataset.stage === 'done', null, { timeout: 60000 });
await page.waitForFunction(() => !document.querySelector('.dish-flight'), null, { timeout: 20000 });
const title = (await page.locator('#plate-title').textContent()).trim();
await caption(`「${title}」`, '一段从未发生过的记忆');
await moveTo(page.locator('#plate'), { steps: 35 }); await sleep(3000);

await caption('做好的记忆，也能再下锅', '放回锅里，和新的食材一起继续煮');
await click(page.locator('[data-act="pantry"]'));
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '1');
await sleep(2600);
await caption('');
await sleep(900);

const endMs = await page.evaluate(() => performance.timeOrigin + performance.now());
const cues = await page.evaluate(() => window.__cues);
await cdp.send('Page.stopScreencast');
await sleep(300);
await context.close();
await browser.close();

// Timeline zero = first captured frame. Frame timestamps are epoch seconds, cues epoch ms.
const t0 = frames[0].ts;
const duration = endMs / 1000 - t0;
const lines = ['ffconcat version 1.0'];
frames.forEach((f, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].ts : t0 + duration;
  lines.push(`file '${f.file.split('/').pop()}'`, `duration ${Math.max(0.001, next - f.ts).toFixed(4)}`);
});
lines.push(`file '${frames.at(-1).file.split('/').pop()}'`);
await writeFile(`${work}/frames/list.txt`, lines.join('\n'));
const shifted = cues.map((c) => ({ ...c, t: +(c.t / 1000 - t0).toFixed(3) })).filter((c) => c.t >= 0 && c.t <= duration);
await writeFile(`${work}/cues.json`, JSON.stringify({ duration, cues: shifted }, null, 1));
execFileSync('python3', ['-I', 'tests/demo-audio.py', `${work}/cues.json`, `${work}/sound.wav`], { stdio: 'inherit' });

const out = `${outDir}/memory-kitchen-demo.mp4`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${work}/frames/list.txt`, '-i', `${work}/sound.wav`,
  '-map', '0:v', '-map', '1:a', '-vf', `scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k',
  '-t', duration.toFixed(3), '-movflags', '+faststart', out]);
const fps = frames.length / duration;
if (!process.env.KEEP_WORK) await rm(work, { recursive: true, force: true });
console.log(JSON.stringify({ out, seconds: +duration.toFixed(1), frames: frames.length, captureFps: +fps.toFixed(1), cues: shifted.length, title }));
