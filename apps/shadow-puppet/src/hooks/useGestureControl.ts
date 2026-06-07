import { useEffect, useRef } from 'react';
import { PuppetEngine } from '@/core/PuppetEngine';
import { PuppetDef, PoseLandmark } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const NOSE = 0;

const ARM_REST_ANGLE = 90;
const ARM_AMPLIFY = 1.8;
const HEAD_SENSITIVITY = 0.18;
const POS_SMOOTHING = 0.35;
const SOUND_SPEED_THRESHOLD = 600;

function angleDeg(ax: number, ay: number, bx: number, by: number): number {
  return (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
}

function isVisible(lm: PoseLandmark | undefined): boolean {
  return !!lm && lm.visibility > 0.5;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function armAngleFromPose(
  shoulderX: number, shoulderY: number,
  elbowX: number, elbowY: number,
  wristX: number | null, wristY: number | null,
): number {
  const targetX = wristX ?? elbowX;
  const targetY = wristY ?? elbowY;
  const raw = angleDeg(shoulderX, shoulderY, targetX, targetY);
  return (raw - ARM_REST_ANGLE) * ARM_AMPLIFY;
}

export function useGestureControl(
  puppetDefs: PuppetDef[],
  engine: PuppetEngine,
  soundManager: SoundManager | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hasInputRef?: React.RefObject<boolean>,
) {
  const lastSoundRef = useRef(0);
  const smoothPosRef = useRef<{ x: number; y: number } | null>(null);
  const prevWristRef = useRef<{ lx: number; ly: number; rx: number; ry: number; t: number } | null>(null);
  const wristHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const prevHipYRef = useRef(0);
  const lastComboRef = useRef(0);

  useEffect(() => {
    const unsubscribe = useTheaterStore.subscribe((state, prevState) => {
      if (state.poseLandmarks === prevState.poseLandmarks) return;

      const {
        puppetStates,
        activePuppetIndex,
        sfxEnabled,
        poseLandmarks: lm,
        updatePuppetState,
      } = state;

      if (puppetStates.length === 0 || lm.length === 0) return;

      const activeState = puppetStates[activePuppetIndex];
      if (!activeState) return;
      const activeDef = puppetDefs.find(d => d.id === activeState.puppetId);
      if (!activeDef) return;

      const canvasEl = canvasRef.current;
      const canvasW = canvasEl?.width || window.innerWidth;
      const canvasH = canvasEl?.height || window.innerHeight;

      const lShoulder = lm[L_SHOULDER];
      const rShoulder = lm[R_SHOULDER];

      if (!isVisible(lShoulder) || !isVisible(rShoulder)) {
        if (hasInputRef) hasInputRef.current = false;
        return;
      }

      if (hasInputRef) hasInputRef.current = true;

      const mx = (x: number) => (1 - x) * canvasW;
      const my = (y: number) => y * canvasH;

      const bodyX = mx((lShoulder.x + rShoulder.x) / 2);
      const bodyY = my((lShoulder.y + rShoulder.y) / 2);

      if (!smoothPosRef.current) {
        smoothPosRef.current = { x: bodyX, y: bodyY };
      }
      const smooth = smoothPosRef.current;
      smooth.x += (bodyX - smooth.x) * POS_SMOOTHING;
      smooth.y += (bodyY - smooth.y) * POS_SMOOTHING;

      const updated = { ...activeState, x: smooth.x, y: smooth.y };

      const lElbow = lm[L_ELBOW];
      const rElbow = lm[R_ELBOW];
      const lWrist = lm[L_WRIST];
      const rWrist = lm[R_WRIST];

      const shoulderTilt = angleDeg(mx(lShoulder.x), my(lShoulder.y), mx(rShoulder.x), my(rShoulder.y));
      const bodyLean = clamp(shoulderTilt * 0.6, -15, 15);
      const jsBody = updated.joints['body'];
      if (jsBody) jsBody.targetAngle = bodyLean;

      const isDragon = activeDef.id === 'dragon';

      if (isDragon) {
        if (isVisible(lElbow)) {
          const lw = isVisible(lWrist) ? lWrist : null;
          const angle = armAngleFromPose(
            mx(lShoulder.x), my(lShoulder.y),
            mx(lElbow.x), my(lElbow.y),
            lw ? mx(lw.x) : null, lw ? my(lw.y) : null,
          );
          const headAngle = clamp(angle * 0.5, -45, 45);
          const js = updated.joints['head'];
          if (js) js.targetAngle = headAngle;
        }
        if (isVisible(rElbow)) {
          const rw = isVisible(rWrist) ? rWrist : null;
          const angle = armAngleFromPose(
            mx(rShoulder.x), my(rShoulder.y),
            mx(rElbow.x), my(rElbow.y),
            rw ? mx(rw.x) : null, rw ? my(rw.y) : null,
          );
          const tailAngle = clamp(angle * 0.6, -50, 50);
          const jsMid = updated.joints['bodyMid'];
          if (jsMid) jsMid.targetAngle = tailAngle * 0.5;
          const jsTail = updated.joints['tail'];
          if (jsTail) jsTail.targetAngle = tailAngle;
        }
      } else {
        if (isVisible(lElbow)) {
          const lw = isVisible(lWrist) ? lWrist : null;
          const angle = armAngleFromPose(
            mx(lShoulder.x), my(lShoulder.y),
            mx(lElbow.x), my(lElbow.y),
            lw ? mx(lw.x) : null, lw ? my(lw.y) : null,
          );
          const js = updated.joints['upperArmL'];
          if (js) js.targetAngle = clamp(angle, -130, 130);
        }

        if (isVisible(rElbow)) {
          const rw = isVisible(rWrist) ? rWrist : null;
          const angle = armAngleFromPose(
            mx(rShoulder.x), my(rShoulder.y),
            mx(rElbow.x), my(rElbow.y),
            rw ? mx(rw.x) : null, rw ? my(rw.y) : null,
          );
          const js = updated.joints['upperArmR'];
          if (js) js.targetAngle = clamp(angle, -130, 130);
        }

        const nose = lm[NOSE];
        if (isVisible(nose)) {
          const noseX = mx(nose.x);
          const headOffset = (noseX - smooth.x) * HEAD_SENSITIVITY;
          const noseY = my(nose.y);
          const shoulderY = my((lShoulder.y + rShoulder.y) / 2);
          const verticalNod = (shoulderY - noseY - canvasH * 0.18) * 0.12;
          const jsHead = updated.joints['head'];
          if (jsHead) jsHead.targetAngle = clamp(headOffset + verticalNod, -35, 35);
        }
      }

      updatePuppetState(activePuppetIndex, updated);

      const now = Date.now();

      if (isVisible(lWrist) && isVisible(rWrist)) {
        const lwx = mx(lWrist.x);
        const lwy = my(lWrist.y);
        const rwx = mx(rWrist.x);
        const rwy = my(rWrist.y);

        if (prevWristRef.current && sfxEnabled && soundManager && now - lastSoundRef.current > 400) {
          const prev = prevWristRef.current;
          const dt = (now - prev.t) / 1000;
          if (dt > 0 && dt < 0.3) {
            const lSpeed = Math.sqrt((lwx - prev.lx) ** 2 + (lwy - prev.ly) ** 2) / dt;
            const rSpeed = Math.sqrt((rwx - prev.rx) ** 2 + (rwy - prev.ry) ** 2) / dt;
            if (lSpeed > SOUND_SPEED_THRESHOLD || rSpeed > SOUND_SPEED_THRESHOLD) {
              soundManager.playDrum();
              lastSoundRef.current = now;
            }
          }
        }

        prevWristRef.current = { lx: lwx, ly: lwy, rx: rwx, ry: rwy, t: now };
      }

      // Gesture combo detection
      if (isVisible(lWrist) && isVisible(rWrist)) {
        const lwx = mx(lWrist.x);
        const lwy = my(lWrist.y);
        const rwx = mx(rWrist.x);
        const rwy = my(rWrist.y);
        const now = Date.now();

        // Double raise: both wrists above shoulders
        const shoulderY = my((lShoulder.y + rShoulder.y) / 2);
        const bothRaised = lwy < shoulderY - 80 && rwy < shoulderY - 80;

        // Track history for circle detection
        const avgWristX = (lwx + rwx) / 2;
        const avgWristY = (lwy + rwy) / 2;
        wristHistoryRef.current.push({ x: avgWristX, y: avgWristY });
        if (wristHistoryRef.current.length > 30) wristHistoryRef.current.shift();

        // Quick squat: hip drops rapidly
        const lHip = lm[L_HIP];
        const rHip = lm[R_HIP];
        if (isVisible(lHip) && isVisible(rHip)) {
          const hipY = my((lHip.y + rHip.y) / 2);
          const hipDrop = hipY - prevHipYRef.current;
          prevHipYRef.current = hipY;

          if (hipDrop > 80 && now - lastComboRef.current > 2000 && sfxEnabled) {
            triggerEffect('smoke', smooth.x, smooth.y + 100);
            lastComboRef.current = now;
          }
        }

        if (bothRaised && now - lastComboRef.current > 2000 && sfxEnabled) {
          triggerEffect('burst', smooth.x, smooth.y - 80);
          lastComboRef.current = now;
        }

        // Circle detection: check if wrist path forms a loop
        const hist = wristHistoryRef.current;
        if (hist.length >= 20 && now - lastComboRef.current > 2000 && sfxEnabled) {
          let totalAngle = 0;
          for (let i = 2; i < hist.length; i++) {
            const dx1 = hist[i - 1].x - hist[i - 2].x;
            const dy1 = hist[i - 1].y - hist[i - 2].y;
            const dx2 = hist[i].x - hist[i - 1].x;
            const dy2 = hist[i].y - hist[i - 1].y;
            const cross = dx1 * dy2 - dy1 * dx2;
            totalAngle += Math.atan2(cross, dx1 * dx2 + dy1 * dy2);
          }
          if (Math.abs(totalAngle) > Math.PI * 2.5) {
            triggerEffect('petals', smooth.x, smooth.y);
            lastComboRef.current = now;
            wristHistoryRef.current = [];
          }
        }
      }

      function triggerEffect(type: 'burst' | 'smoke' | 'petals', x: number, y: number) {
        useTheaterStore.getState().triggerEffect({
          id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          x,
          y,
          startTime: performance.now(),
        });
        if (soundManager) {
          if (type === 'burst') soundManager.playGong();
          else if (type === 'smoke') soundManager.playDrum();
          else soundManager.playWoodblock();
        }
      }
    });

    return unsubscribe;
  }, [puppetDefs, engine, soundManager, canvasRef]);
}
