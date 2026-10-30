/* Full-screen mosaic: one big pixel cat face made of 24x24 cats the model generated (assets/cats_sprite.png).
   Tiles are matched by average colour and tinted toward the target pixel; hover/click shows the cat under the cursor. */
(() => {
  'use strict';
  const TILE = 24, COLS = 32, TILE_COUNT = 512, SIDE = 32;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { image: null, colours: [], tones: [], mosaic: [] };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const crop = (ctx, index, x, y, size = TILE) => {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.image, index % COLS * TILE, Math.floor(index / COLS) * TILE, TILE, TILE, x, y, size, size);
  };
  const drawTile = (canvas, index) => { canvas.width = canvas.height = TILE; crop(canvas.getContext('2d'), index, 0, 0); };

  // Keep the real average RGB for colour matching and every source pixel's
  // luminance for tinting. Tinting is confined to the hero, never the downloads.
  function measureTiles() {
    const source = document.createElement('canvas');
    source.width = state.image.naturalWidth; source.height = state.image.naturalHeight;
    const g = source.getContext('2d', { willReadFrequently: true });
    g.drawImage(state.image, 0, 0);
    const { data } = g.getImageData(0, 0, source.width, source.height);
    for (let index = 0; index < TILE_COUNT; index++) {
      const x = index % COLS * TILE, y = Math.floor(index / COLS) * TILE;
      const sum = [0, 0, 0];
      const luminance = new Float32Array(TILE * TILE);
      let mean = 0;
      for (let dy = 0; dy < TILE; dy++) for (let dx = 0; dx < TILE; dx++) {
        const p = ((y + dy) * source.width + x + dx) * 4;
        sum[0] += data[p]; sum[1] += data[p + 1]; sum[2] += data[p + 2];
        const value = .2126 * data[p] + .7152 * data[p + 1] + .0722 * data[p + 2];
        luminance[dy * TILE + dx] = value;
        mean += value / (TILE * TILE);
      }
      state.colours.push(sum.map(v => v / (TILE * TILE)));
      state.tones.push({ luminance, mean });
    }
  }

  // A hand-authored, 32-cell pixel drawing. All coordinates are inclusive;
  // drawing into an array avoids the soft edge pixels of canvas polygons.
  function catTarget() {
    const rows = Array.from({ length: SIDE }, () => Array(SIDE).fill('.'));
    const span = (y, left, right, ink) => rows[y].fill(ink, left, right + 1);
    const box = (x, y, width, height, ink) => {
      for (let row = y; row < y + height; row++) span(row, x, x + width - 1, ink);
    };
    // Two pointed ears, a broad forehead and a rounded, two-cell-thick contour.
    for (let y = 2; y <= 7; y++) {
      span(y, 4, y + 4, 'k'); span(y, 27 - y, 27, 'k');
    }
    [[8,4,27],[9,3,28],[10,2,29],[25,2,29],[26,3,28],
      [27,4,27],[28,6,25],[29,8,23]].forEach(([y,l,r]) => span(y,l,r,'k'));
    for (let y = 11; y <= 24; y++) span(y,1,30,'k');
    for (let y = 4; y <= 9; y++) {
      span(y,6,y+2,'b'); span(y,29-y,25,'b');
    }
    [[10,5,26],[11,4,27],[24,4,27],[25,5,26],
      [26,6,25],[27,8,23]].forEach(([y,l,r]) => span(y,l,r,'b'));
    for (let y = 12; y <= 23; y++) span(y,3,28,'b');
    for (let y = 7; y <= 9; y++) {
      span(y,6,y,'a'); span(y,31-y,25,'a');
    }
    // Large cream eyes and dark pupils remain legible at thumbnail size.
    for (const x of [6,19]) {
      box(x+1,13,5,7,'k'); box(x,14,7,5,'k');
      box(x+1,14,5,5,'e'); box(x+3,15,2,4,'k');
    }
    box(14,20,4,1,'a'); box(15,21,2,1,'a');
    box(15,22,2,2,'k'); box(12,24,3,1,'k'); box(17,24,3,1,'k');
    box(11,23,2,1,'k'); box(19,23,2,1,'k');
    // Whiskers extend through the contour into the contrasting background.
    for (const y of [19,23]) { box(0,y,5,2,'k'); box(27,y,5,2,'k'); }
    const themes = {
      gallery: { '.':[246,242,220], k:[23,57,45], b:[145,199,171], a:[235,112,82], e:[255,247,213] },
      arcade: { '.':[246,240,215], k:[47,36,76], b:[175,156,223], a:[238,148,177], e:[226,246,128] },
      editorial: { '.':[244,236,215], k:[34,45,54], b:[119,184,205], a:[239,96,68], e:[255,245,213] }
    };
    const theme = Object.keys(themes).find(name => document.body.classList.contains(name));
    const palette = themes[theme] || themes.gallery;
    return rows.flat().map(ink => palette[ink]);
  }

  function tintTile(ctx, index, rgb, x, y) {
    const { luminance, mean } = state.tones[index];
    const pixels = ctx.createImageData(TILE, TILE);
    // Mean-centred luminance remapping keeps the target's large colour fields
    // distinct while retaining the source cat's eyes, clothes and dark lines.
    // Around 60% of source luminance contrast survives within each target hue.
    const contrast = .60;
    for (let p = 0; p < luminance.length; p++) {
      const detail = (luminance[p] - mean) * contrast;
      for (let channel = 0; channel < 3; channel++) pixels.data[p*4+channel] = rgb[channel] + detail;
      pixels.data[p*4+3] = 255;
    }
    ctx.putImageData(pixels, x, y);
  }

  // Only five target colours are used. Cache their nearest source tiles and
  // tinted sprite atlases, so resizing never remeasures or retints the cats.
  const mosaicTones = new Map();
  function mosaicTone(rgb) {
    const key = rgb.join(',');
    if (mosaicTones.has(key)) return mosaicTones.get(key);
    const nearest = state.colours.map((c, index) => ({ index, d: c.reduce((sum, v, i) => sum + (v - rgb[i]) ** 2, 0) }))
      .sort((a, b) => a.d - b.d).slice(0, 12).map(item => item.index);
    const atlas = document.createElement('canvas');
    atlas.width = COLS * TILE; atlas.height = Math.ceil(TILE_COUNT / COLS) * TILE;
    const ctx = atlas.getContext('2d');
    for (let index = 0; index < TILE_COUNT; index++) tintTile(ctx, index, rgb, index % COLS * TILE, Math.floor(index / COLS) * TILE);
    const tone = { nearest, atlas };
    mosaicTones.set(key, tone);
    return tone;
  }

  function makeMosaic(animate = false) {
    const target = catTarget();
    document.querySelectorAll('[data-mosaic]').forEach(canvas => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      // The unchanged drawing has 28 inked rows inside its 32 × 32 grid.
      // Its silhouette fills 85% of landscape height, or 92% of portrait
      // width. Even row/column counts center the entire drawing exactly.
      const cell = Math.min(height * .85 / 28, width * .92 / SIDE);
      const cols = Math.ceil(width / cell / 2) * 2;
      const rows = Math.ceil(height / cell / 2) * 2;
      const offsetX = (width - cols * cell) / 2;
      const offsetY = (height - rows * cell) / 2;
      const faceCol = (cols - SIDE) / 2, faceRow = (rows - SIDE) / 2;
      state.layout = { cols, rows, cell, offsetX, offsetY };
      state.mosaic = [];
      const random = rng(52024);
      const tiles = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const faceX = x - faceCol, faceY = y - faceRow;
        const rgb = faceX >= 0 && faceX < SIDE && faceY >= 0 && faceY < SIDE
          ? target[faceY * SIDE + faceX] : target[0];
        const tone = mosaicTone(rgb);
        const p = y * cols + x;
        const forbidden = new Set([x ? state.mosaic[p - 1] : -1, y ? state.mosaic[p - cols] : -1]);
        const candidates = tone.nearest.filter(index => !forbidden.has(index));
        const index = candidates[Math.floor(random() * candidates.length)];
        state.mosaic.push(index);
        tiles.push({ x, y, index, atlas: tone.atlas, delay: (y / rows * .55 + random() * .45) * 520 });
      }
      // Respect DPR while keeping the visible backing store below 8 MP / 4096px.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, 4096 / width, 4096 / height, Math.sqrt(8000000 / (width * height)));
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      const sx = canvas.width / width, sy = canvas.height / height;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = false;
      const count = state.mosaic.length;
      Object.assign(canvas.dataset, {
        tiles: String(count), cols: String(cols), rows: String(rows), cell: String(cell),
        gridX: String(offsetX), gridY: String(offsetY),
        faceX: String((width - SIDE * cell) / 2), faceY: String((height - SIDE * cell) / 2),
        faceSize: String(SIDE * cell), animating: String(animate && !reducedMotion)
      });
      canvas.setAttribute('aria-label', `由${count}只小猫组成的大猫脸；悬停、点击或按回车放大查看`);
      document.querySelectorAll('[data-tile-count]').forEach(el => { el.textContent = String(count); });
      canvas.classList.add('assembled');
      canvas.closest('.mosaic-interactive').classList.remove('inspecting');
      cancelAnimationFrame(state.mosaicFrame);
      const start = performance.now();
      const draw = now => {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgb(${target[0].join(',')})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const elapsed = animate && !reducedMotion ? now - start : Infinity;
        for (const tile of tiles) {
          const progress = Math.max(0, Math.min(1, (elapsed - tile.delay) / 420));
          if (!progress) continue;
          ctx.globalAlpha = 1 - (1 - progress) ** 3;
          // Shared, rounded device-pixel edges prevent seams between cells.
          const left = Math.round((offsetX + tile.x * cell) * sx);
          const top = Math.round((offsetY + tile.y * cell) * sy);
          const right = Math.round((offsetX + (tile.x + 1) * cell) * sx);
          const bottom = Math.round((offsetY + (tile.y + 1) * cell) * sy);
          ctx.drawImage(tile.atlas, tile.index % COLS * TILE, Math.floor(tile.index / COLS) * TILE,
            TILE, TILE, left, top, right - left, bottom - top);
        }
        ctx.globalAlpha = 1;
        if (elapsed < 940) state.mosaicFrame = requestAnimationFrame(draw);
        else canvas.dataset.animating = 'false';
      };
      draw(start);
    });
  }

  function watchMosaic() {
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => makeMosaic(), 140);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.screen.orientation?.addEventListener('change', schedule);
    // Also catches svh or browser UI changes that alter the hero's actual box.
    const hero = document.querySelector('.mosaic-hero');
    let lastWidth = hero.clientWidth, lastHeight = hero.clientHeight;
    const observer = new ResizeObserver(() => {
      if (hero.clientWidth === lastWidth && hero.clientHeight === lastHeight) return;
      lastWidth = hero.clientWidth; lastHeight = hero.clientHeight;
      schedule();
    });
    observer.observe(hero);
  }

  function setupLens(canvas) {
    const host = canvas.closest('.mosaic-interactive');
    if (!host) return;
    const lens = host.querySelector('.mosaic-lens');
    if (!lens) return;
    let pinned = false;
    const inspect = (clientX, clientY) => {
      const bounds = canvas.getBoundingClientRect();
      const { cols, rows, cell, offsetX, offsetY } = state.layout;
      const x = Math.max(0, Math.min(cols - 1, Math.floor((clientX - bounds.left - offsetX) / cell)));
      const y = Math.max(0, Math.min(rows - 1, Math.floor((clientY - bounds.top - offsetY) / cell)));
      const index = state.mosaic[y * cols + x];
      drawTile(lens.querySelector('canvas'), index);
      lens.querySelector('span').textContent = `CAT ${String(index + 1).padStart(3, '0')}`;
      host.classList.add('inspecting');
      lens.style.left = Math.max(10, Math.min(host.clientWidth - lens.offsetWidth - 10, clientX - bounds.left + 15)) + 'px';
      lens.style.top = Math.max(10, Math.min(host.clientHeight - lens.offsetHeight - 10, clientY - bounds.top - 110)) + 'px';
    };
    canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' && !pinned) inspect(e.clientX, e.clientY); });
    window.addEventListener('resize', () => { pinned = false; host.classList.remove('inspecting'); });
    canvas.addEventListener('pointerleave', () => { if (!pinned) host.classList.remove('inspecting'); });
    canvas.addEventListener('click', e => { pinned = !pinned; if (pinned) inspect(e.clientX, e.clientY); else host.classList.remove('inspecting'); });
    canvas.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = !pinned; if (pinned) { const r=canvas.getBoundingClientRect(); inspect(r.left+r.width/2,r.top+r.height/2); } else host.classList.remove('inspecting'); }
      if (e.key === 'Escape') { pinned=false; host.classList.remove('inspecting'); }
    });
  }

  const sprite = new Image();
  sprite.onload = () => {
    state.image = sprite;
    measureTiles();
    makeMosaic(true);
    document.querySelectorAll('[data-mosaic]').forEach(setupLens);
    watchMosaic();
  };
  sprite.src = 'assets/cats_sprite.png';
})();
