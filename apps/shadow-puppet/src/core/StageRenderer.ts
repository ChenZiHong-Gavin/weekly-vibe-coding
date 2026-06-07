import { PuppetDef, PuppetState, SceneDef, GestureResult, ImagePart, StageEffect } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';

interface JointWorldTransform {
  x: number;
  y: number;
  angle: number;
}

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

export class StageRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time = 0;
  private lightFlicker = 0;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private partCache: Map<string, Map<string, OffscreenCanvas>> = new Map();
  private partCropDone: Set<string> = new Set();
  private pathCache: Map<string, Path2D> = new Map();
  private shadowCanvasCache: Map<string, OffscreenCanvas> = new Map();

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  preloadImages(puppetDefs: PuppetDef[]): void {
    for (const def of puppetDefs) {
      if (def.imagePath && !this.imageCache.has(def.imagePath)) {
        const img = new Image();
        img.src = def.imagePath;
        img.onload = () => {
          if (def.imageParts && def.imageParts.length > 0) {
            this.cropImageParts(def, img);
          }
        };
        this.imageCache.set(def.imagePath, img);
      }
    }
  }

  private cropImageParts(def: PuppetDef, img: HTMLImageElement): void {
    if (this.partCropDone.has(def.id)) return;
    const parts = def.imageParts!;
    const partsMap = new Map<string, OffscreenCanvas>();

    for (const part of parts) {
      const sx = Math.round(part.crop.x * img.naturalWidth);
      const sy = Math.round(part.crop.y * img.naturalHeight);
      const sw = Math.round(part.crop.w * img.naturalWidth);
      const sh = Math.round(part.crop.h * img.naturalHeight);

      const canvas = new OffscreenCanvas(sw, sh);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      partsMap.set(part.id, canvas);
    }

    this.partCache.set(def.id, partsMap);
    this.partCropDone.add(def.id);
  }

  private computeFK(def: PuppetDef, state: PuppetState): Map<string, JointWorldTransform> {
    const transforms = new Map<string, JointWorldTransform>();

    const rootJoint = def.joints.find(j => !j.parentId);
    if (!rootJoint) return transforms;

    const rootState = state.joints[rootJoint.id];
    const rootAngle = rootState ? rootState.angle : 0;

    transforms.set(rootJoint.id, {
      x: 0,
      y: 0,
      angle: rootAngle,
    });

    const processed = new Set<string>([rootJoint.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const joint of def.joints) {
        if (processed.has(joint.id)) continue;
        if (!joint.parentId || !processed.has(joint.parentId)) continue;

        const parentTransform = transforms.get(joint.parentId)!;
        const parentDef = def.joints.find(j => j.id === joint.parentId)!;
        const js = state.joints[joint.id];
        const localAngle = js ? js.angle : joint.angle;

        const dx = joint.x - parentDef.x;
        const dy = joint.y - parentDef.y;
        const rad = (parentTransform.angle * Math.PI) / 180;
        const rotX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const rotY = dx * Math.sin(rad) + dy * Math.cos(rad);

        transforms.set(joint.id, {
          x: parentTransform.x + rotX,
          y: parentTransform.y + rotY,
          angle: parentTransform.angle + localAngle,
        });

        processed.add(joint.id);
        changed = true;
      }
    }

    return transforms;
  }

  renderFrame(
    scene: SceneDef,
    puppets: { def: PuppetDef; state: PuppetState; isActive?: boolean }[],
    gestures: GestureResult[],
    isShadowMode: boolean,
    dt: number,
  ): void {
    this.time += dt;
    this.lightFlicker = Math.sin(this.time * 2.5) * 0.025 + Math.sin(this.time * 6.3) * 0.012;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.renderParchmentScreen(scene);
    this.renderSceneElements(scene);

    for (const { def, state, isActive } of puppets) {
      if (state.opacity > 0) {
        this.renderPuppet(def, state, isShadowMode, !!isActive);
      }
    }

    this.renderGestureCursors(gestures);
    this.renderEffects();
    this.renderTraditionalFrame();
    this.renderOilLampLight();
  }

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

  renderPuppet(def: PuppetDef, state: PuppetState, isShadowMode: boolean, isActive = false): void {
    if (def.imageParts && def.imageParts.length > 0 && this.partCache.has(def.id)) {
      this.renderArticulatedPuppet(def, state, isShadowMode, isActive);
      return;
    }

    if (def.imagePath) {
      this.renderWholeImagePuppet(def, state, isShadowMode, isActive);
      return;
    }

    this.renderSvgPuppet(def, state, isShadowMode, isActive);
  }

  private renderArticulatedPuppet(def: PuppetDef, state: PuppetState, isShadowMode: boolean, isActive = false): void {
    const ctx = this.ctx;
    const partsMap = this.partCache.get(def.id)!;
    const img = this.imageCache.get(def.imagePath!)!;
    if (!img || !img.complete) return;

    const fk = this.computeFK(def, state);
    const rootJoint = def.joints.find(j => !j.parentId)!;

    const sortedParts = [...def.imageParts!].sort((a, b) => a.zIndex - b.zIndex);

    const renderScale = state.scale * 0.55;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    for (const part of sortedParts) {
      const partCanvas = partsMap.get(part.id);
      if (!partCanvas) continue;

      const jointTransform = fk.get(part.jointId);
      if (!jointTransform) continue;

      const jointDef = def.joints.find(j => j.id === part.jointId);
      if (!jointDef) continue;

      const cropStartX = part.crop.x * imgW;
      const cropStartY = part.crop.y * imgH;
      const cropW = part.crop.w * imgW;
      const cropH = part.crop.h * imgH;

      const pivotXpx = jointDef.x - cropStartX;
      const pivotYpx = jointDef.y - cropStartY;

      ctx.save();
      ctx.globalAlpha = state.opacity;

      ctx.translate(state.x, state.y);
      ctx.translate(jointTransform.x * renderScale, jointTransform.y * renderScale);

      if (part.jointId !== rootJoint.id) {
        const jointAngleRad = (jointTransform.angle * Math.PI) / 180;
        ctx.rotate(jointAngleRad);
      }

      ctx.scale(renderScale, renderScale);

      if (isShadowMode) {
        this.drawShadowPart(partCanvas, pivotXpx, pivotYpx);
      } else {
        ctx.drawImage(partCanvas, -pivotXpx, -pivotYpx);
      }

      ctx.restore();
    }

    // Active puppet glow
    if (isActive) {
      const pulse = 0.3 + Math.sin(this.time * 3) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse;
      const glowGrad = ctx.createRadialGradient(state.x, state.y - 50 * renderScale, 0, state.x, state.y, 200 * renderScale);
      glowGrad.addColorStop(0, 'rgba(255, 200, 80, 0.25)');
      glowGrad.addColorStop(1, 'rgba(255, 200, 80, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(state.x, state.y + 20 * renderScale, 120 * renderScale, 60 * renderScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const joint of def.joints) {
      if (!joint.parentId) continue;
      const jt = fk.get(joint.id);
      if (!jt) continue;

      ctx.save();
      ctx.translate(state.x, state.y);
      ctx.translate(jt.x * renderScale, jt.y * renderScale);

      ctx.fillStyle = isShadowMode ? 'rgba(80, 60, 25, 0.7)' : 'rgba(160, 120, 50, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 3 * renderScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isShadowMode ? 'rgba(120, 90, 40, 0.5)' : 'rgba(200, 160, 70, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 3 * renderScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private shadowTempCanvas: OffscreenCanvas | null = null;

  private drawShadowPart(partCanvas: OffscreenCanvas, pivotX: number, pivotY: number): void {
    const ctx = this.ctx;
    const w = partCanvas.width;
    const h = partCanvas.height;

    if (!this.shadowTempCanvas || this.shadowTempCanvas.width < w || this.shadowTempCanvas.height < h) {
      this.shadowTempCanvas = new OffscreenCanvas(w, h);
    }

    const tCtx = this.shadowTempCanvas.getContext('2d')!;
    tCtx.clearRect(0, 0, w, h);
    tCtx.drawImage(partCanvas, 0, 0);

    tCtx.globalCompositeOperation = 'source-atop';
    const alpha = 0.85 + this.lightFlicker;
    tCtx.fillStyle = `rgba(25, 18, 8, ${alpha})`;
    tCtx.fillRect(0, 0, w, h);
    tCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.shadowTempCanvas, 0, 0, w, h, -pivotX, -pivotY, w, h);
  }

  private renderWholeImagePuppet(def: PuppetDef, state: PuppetState, isShadowMode: boolean, isActive = false): void {
    const ctx = this.ctx;
    const img = this.imageCache.get(def.imagePath!);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();
    ctx.translate(state.x, state.y);
    const bodyJoint = state.joints['body'];
    if (bodyJoint) ctx.rotate((bodyJoint.angle * Math.PI) / 180 * 0.3);
    ctx.scale(state.scale, state.scale);
    ctx.globalAlpha = state.opacity;

    const aspect = img.naturalWidth / img.naturalHeight;
    const drawH = def.height * 0.85;
    const drawW = drawH * aspect;

    if (isShadowMode) {
      const cacheKey = `${def.id}-shadow-${drawW.toFixed(0)}-${drawH.toFixed(0)}`;
      let tempCanvas = this.shadowCanvasCache.get(cacheKey);
      if (!tempCanvas) {
        tempCanvas = new OffscreenCanvas(Math.ceil(drawW), Math.ceil(drawH));
        this.shadowCanvasCache.set(cacheKey, tempCanvas);
      }
      const tCtx = tempCanvas.getContext('2d')!;
      tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.drawImage(img, 0, 0, drawW, drawH);
      tCtx.globalCompositeOperation = 'source-atop';
      tCtx.fillStyle = `rgba(25, 18, 8, ${0.85 + this.lightFlicker})`;
      tCtx.fillRect(0, 0, drawW, drawH);
      ctx.drawImage(tempCanvas, -drawW / 2, -drawH / 2);
    } else {
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }

  private renderSvgPuppet(def: PuppetDef, state: PuppetState, isShadowMode: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.scale(state.scale, state.scale);
    ctx.translate(-def.width / 2, -def.height / 2);
    ctx.globalAlpha = state.opacity;

    for (const cmd of def.drawCommands) {
      const joint = state.joints[cmd.jointId];
      if (!joint) continue;
      const jointDef = def.joints.find(j => j.id === cmd.jointId);
      if (!jointDef) continue;

      ctx.save();
      ctx.translate(jointDef.x, jointDef.y);
      if (jointDef.parentId) ctx.rotate((joint.angle * Math.PI) / 180);

      if (isShadowMode) {
        ctx.fillStyle = `rgba(25, 18, 8, ${0.88 + this.lightFlicker})`;
        ctx.strokeStyle = 'rgba(15, 10, 5, 0.95)';
      } else {
        ctx.fillStyle = def.color;
        ctx.strokeStyle = 'rgba(40, 25, 10, 0.7)';
      }
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';

      if (cmd.type === 'path' && cmd.path) {
        if (!this.pathCache.has(cmd.path)) {
          this.pathCache.set(cmd.path, new Path2D(cmd.path));
        }
        const path = this.pathCache.get(cmd.path)!;
        ctx.fill(path);
        ctx.stroke(path);
      } else if (cmd.type === 'circle' && cmd.radius) {
        ctx.beginPath();
        ctx.arc(cmd.offsetX || 0, cmd.offsetY || 0, cmd.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private renderGestureCursors(gestures: GestureResult[]): void {
    const ctx = this.ctx;
    for (const g of gestures) {
      ctx.save();
      ctx.translate(g.position.x, g.position.y);
      const r = 15;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      if (g.type === 'fist' || g.type === 'pinch') {
        grad.addColorStop(0, 'rgba(255, 200, 50, 0.5)');
        grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
      } else if (g.type === 'point') {
        grad.addColorStop(0, 'rgba(255, 120, 40, 0.5)');
        grad.addColorStop(1, 'rgba(255, 120, 40, 0)');
      } else {
        grad.addColorStop(0, 'rgba(200, 180, 140, 0.25)');
        grad.addColorStop(1, 'rgba(200, 180, 140, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 170, 100, 0.5)';
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.hand === 'left' ? '左' : '右', 0, r + 12);
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
          const dist = 30 + age * 200 + Math.sin(i * 3.7) * 20;
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
