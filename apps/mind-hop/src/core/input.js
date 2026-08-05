export const Input = {
  keys: {}, pressed: {},
  mx: 0, my: 0, dx: 0, dy: 0,
  mouse: [false, false, false], mousePressed: [false, false, false],
  wheel: 0,
  locked: false,
  sensitivity: 0.0023,

  init(canvas) {
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      if ([' ', 'tab'].includes(k) || k.startsWith('arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.keys = {}; this.mouse = [false, false, false]; });

    canvas.addEventListener('mousedown', e => {
      if (!this.locked) { canvas.requestPointerLock(); return; }
      if (!this.mouse[e.button]) this.mousePressed[e.button] = true;
      this.mouse[e.button] = true;
      e.preventDefault();
    });
    addEventListener('mouseup', e => { this.mouse[e.button] = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.dx += e.movementX * this.sensitivity;
      this.dy += e.movementY * this.sensitivity;
    });
    addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      document.body.classList.toggle('locked', this.locked);
    });
  },

  // 每帧末尾调用
  flush() {
    for (const k in this.pressed) delete this.pressed[k];
    this.mousePressed[0] = this.mousePressed[1] = this.mousePressed[2] = false;
    this.dx = 0; this.dy = 0; this.wheel = 0;
  },

  axis() {
    const x = (this.keys['d'] ? 1 : 0) - (this.keys['a'] ? 1 : 0);
    const y = (this.keys['w'] ? 1 : 0) - (this.keys['s'] ? 1 : 0);
    const l = Math.hypot(x, y);
    return l > 0 ? [x / l, y / l] : [0, 0];
  },

  /** 方向键单独一路 —— 附身在外时用它挪本体，两套操作可以同时进行 */
  arrows() {
    const x = (this.keys['arrowright'] ? 1 : 0) - (this.keys['arrowleft'] ? 1 : 0);
    const y = (this.keys['arrowup'] ? 1 : 0) - (this.keys['arrowdown'] ? 1 : 0);
    const l = Math.hypot(x, y);
    return l > 0 ? [x / l, y / l] : [0, 0];
  },
};
