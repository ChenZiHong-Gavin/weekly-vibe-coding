import { useEffect, useRef } from 'react';
import { PuppetEngine } from '@/core/PuppetEngine';
import { PuppetDef, GestureResult } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';

const POS_SMOOTHING = 0.6;
const VELOCITY_GAIN = 5.0;
const HEAD_YAW_SCALE = 0.5;
const ROLL_SCALE = 0.7;
const CURL_ARM_SCALE = 130;
const CURL_DEAD_ZONE = 0.12;

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
  const lastCurlRef = useRef<{ thumb: number; pinky: number }>({ thumb: 0.5, pinky: 0.5 });

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
      const canvasH = canvasEl?.height || window.innerHeight;

      const gesture = gestures[0];
      if (!gesture || gesture.type === 'none') {
        if (hasInputRef) hasInputRef.current = false;
        return;
      }

      if (hasInputRef) hasInputRef.current = true;

      // Smooth cursor position (used for effects placement)
      if (!smoothPosRef.current) {
        smoothPosRef.current = { x: gesture.position.x, y: gesture.position.y };
      }
      const smooth = smoothPosRef.current;
      smooth.x += (gesture.position.x - smooth.x) * POS_SMOOTHING;
      smooth.y += (gesture.position.y - smooth.y) * POS_SMOOTHING;

      const updated = { ...activeState };

      // --- Velocity-driven body movement ---
      updated.vx = (updated.vx ?? 0) + gesture.palmDelta.x * VELOCITY_GAIN;
      updated.vy = (updated.vy ?? 0) + gesture.palmDelta.y * VELOCITY_GAIN;
      // Clamp max velocity so puppet doesn't fly off
      updated.vx = clamp(updated.vx, -800, 800);
      updated.vy = clamp(updated.vy, -800, 800);

      // --- Wrist yaw → head rotation ---
      const rawHead = gesture.wristAngle.yaw * HEAD_YAW_SCALE;
      const headAngle = clamp(rawHead, -35, 35);

      // --- Wrist roll → body lean ---
      const bodyLean = clamp(gesture.wristAngle.roll * ROLL_SCALE, -18, 18);

      // --- Finger curl → arm angles (with dead zone) ---
      const curls = gesture.fingerCurls;
      const thumbCurl = curls.thumb;
      const pinkyCurl = curls.pinky;
      const prevCurl = lastCurlRef.current;

      // Only update if curl changed enough (dead zone)
      let leftArmTarget = activeState.joints['upperArmL']?.targetAngle ?? 0;
      let rightArmTarget = activeState.joints['upperArmR']?.targetAngle ?? 0;

      if (Math.abs(thumbCurl - prevCurl.thumb) > CURL_DEAD_ZONE) {
        // Curled thumb = arm raises: (1 - curl) maps 0→1 to angle 0→130
        leftArmTarget = clamp((1 - thumbCurl) * CURL_ARM_SCALE, -130, 130);
        prevCurl.thumb = thumbCurl;
      }

      if (Math.abs(pinkyCurl - prevCurl.pinky) > CURL_DEAD_ZONE) {
        rightArmTarget = clamp((1 - pinkyCurl) * CURL_ARM_SCALE, -130, 130);
        prevCurl.pinky = pinkyCurl;
      }
      lastCurlRef.current = prevCurl;

      const isDragon = activeDef.id === 'dragon';
      if (isDragon) {
        const jsHead = updated.joints['head'];
        if (jsHead) jsHead.targetAngle = clamp(headAngle * 0.7, -45, 45);
        const jsMid = updated.joints['bodyMid'];
        if (jsMid) jsMid.targetAngle = bodyLean * 0.5;
        const jsTail = updated.joints['tail'];
        if (jsTail) jsTail.targetAngle = gesture.wristAngle.roll * 0.6;
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

      updatePuppetState(activePuppetIndex, updated);

      // --- Gesture combo triggers (unchanged) ---
      const now = Date.now();
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
