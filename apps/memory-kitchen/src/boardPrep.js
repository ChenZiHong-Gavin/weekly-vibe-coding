// The photo cards on the board show each ingredient's picture as it is now (every operation is baked
// into it). When an operation is applied, it plays on the card itself — the knife, grater or pestle
// working the picture — over the baked result, then the overlay goes away.
import { liveOperation, onPlay } from './kitchen.js';

export function startBoardPrep(list) {
  const density = Math.min(window.devicePixelRatio || 1, 2);
  let raf = 0;

  function request() { if (!raf) raf = requestAnimationFrame(frame); }

  function canvasFor(node, img) {
    let c = node.querySelector('.photo__canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'photo__canvas';
      c.setAttribute('aria-hidden', 'true');
      img.insertAdjacentElement('afterend', c);
    }
    const w = img.clientWidth; const h = img.clientHeight;
    if (!w || !h) return null;
    c.style.left = `${img.offsetLeft}px`; c.style.top = `${img.offsetTop}px`;
    c.style.width = `${w}px`; c.style.height = `${h}px`;
    const pw = Math.round(w * density); const ph = Math.round(h * density);
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    return c;
  }

  function frame() {
    raf = 0;
    const now = performance.now();
    let playing = false;
    list.querySelectorAll('.photo').forEach((node) => {
      const cur = liveOperation(node.dataset.id, now);
      const imgEl = node.querySelector('.photo__img');
      const existing = node.querySelector('.photo__canvas');
      node.classList.toggle('photo--working', !!cur);
      if (!cur || !imgEl) { if (existing) existing.hidden = true; return; }
      const c = canvasFor(node, imgEl);
      if (!c) return;
      c.hidden = false;
      const ctx = c.getContext('2d');
      const w = c.width / density; const h = c.height / density;
      ctx.setTransform(density, 0, 0, density, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // The picture is square; show it like object-fit: cover.
      const size = Math.max(w, h);
      ctx.save();
      ctx.translate((w - size) / 2, (h - size) / 2);
      cur.op.draw(ctx, size, cur.u);
      cur.op.tool(ctx, size, cur.u);
      ctx.restore();
      playing = true;
    });
    if (playing) request();
  }

  onPlay(request);
  window.addEventListener('resize', request);
  return { sync: request };
}
