import { SceneDef, GestureResult, HandData } from '@/types/hand-shadow';
import { HandSilhouette } from './HandSilhouette';
import { useTheaterStore } from '@/store/theaterStore';

const PARSED_COLORS: Record<string, { r: number; g: number; b: number }> = {
  '#E8D5B5': { r: 232, g: 213, b: 181 },
  '#F0DFC0': { r: 240, g: 223, b: 192 },
  '#D4B896': { r: 212, g: 184, b: 150 },
  '#DCC5A5': { r: 220, g: 197, b: 165 },
  '#B89A6E': { r: 184, g: 154, b: 110 },
  '#C4A87E': { r: 196, g: 168, b: 126 },
};

function lerpRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

const BASE = import.meta.env.BASE_URL;

export class StageRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time = 0;
  private lightFlicker = 0;
  private silhouette = new HandSilhouette();
  private pathCache: Map<string, Path2D> = new Map();
  private caveBgImage: HTMLImageElement | null = null;
  private caveBgLoaded = false;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.loadCaveBg();
  }

  private loadCaveBg(): void {
    this.caveBgImage = new Image();
    this.caveBgImage.onload = () => { this.caveBgLoaded = true; };
    this.caveBgImage.src = `${BASE}cave-bg.png`;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  renderFrame(
    scene: SceneDef,
    handData: HandData[],
    gestures: GestureResult[],
    dt: number,
  ): void {
    this.time += dt;
    this.lightFlicker = Math.sin(this.time * 2.5) * 0.025 + Math.sin(this.time * 6.3) * 0.012;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (scene.id === 'cave') {
      this.renderCaveBackground(scene);
    } else {
      this.renderParchmentScreen(scene);
    }
    this.renderSceneElements(scene);

    // Render hand silhouettes
    for (const hand of handData) {
      this.renderHandShadow(hand);
    }

    this.renderGestureCursors(gestures);
    this.renderEffects();
    this.renderTraditionalFrame();
    this.renderOilLampLight();
  }

  private renderHandShadow(hand: HandData): void {
    const ctx = this.ctx;
    const path = this.silhouette.generateShadowPath(hand.landmarks, this.width, this.height);

    // Shadow fill with irregular edge (oil lamp flicker)
    ctx.save();

    // Main shadow body — deep black-brown for strong contrast
    const alpha = 0.88 + this.lightFlicker;
    ctx.fillStyle = `rgba(8, 5, 2, ${alpha})`;
    ctx.fill(path);

    // Soft edge glow
    ctx.shadowColor = 'rgba(5, 3, 1, 0.5)';
    ctx.shadowBlur = 12 + this.lightFlicker * 30;
    ctx.fillStyle = `rgba(8, 5, 2, ${alpha * 0.5})`;
    ctx.fill(path);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ─── Background rendering (preserved from puppet version) ───

  private renderParchmentScreen(scene: SceneDef): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const baseGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.65);
    const flicker = 1 + this.lightFlicker;
    const t = flicker - 0.95;
    baseGrad.addColorStop(0, lerpRgb(PARSED_COLORS['#E8D5B5'], PARSED_COLORS['#F0DFC0'], t));
    baseGrad.addColorStop(0.5, lerpRgb(PARSED_COLORS['#D4B896'], PARSED_COLORS['#DCC5A5'], t));
    baseGrad.addColorStop(1, lerpRgb(PARSED_COLORS['#B89A6E'], PARSED_COLORS['#C4A87E'], t));
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 12; i++) {
      const x = (Math.sin(i * 2.3 + this.time * 0.1) * 0.3 + 0.5) * w;
      const y = (Math.cos(i * 1.7 + this.time * 0.08) * 0.3 + 0.45) * h;
      const r = 60 + Math.sin(i * 0.9) * 30;
      const tex = ctx.createRadialGradient(x, y, 0, x, y, r);
      tex.addColorStop(0, '#C4A06A');
      tex.addColorStop(1, '#C4A06A00');
      ctx.fillStyle = tex;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderCaveBackground(_scene: SceneDef): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (this.caveBgLoaded && this.caveBgImage) {
      // Draw the generated cave image, scaled to cover
      const imgRatio = this.caveBgImage.naturalWidth / this.caveBgImage.naturalHeight;
      const canvasRatio = w / h;

      let sx = 0, sy = 0, sw = this.caveBgImage.naturalWidth, sh = this.caveBgImage.naturalHeight;

      if (imgRatio > canvasRatio) {
        // Image is wider — crop sides
        sw = this.caveBgImage.naturalHeight * canvasRatio;
        sx = (this.caveBgImage.naturalWidth - sw) / 2;
      } else {
        // Image is taller — crop top/bottom
        sh = this.caveBgImage.naturalWidth / canvasRatio;
        sy = (this.caveBgImage.naturalHeight - sh) / 2;
      }

      ctx.drawImage(this.caveBgImage, sx, sy, sw, sh, 0, 0, w, h);

      // Lighten the image so the shadow is visible against it
      ctx.fillStyle = 'rgba(255, 240, 220, 0.12)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Fallback while image loads
      const caveGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.15, w * 0.5, h * 0.5, w * 0.7);
      caveGrad.addColorStop(0, '#2A1808');
      caveGrad.addColorStop(0.4, '#1E0F04');
      caveGrad.addColorStop(1, '#0A0502');
      ctx.fillStyle = caveGrad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderSceneElements(scene: SceneDef): void {
    const ctx = this.ctx;
    for (const el of scene.elements) {
      ctx.save();
      const x = el.x * this.width;
      const y = el.y * this.height;
      ctx.translate(x, y);
      ctx.scale(el.scale, el.scale);
      ctx.globalAlpha = el.opacity;

      if (el.type === 'moon') {
        const moonGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
        moonGlow.addColorStop(0, 'rgba(255, 240, 200, 0.7)');
        moonGlow.addColorStop(0.5, 'rgba(255, 220, 150, 0.2)');
        moonGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 240, 210, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (el.type === 'torch') {
        this.renderTorch(0, 0, el.scale, el.opacity);
      } else if (el.type === 'rock') {
        ctx.fillStyle = `rgba(30, 18, 8, ${el.opacity * 0.9})`;
        ctx.strokeStyle = `rgba(60, 40, 20, ${el.opacity * 0.4})`;
        ctx.lineWidth = 1.5;
        if (el.path) {
          if (!this.pathCache.has(el.path)) {
            this.pathCache.set(el.path, new Path2D(el.path));
          }
          const path = this.pathCache.get(el.path)!;
          ctx.fill(path);
          ctx.stroke(path);
          ctx.strokeStyle = `rgba(100, 70, 35, ${el.opacity * 0.2})`;
          ctx.lineWidth = 0.8;
          ctx.stroke(path);
        }
      } else if (el.type === 'caveman') {
        // Rendered in foreground pass after lighting
      } else if (el.path) {
        ctx.fillStyle = `rgba(90, 65, 35, ${el.opacity * 0.7})`;
        ctx.strokeStyle = `rgba(70, 50, 25, ${el.opacity * 0.5})`;
        ctx.lineWidth = 1.2;
        if (!this.pathCache.has(el.path)) {
          this.pathCache.set(el.path, new Path2D(el.path));
        }
        const path = this.pathCache.get(el.path)!;
        if (el.type !== 'wave' && el.type !== 'bridge') ctx.fill(path);
        ctx.stroke(path);
      }
      ctx.restore();
    }
  }

  private renderGestureCursors(gestures: GestureResult[]): void {
    const ctx = this.ctx;
    for (const g of gestures) {
      ctx.save();
      ctx.translate(g.position.x, g.position.y);
      const r = 12;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      if (g.type === 'fist' || g.type === 'pinch') {
        grad.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
        grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
      } else {
        grad.addColorStop(0, 'rgba(200, 180, 140, 0.15)');
        grad.addColorStop(1, 'rgba(200, 180, 140, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderEffects(): void {
    const store = useTheaterStore.getState();
    const effects = store.effects;
    const now = performance.now();
    let changed = false;

    for (const effect of effects) {
      const age = (now - effect.startTime) / 1000;
      if (age > 2.5) { changed = true; continue; }

      const ctx = this.ctx;
      const alpha = Math.max(0, 1 - age / 2.5);

      if (effect.type === 'burst') {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
          const a = (i / particleCount) * Math.PI * 2;
          const dist = 30 + age * 150 + Math.sin(i * 3.7) * 20;
          const px = effect.x + Math.cos(a) * dist;
          const py = effect.y + Math.sin(a) * dist;
          const pAlpha = alpha * (1 - age / 2.5) * 0.8;

          ctx.save();
          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = `hsl(${40 + Math.random() * 20}, 90%, ${55 + Math.random() * 35}%)`;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (effect.type === 'smoke') {
        for (let i = 0; i < 8; i++) {
          const px = effect.x + (Math.random() - 0.5) * 160 * age;
          const py = effect.y - 40 * age + (Math.random() - 0.5) * 60;
          const pAlpha = alpha * 0.25 * (1 - age / 2);

          ctx.save();
          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = 'rgba(180, 150, 120, 0.5)';
          ctx.beginPath();
          ctx.arc(px, py, 8 + Math.random() * 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (effect.type === 'petals') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + age * 1.5;
          const dist = 40 + age * 100 + Math.sin(i * 2.1 + age) * 30;
          const px = effect.x + Math.cos(a) * dist;
          const py = effect.y + Math.sin(a) * dist - 60 * age;
          const pAlpha = alpha * 0.7;
          const rot = a + age * 3;

          ctx.save();
          ctx.globalAlpha = pAlpha;
          ctx.translate(px, py);
          ctx.rotate(rot);
          ctx.fillStyle = `hsl(${340 + i * 15}, 70%, ${60 + Math.sin(i) * 20}%)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    if (changed) {
      const alive = effects.filter(e => (performance.now() - e.startTime) / 1000 <= 2.5);
      store.clearEffects();
      for (const e of alive) store.triggerEffect(e);
    }
  }

  private renderTorch(x: number, y: number, scale: number, opacity: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = opacity;

    const s = scale;
    const flick1 = Math.sin(this.time * 7.3 + x) * 2.8;
    const flick2 = Math.sin(this.time * 11.7 + y) * 1.6;
    const flick3 = Math.sin(this.time * 15.1 + x + y) * 1.2;
    const flick = flick1 + flick2 + flick3;
    const t = this.time;

    // ── Ambient glow on cave wall ──
    const wallGlow = ctx.createRadialGradient(0, -20 * s, 3 * s, 0, -20 * s, 70 * s);
    wallGlow.addColorStop(0, `rgba(255, 140, 30, ${0.3 + this.lightFlicker * 4})`);
    wallGlow.addColorStop(0.25, `rgba(255, 100, 20, ${0.15 + this.lightFlicker * 2.5})`);
    wallGlow.addColorStop(0.55, `rgba(255, 60, 10, ${0.06 + this.lightFlicker})`);
    wallGlow.addColorStop(1, 'rgba(255, 30, 5, 0)');
    ctx.fillStyle = wallGlow;
    ctx.beginPath();
    ctx.arc(0, -20 * s, 70 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Handle — tapered with wood grain ──
    const hTop = -26 * s;
    const hBot = 4 * s;
    const hTopW = 2.2 * s;
    const hBotW = 3.8 * s;

    // Main handle shape
    const hGrad = ctx.createLinearGradient(-hBotW, 0, hBotW, 0);
    hGrad.addColorStop(0, '#1A0D04');
    hGrad.addColorStop(0.3, '#3A1F0C');
    hGrad.addColorStop(0.5, '#4A2810');
    hGrad.addColorStop(0.7, '#3A1F0C');
    hGrad.addColorStop(1, '#1A0D04');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(-hTopW, hTop);
    ctx.lineTo(-hBotW, hBot);
    ctx.quadraticCurveTo(-hBotW - 0.5 * s, hBot + 3 * s, 0, hBot + 4 * s);
    ctx.quadraticCurveTo(hBotW + 0.5 * s, hBot + 3 * s, hBotW, hBot);
    ctx.lineTo(hTopW, hTop);
    ctx.closePath();
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = 'rgba(20, 8, 3, 0.4)';
    ctx.lineWidth = 0.4 * s;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 1.2 * s, hTop);
      ctx.quadraticCurveTo(i * 1.4 * s, hTop + (hBot - hTop) * 0.5, i * 1.8 * s, hBot);
      ctx.stroke();
    }

    // ── Binding wrap (vine/leather) ──
    const wrapY = -8 * s;
    for (let wy = wrapY; wy <= wrapY + 4 * s; wy += 1.3 * s) {
      ctx.strokeStyle = '#5A3820';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-hTopW - 1.5 * s, wy);
      ctx.lineTo(hTopW + 1.5 * s, wy);
      ctx.stroke();

      // Wrap texture
      ctx.strokeStyle = '#3A2010';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(-hTopW - 1.2 * s, wy + 0.4 * s);
      ctx.lineTo(hTopW + 1.2 * s, wy + 0.4 * s);
      ctx.stroke();
    }

    // ── Flame base glow ──
    const baseGlow = ctx.createRadialGradient(0, hTop, 1 * s, 0, hTop, 15 * s);
    baseGlow.addColorStop(0, 'rgba(255, 200, 80, 0.7)');
    baseGlow.addColorStop(0.6, 'rgba(255, 140, 30, 0.25)');
    baseGlow.addColorStop(1, 'rgba(255, 80, 10, 0)');
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.arc(0, hTop, 15 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Outer flame (orange/red, wide) ──
    const outerBase = hTop + 1 * s;
    const outerTip = hTop - 28 * s + flick * 1.2;
    const outerGrad = ctx.createLinearGradient(0, outerBase, 0, outerTip);
    outerGrad.addColorStop(0, 'rgba(255, 160, 35, 0.9)');
    outerGrad.addColorStop(0.3, 'rgba(255, 110, 20, 0.8)');
    outerGrad.addColorStop(0.65, 'rgba(255, 60, 8, 0.45)');
    outerGrad.addColorStop(1, 'rgba(200, 20, 5, 0)');

    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.moveTo(-12 * s, outerBase);
    ctx.bezierCurveTo(-10 * s, outerBase - 6 * s, -8 * s + flick2, outerBase - 14 * s, -5 * s + flick1 * 0.5, outerTip - 2 * s);
    ctx.bezierCurveTo(-2 * s + flick3 * 0.4, outerTip - 10 * s, 2 * s - flick3 * 0.3, outerTip - 10 * s, 5 * s - flick1 * 0.5, outerTip - 2 * s);
    ctx.bezierCurveTo(8 * s - flick2, outerBase - 14 * s, 10 * s, outerBase - 6 * s, 12 * s, outerBase);
    ctx.closePath();
    ctx.fill();

    // ── Mid flame (yellow-orange, narrower) ──
    const midBase = outerBase;
    const midTip = hTop - 22 * s + flick1 * 0.8;
    const midGrad = ctx.createLinearGradient(0, midBase, 0, midTip);
    midGrad.addColorStop(0, 'rgba(255, 220, 80, 0.9)');
    midGrad.addColorStop(0.4, 'rgba(255, 190, 50, 0.8)');
    midGrad.addColorStop(0.8, 'rgba(255, 120, 20, 0.3)');
    midGrad.addColorStop(1, 'rgba(255, 60, 5, 0)');

    ctx.fillStyle = midGrad;
    ctx.beginPath();
    ctx.moveTo(-7 * s, midBase);
    ctx.bezierCurveTo(-6 * s, midBase - 5 * s, -4 * s + flick2 * 0.4, midBase - 12 * s, -2 * s + flick1 * 0.3, midTip - 2 * s);
    ctx.bezierCurveTo(0, midTip - 7 * s, 0, midTip - 7 * s, 2 * s - flick1 * 0.3, midTip - 2 * s);
    ctx.bezierCurveTo(4 * s - flick2 * 0.4, midBase - 12 * s, 6 * s, midBase - 5 * s, 7 * s, midBase);
    ctx.closePath();
    ctx.fill();

    // ── Core flame (white-hot) ──
    const coreBase = midBase;
    const coreTip = hTop - 15 * s + flick3 * 0.6;
    const coreGrad = ctx.createLinearGradient(0, coreBase, 0, coreTip);
    coreGrad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
    coreGrad.addColorStop(0.3, 'rgba(255, 250, 180, 0.75)');
    coreGrad.addColorStop(0.7, 'rgba(255, 200, 80, 0.3)');
    coreGrad.addColorStop(1, 'rgba(255, 140, 30, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(-3 * s, coreBase);
    ctx.bezierCurveTo(-2.5 * s, coreBase - 4 * s, -1.5 * s + flick3 * 0.3, coreBase - 9 * s, 0, coreTip - 3 * s);
    ctx.bezierCurveTo(1.5 * s - flick3 * 0.3, coreBase - 9 * s, 2.5 * s, coreBase - 4 * s, 3 * s, coreBase);
    ctx.closePath();
    ctx.fill();

    // ── Smoke wisps ──
    for (let i = 0; i < 4; i++) {
      const smokeAge = (t * 0.6 + i * 0.7) % 2.5;
      if (smokeAge < 2.0) {
        const sx = (Math.sin(t * 1.8 + i * 2.5) * 6 + flick1 * 0.5) * s;
        const sy = (outerTip - smokeAge * 25 * s);
        const sa = (1 - smokeAge / 2.0) * 0.15;
        ctx.fillStyle = `rgba(180, 140, 100, ${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (3 + smokeAge * 6) * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Embers/sparks ──
    for (let i = 0; i < 5; i++) {
      const emberAge = ((t * (2.5 + i * 1.3) + i * 1.7) % 1.8);
      if (emberAge < 1.3) {
        const ex = (Math.sin(t * 4.5 + i * 2.7) * 12 + flick2 * 0.8) * s;
        const ey = (outerTip - emberAge * 35 * s);
        const ea = (1 - emberAge / 1.3) * 0.85;

        // Outer ember glow
        ctx.fillStyle = `rgba(255, 180, 60, ${ea * 0.4})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = `rgba(255, 240, 180, ${ea})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 1 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ── Caveman silhouette (seated, back view, watching the show) ──
  private renderCaveman(x: number, y: number, scale: number, opacity: number, seed: number): void {
    const ctx = this.ctx;

    const s = scale;
    const bodyColor = `rgba(18, 10, 5, ${opacity})`;
    const hairColor = `rgba(10, 5, 2, ${opacity})`;
    const rimAlpha = opacity * 0.35;
    const rimColor = `rgba(220, 150, 50, ${rimAlpha})`;
    const rimColorBright = `rgba(240, 180, 70, ${rimAlpha * 1.3})`;

    // ── Backlight glow behind figure ──
    const glowGrad = ctx.createRadialGradient(0, -10 * s, 5 * s, 0, -5 * s, 45 * s);
    glowGrad.addColorStop(0, `rgba(255, 160, 50, ${opacity * 0.1})`);
    glowGrad.addColorStop(0.6, `rgba(255, 100, 30, ${opacity * 0.04})`);
    glowGrad.addColorStop(1, 'rgba(255, 60, 10, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, -5 * s, 45 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Strong backlight rim (drawn first, behind the body) ──
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 3.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20 * s, -14 * s);
    ctx.bezierCurveTo(-23 * s, -4 * s, -22 * s, 6 * s, -17 * s, 13 * s);
    ctx.bezierCurveTo(-12 * s, 18 * s, -4 * s, 19 * s, 0, 20 * s);
    ctx.bezierCurveTo(4 * s, 19 * s, 12 * s, 18 * s, 17 * s, 13 * s);
    ctx.bezierCurveTo(22 * s, 6 * s, 23 * s, -4 * s, 20 * s, -14 * s);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Bright rim highlight on top edge
    ctx.strokeStyle = rimColorBright;
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(-18 * s, -16 * s);
    ctx.bezierCurveTo(-8 * s, -19 * s, 8 * s, -19 * s, 18 * s, -16 * s);
    ctx.stroke();

    // ── Legs ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-14 * s, 16 * s);
    ctx.bezierCurveTo(-16 * s, 10 * s, -18 * s, 4 * s, -17 * s, -2 * s);
    ctx.lineTo(-8 * s, -4 * s);
    ctx.lineTo(-6 * s, 4 * s);
    ctx.bezierCurveTo(-4 * s, 12 * s, -8 * s, 16 * s, -14 * s, 16 * s);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(14 * s, 16 * s);
    ctx.bezierCurveTo(16 * s, 10 * s, 18 * s, 4 * s, 17 * s, -2 * s);
    ctx.lineTo(8 * s, -4 * s);
    ctx.lineTo(6 * s, 4 * s);
    ctx.bezierCurveTo(4 * s, 12 * s, 8 * s, 16 * s, 14 * s, 16 * s);
    ctx.fill();

    // ── Feet ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-10 * s, 16 * s, 6 * s, 3 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10 * s, 16 * s, 6 * s, 3 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Torso (broad, hunched, fur clothing) ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-3 * s, -28 * s);
    ctx.bezierCurveTo(-11 * s, -26 * s, -20 * s, -20 * s, -22 * s, -11 * s);
    ctx.bezierCurveTo(-24 * s, -2 * s, -22 * s, 6 * s, -18 * s, 12 * s);
    ctx.bezierCurveTo(-14 * s, 16 * s, -10 * s, 17 * s, -4 * s, 18 * s);
    ctx.quadraticCurveTo(0, 19 * s, 4 * s, 18 * s);
    ctx.bezierCurveTo(10 * s, 17 * s, 14 * s, 16 * s, 18 * s, 12 * s);
    ctx.bezierCurveTo(22 * s, 6 * s, 24 * s, -2 * s, 22 * s, -11 * s);
    ctx.bezierCurveTo(20 * s, -20 * s, 11 * s, -26 * s, 3 * s, -28 * s);
    ctx.closePath();
    ctx.fill();

    // ── Fur texture strokes ──
    ctx.strokeStyle = `rgba(120, 80, 35, ${opacity * 0.15})`;
    ctx.lineWidth = 0.7 * s;
    for (let i = 0; i < 5; i++) {
      const fx = ((seed * 7 + i * 11) % 22) - 11;
      const fy = -20 * s + i * 2.5 * s;
      ctx.beginPath();
      ctx.moveTo((fx - 2.5) * s, fy);
      ctx.quadraticCurveTo(fx * s, fy + 3.5 * s, (fx + 2) * s, fy + 8 * s);
      ctx.stroke();
    }

    // ── Neck ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-3 * s, -28 * s);
    ctx.bezierCurveTo(-3 * s, -32 * s, 3 * s, -32 * s, 3 * s, -28 * s);
    ctx.closePath();
    ctx.fill();

    // ── Head ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, -36 * s, 6.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Rim light on head
    ctx.strokeStyle = rimColorBright;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(0, -36 * s, 6.8 * s, Math.PI, 2.2 * Math.PI);
    ctx.stroke();

    // ── Bushy hair ──
    ctx.fillStyle = hairColor;
    const tufts: [number, number, number, number, number, number][] = [
      [-5, -38, -9, -44, -6, -49],
      [-3, -39, -4, -48, 0, -51],
      [0, -40, 0, -49, 3, -50],
      [4, -39, 6, -47, 7, -47],
      [6, -36, 11, -40, 9, -36],
      [-6, -36, -12, -40, -10, -35],
    ];
    for (const [sx, sy, cx, cy, ex, ey] of tufts) {
      ctx.beginPath();
      ctx.moveTo(sx * s, sy * s);
      ctx.bezierCurveTo(cx * s, cy * s, ex * s + (seed - 0.5) * 2 * s, ey * s - 1 * s, ex * s, ey * s);
      ctx.bezierCurveTo(ex * s - 2 * s, ey * s + 3 * s, sx * s + 1 * s, sy * s + 2 * s, sx * s, sy * s);
      ctx.fill();
    }

    // Hair rim light
    ctx.strokeStyle = rimColorBright;
    ctx.lineWidth = 1 * s;
    for (const [sx, sy, cx, cy, ex, ey] of tufts.slice(2, 5)) {
      ctx.beginPath();
      ctx.moveTo(sx * s, sy * s);
      ctx.bezierCurveTo(cx * s, cy * s, ex * s, ey * s, ex * s, ey * s);
      ctx.stroke();
    }

    // ── Left arm ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-20 * s, -10 * s);
    ctx.bezierCurveTo(-26 * s, -4 * s, -28 * s, 4 * s, -25 * s, 10 * s);
    ctx.bezierCurveTo(-22 * s, 14 * s, -17 * s, 15 * s, -14 * s, 12 * s);
    ctx.bezierCurveTo(-16 * s, 8 * s, -18 * s, 2 * s, -17 * s, -6 * s);
    ctx.closePath();
    ctx.fill();

    // Left hand
    ctx.beginPath();
    ctx.arc(-22 * s, 12 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Left arm rim
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-20 * s, -10 * s);
    ctx.bezierCurveTo(-26 * s, -4 * s, -28 * s, 4 * s, -25 * s, 10 * s);
    ctx.stroke();

    // ── Right arm ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(20 * s, -10 * s);
    ctx.bezierCurveTo(26 * s, -4 * s, 28 * s, 4 * s, 25 * s, 10 * s);
    ctx.bezierCurveTo(22 * s, 14 * s, 17 * s, 15 * s, 14 * s, 12 * s);
    ctx.bezierCurveTo(16 * s, 8 * s, 18 * s, 2 * s, 17 * s, -6 * s);
    ctx.closePath();
    ctx.fill();

    // Right hand
    ctx.beginPath();
    ctx.arc(22 * s, 12 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right arm rim
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(20 * s, -10 * s);
    ctx.bezierCurveTo(26 * s, -4 * s, 28 * s, 4 * s, 25 * s, 10 * s);
    ctx.stroke();
  }

  // Render cavemen in foreground (after lighting pass)
  private renderCavemenForeground(scene: SceneDef): void {
    const ctx = this.ctx;
    for (const el of scene.elements) {
      if (el.type !== 'caveman') continue;
      ctx.save();
      const cx = el.x * this.width;
      const cy = el.y * this.height;
      ctx.translate(cx, cy);
      ctx.scale(el.scale, el.scale);
      this.renderCaveman(cx, cy, el.scale, el.opacity, el.x);
      ctx.restore();
    }
  }

  private renderTraditionalFrame(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const frameW = 10;

    const woodGrad = ctx.createLinearGradient(0, 0, w, 0);
    woodGrad.addColorStop(0, '#5C3A1E');
    woodGrad.addColorStop(0.15, '#8B6914');
    woodGrad.addColorStop(0.3, '#A07828');
    woodGrad.addColorStop(0.5, '#B8922E');
    woodGrad.addColorStop(0.7, '#A07828');
    woodGrad.addColorStop(0.85, '#8B6914');
    woodGrad.addColorStop(1, '#5C3A1E');
    ctx.strokeStyle = woodGrad;
    ctx.lineWidth = frameW;
    ctx.strokeRect(frameW / 2, frameW / 2, w - frameW, h - frameW);

    ctx.strokeStyle = 'rgba(180, 140, 60, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameW + 3, frameW + 3, w - (frameW + 3) * 2, h - (frameW + 3) * 2);

    const cs = 22;
    const corners = [
      { x: frameW + 5, y: frameW + 5, sx: 1, sy: 1 },
      { x: w - frameW - 5, y: frameW + 5, sx: -1, sy: 1 },
      { x: frameW + 5, y: h - frameW - 5, sx: 1, sy: -1 },
      { x: w - frameW - 5, y: h - frameW - 5, sx: -1, sy: -1 },
    ];
    ctx.strokeStyle = 'rgba(200, 160, 60, 0.55)';
    ctx.fillStyle = 'rgba(200, 160, 60, 0.15)';
    ctx.lineWidth = 1.5;

    for (const c of corners) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.sx, c.sy);
      ctx.beginPath();
      ctx.moveTo(0, cs);
      ctx.quadraticCurveTo(0, 0, cs, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cs * 0.4, cs * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cs * 0.4, cs * 0.4, 2, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderOilLampLight(): void {
    const ctx = this.ctx;
    const sceneId = useTheaterStore.getState().selectedSceneId;

    if (sceneId === 'cave') {
      // Two torch lights from left and right walls
      const torches = [
        { x: this.width * 0.1, y: this.height * 0.55 },
        { x: this.width * 0.9, y: this.height * 0.55 },
      ];

      for (const t of torches) {
        const flick = Math.sin(this.time * 7.5 + t.x) * 0.015 + Math.sin(this.time * 11.3) * 0.01;
        const a = 0.06 + flick;
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, this.width * 0.5);
        grad.addColorStop(0, `rgba(255, 140, 40, ${a * 2})`);
        grad.addColorStop(0.3, `rgba(255, 100, 25, ${a})`);
        grad.addColorStop(0.7, `rgba(255, 60, 10, ${a * 0.25})`);
        grad.addColorStop(1, 'rgba(255, 40, 5, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // Stronger vignette for cave
      const vig = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.width * 0.22,
        this.width / 2, this.height / 2, this.width * 0.68,
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(15, 8, 2, 0.45)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      const lampX = this.width / 2 + Math.sin(this.time * 0.4) * 20;
      const lampY = -30;
      const lampGrad = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, this.height * 1.1);
      const a = 0.05 + this.lightFlicker * 0.4;
      lampGrad.addColorStop(0, `rgba(255, 210, 120, ${a * 1.5})`);
      lampGrad.addColorStop(0.3, `rgba(255, 190, 90, ${a})`);
      lampGrad.addColorStop(0.7, `rgba(255, 170, 60, ${a * 0.3})`);
      lampGrad.addColorStop(1, 'rgba(255, 170, 60, 0)');
      ctx.fillStyle = lampGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      const vig = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.width * 0.28,
        this.width / 2, this.height / 2, this.width * 0.65,
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(25, 15, 5, 0.35)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
