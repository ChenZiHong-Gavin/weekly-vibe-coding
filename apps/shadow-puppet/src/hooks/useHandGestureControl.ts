import { useEffect, useRef } from 'react';
import { PuppetEngine } from '@/core/PuppetEngine';
import { PuppetDef, GestureResult } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';

const POS_SMOOTHING = 0.8;
// Multiplier: pixel displacement → joint angle degrees
const HEAD_SCALE = 2.5;
const ARM_SCALE = 5.0;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function useHandGestureControl(
  puppetDefs: PuppetDef[],
  engine: PuppetEngine,
  soundManager: SoundManager | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hasInputRef?: React.RefObject<boolean>,
) {
  const smoothPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastComboRef = useRef(0);
  const fistTimerRef = useRef(0);

  useEffect(() => {
    const unsubscribe = useTheaterStore.subscribe((state, prevState) => {
      if (state.gestures === prevState.gestures) return;

      const {
        puppetStates,
        activePuppetIndex,
        sfxEnabled,
        gestures,
        updatePuppetState,
      } = state;

      if (puppetStates.length === 0) {
        if (hasInputRef) hasInputRef.current = false;
        return;
      }

      const activeState = puppetStates[activePuppetIndex];
      if (!activeState) return;
      const activeDef = puppetDefs.find(d => d.id === activeState.puppetId);
      if (!activeDef) return;

      const canvasEl = canvasRef.current;
      const canvasW = canvasEl?.width || window.innerWidth;

      // Use the first detected hand for control
      const gesture = gestures[0];
      if (!gesture || gesture.type === 'none') {
        if (hasInputRef) hasInputRef.current = false;
        return;
      }

      if (hasInputRef) hasInputRef.current = true;

      const palmX = gesture.position.x;
      const palmY = gesture.position.y;

      // Smooth body position
      if (!smoothPosRef.current) {
        smoothPosRef.current = { x: palmX, y: palmY };
      }
      const smooth = smoothPosRef.current;
      smooth.x += (palmX - smooth.x) * POS_SMOOTHING;
      smooth.y += (palmY - smooth.y) * POS_SMOOTHING;

      const updated = { ...activeState, x: smooth.x, y: smooth.y };

      const isDragon = activeDef.id === 'dragon';
      const now = Date.now();

      // Map finger tips to joints via direct displacement
      const fp = gesture.fingerTips; // [thumb, index, middle, ring, pinky]
      if (fp && fp.length >= 5) {
        const thumb = fp[0];
        const index = fp[1];
        const middle = fp[2];
        const pinky = fp[4];

        // Direct displacement: finger X offset from palm → joint angle
        // More pixels away = more extreme angle
        const idxDx = index.x - smooth.x;
        const idxDy = index.y - smooth.y;
        const thumbDx = thumb.x - smooth.x;
        const pinkyDx = pinky.x - smooth.x;

        // Head: index finger left/right from palm (screen space: right is +x)
        const rawHead = idxDx * HEAD_SCALE;
        const headAngle = clamp(rawHead, -35, 35);

        // Arms: thumb controls left arm, pinky controls right arm
        // In mirrored screen space: thumb on left side has negative dx → left arm angle
        const rawLeftArm = -thumbDx * ARM_SCALE;
        const rawRightArm = pinkyDx * ARM_SCALE;
        const leftArmTarget = clamp(rawLeftArm, -130, 130);
        const rightArmTarget = clamp(rawRightArm, -130, 130);

        // Body lean from index vertical displacement
        const bodyLean = clamp(idxDy * 0.6, -15, 15);

        if (isDragon) {
          const jsHead = updated.joints['head'];
          if (jsHead) jsHead.targetAngle = clamp(headAngle * 0.7, -45, 45);
          const jsMid = updated.joints['bodyMid'];
          if (jsMid) jsMid.targetAngle = leftArmTarget * 0.5;
          const jsTail = updated.joints['tail'];
          if (jsTail) jsTail.targetAngle = rightArmTarget * 0.5;
          const jsBody = updated.joints['body'];
          if (jsBody) jsBody.targetAngle = bodyLean;
        } else {
          const jsHead = updated.joints['head'];
          if (jsHead) jsHead.targetAngle = headAngle;
          const jsLArm = updated.joints['upperArmL'];
          if (jsLArm) jsLArm.targetAngle = leftArmTarget;
          const jsRArm = updated.joints['upperArmR'];
          if (jsRArm) jsRArm.targetAngle = rightArmTarget;
          const jsBody = updated.joints['body'];
          if (jsBody) jsBody.targetAngle = bodyLean;
        }
      }

      updatePuppetState(activePuppetIndex, updated);

      // Gesture combo triggers
      if (gesture.type === 'pinch' && now - lastComboRef.current > 2000 && sfxEnabled) {
        triggerEffect('burst', smooth.x, smooth.y - 60);
        lastComboRef.current = now;
      }

      if (gesture.type === 'wave' && now - lastComboRef.current > 2000 && sfxEnabled) {
        triggerEffect('petals', smooth.x, smooth.y);
        lastComboRef.current = now;
      }

      if (gesture.type === 'fist') {
        if (fistTimerRef.current === 0) fistTimerRef.current = now;
        if (now - fistTimerRef.current > 600 && sfxEnabled && now - lastComboRef.current > 2000) {
          triggerEffect('smoke', smooth.x, smooth.y + 40);
          lastComboRef.current = now;
          fistTimerRef.current = 0;
        }
      } else {
        fistTimerRef.current = 0;
      }
    });

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

    return unsubscribe;
  }, [puppetDefs, engine, soundManager, canvasRef]);
}
