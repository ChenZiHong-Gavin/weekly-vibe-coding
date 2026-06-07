import { PuppetDef, PuppetState, JointState } from '@/types/puppet';

// Per-puppet-type personality parameters
const PERSONALITY: Record<string, { idleSway: number; overshoot: number; responsiveness: number; friction: number }> = {
  warrior:  { idleSway: 0.3, overshoot: 1.2, responsiveness: 0.35, friction: 0.92 },
  maiden:   { idleSway: 0.7, overshoot: 1.6, responsiveness: 0.28, friction: 0.90 },
  monkey:   { idleSway: 1.0, overshoot: 2.0, responsiveness: 0.40, friction: 0.88 },
  dragon:   { idleSway: 0.5, overshoot: 1.4, responsiveness: 0.30, friction: 0.94 },
  scholar:  { idleSway: 0.3, overshoot: 1.1, responsiveness: 0.25, friction: 0.93 },
};

const IDLE_THRESHOLD = 0.8; // seconds before idle animation kicks in

export class PuppetEngine {
  createPuppetState(def: PuppetDef, x: number, y: number, scale = 1): PuppetState {
    const joints: Record<string, JointState> = {};
    for (const j of def.joints) {
      joints[j.id] = {
        id: j.id,
        x: j.x,
        y: j.y,
        angle: j.angle,
        targetAngle: j.angle,
        velocity: 0,
      };
    }
    return {
      puppetId: def.id,
      x,
      y,
      scale,
      joints,
      isGrabbed: false,
      grabbedJointId: null,
      opacity: 1,
      idleTime: 0,
      vx: 0,
      vy: 0,
    };
  }

  update(state: PuppetState, def: PuppetDef, dt: number, hasInput: boolean): void {
    const persona = PERSONALITY[def.id] || PERSONALITY.warrior;

    // Velocity physics — friction decay then apply to position
    const fpsNorm = dt * 60; // normalize to ~60fps
    state.vx = (state.vx ?? 0) * (1 - (1 - persona.friction) * fpsNorm);
    state.vy = (state.vy ?? 0) * (1 - (1 - persona.friction) * fpsNorm);
    state.x += (state.vx ?? 0) * fpsNorm;
    state.y += (state.vy ?? 0) * fpsNorm;

    if (!hasInput) {
      state.idleTime = (state.idleTime ?? 0) + dt;
    } else {
      state.idleTime = 0;
    }

    for (const jointDef of def.joints) {
      const js = state.joints[jointDef.id];
      if (!js) continue;

      // Idle breathing — gentle sinusoidal sway on body and head
      if ((state.idleTime ?? 0) > IDLE_THRESHOLD && (jointDef.id === 'body' || jointDef.id === 'head')) {
        const idlePhase = (state.idleTime ?? 0) * 1.2;
        const swayAngle = Math.sin(idlePhase) * 4 * persona.idleSway;
        if (jointDef.id === 'body') {
          js.targetAngle = swayAngle;
        } else if (jointDef.id === 'head') {
          js.targetAngle = Math.sin(idlePhase * 1.5) * 3 * persona.idleSway;
        }
      }

      // Overshoot: target moves → briefly aim past it for snappy feel
      const prevTarget = (js as any).__prevTarget ?? js.targetAngle;
      const targetDelta = js.targetAngle - prevTarget;
      const overshootTarget = js.targetAngle + targetDelta * persona.overshoot * 0.4;
      const effectiveTarget = Math.abs(targetDelta) > 0.5 ? overshootTarget : js.targetAngle;

      // Fast lerp toward target for real-time hand tracking responsiveness
      const rate = persona.responsiveness;
      js.angle += (effectiveTarget - js.angle) * rate;
      js.velocity = (effectiveTarget - js.angle) * rate;

      // Clamp to joint limits
      js.angle = Math.max(jointDef.minAngle, Math.min(jointDef.maxAngle, js.angle));

      (js as any).__prevTarget = js.targetAngle;
    }
  }

  setJointTarget(state: PuppetState, jointId: string, angle: number): void {
    const js = state.joints[jointId];
    if (js) {
      js.targetAngle = angle;
    }
  }

  applyGestureToBody(
    state: PuppetState,
    def: PuppetDef,
    handX: number,
    handY: number,
    stageWidth: number,
    stageHeight: number,
  ): void {
    if (!state.isGrabbed) return;
    state.x = handX;
    state.y = handY;
  }

  applyGestureToJoint(
    state: PuppetState,
    def: PuppetDef,
    fingerX: number,
    fingerY: number,
    stageWidth: number,
    stageHeight: number,
  ): void {
    if (!state.grabbedJointId) return;

    const jointDef = def.joints.find(j => j.id === state.grabbedJointId);
    if (!jointDef || !jointDef.parentId) return;

    const parentJs = state.joints[jointDef.parentId];
    if (!parentJs) return;

    const parentWorldX = state.x + parentJs.x * state.scale - (def.width / 2) * state.scale;
    const parentWorldY = state.y + parentJs.y * state.scale - (def.height / 2) * state.scale;

    const dx = fingerX - parentWorldX;
    const dy = fingerY - parentWorldY;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const js = state.joints[state.grabbedJointId];
    if (js) {
      js.targetAngle = Math.max(jointDef.minAngle, Math.min(jointDef.maxAngle, angle));
    }
  }

  findNearestJoint(
    state: PuppetState,
    def: PuppetDef,
    worldX: number,
    worldY: number,
    maxDist: number,
  ): string | null {
    let nearest: string | null = null;
    let minDist = maxDist;

    for (const jointDef of def.joints) {
      const js = state.joints[jointDef.id];
      if (!js) continue;

      const jx = state.x + (js.x - def.width / 2) * state.scale;
      const jy = state.y + (js.y - def.height / 2) * state.scale;
      const dist = Math.sqrt((worldX - jx) ** 2 + (worldY - jy) ** 2);

      if (dist < minDist) {
        minDist = dist;
        nearest = jointDef.id;
      }
    }

    return nearest;
  }

  hitTest(
    state: PuppetState,
    def: PuppetDef,
    worldX: number,
    worldY: number,
  ): boolean {
    const left = state.x - (def.width / 2) * state.scale;
    const top = state.y - (def.height / 2) * state.scale;
    const right = state.x + (def.width / 2) * state.scale;
    const bottom = state.y + (def.height / 2) * state.scale;

    return worldX >= left && worldX <= right && worldY >= top && worldY <= bottom;
  }

  animateToTarget(state: PuppetState, targetX: number, targetY: number, progress: number): void {
    const startX = state.x;
    const startY = state.y;
    state.x = startX + (targetX - startX) * progress;
    state.y = startY + (targetY - startY) * progress;
  }
}
