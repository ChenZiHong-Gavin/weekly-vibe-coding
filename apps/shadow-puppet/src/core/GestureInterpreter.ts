import { HandData, GestureResult } from '@/types/puppet';

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;
const THUMB_IP = 3;
const INDEX_PIP = 6;
const MIDDLE_PIP = 10;
const RING_PIP = 14;
const PINKY_PIP = 18;
const THUMB_MCP = 2;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(landmarks: HandData['landmarks'], tip: number, pip: number, mcp: number): boolean {
  return landmarks[tip].y < landmarks[pip].y && landmarks[pip].y < landmarks[mcp].y;
}

function fingerCurl(
  lm: HandData['landmarks'], tip: number, pip: number, mcp: number,
): number {
  // MediaPipe y increases downward. Extended: tip.y < pip.y. Curled: tip.y ≈ pip.y.
  const extension = (lm[pip].y - lm[tip].y) / (Math.abs(lm[mcp].y - lm[tip].y) + 0.001);
  return Math.max(0, Math.min(1, extension)); // 1 = fully extended
}

function radToDeg(r: number): number { return r * 180 / Math.PI; }

export class GestureInterpreter {
  private prevPositions: Map<string, { x: number; y: number; t: number }[]> = new Map();
  private cooldowns: Map<string, number> = new Map();

  interpret(hands: HandData[], canvasWidth: number, canvasHeight: number): GestureResult[] {
    const results: GestureResult[] = [];

    for (const hand of hands) {
      const lm = hand.landmarks;
      const handKey = hand.handedness.toLowerCase() as 'left' | 'right';

      // Palm center (mirrored X for natural mapping)
      const palmX = (lm[WRIST].x + lm[INDEX_MCP].x + lm[MIDDLE_MCP].x + lm[RING_MCP].x + lm[PINKY_MCP].x) / 5;
      const palmY = (lm[WRIST].y + lm[INDEX_MCP].y + lm[MIDDLE_MCP].y + lm[RING_MCP].y + lm[PINKY_MCP].y) / 5;

      const screenX = (1 - palmX) * canvasWidth;
      const screenY = palmY * canvasHeight;

      // Wrist position (for arm angle calculations)
      const wristX = (1 - lm[WRIST].x) * canvasWidth;
      const wristY = lm[WRIST].y * canvasHeight;

      const fingerTips = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP].map(i => ({
        x: (1 - lm[i].x) * canvasWidth,
        y: lm[i].y * canvasHeight,
      }));

      // Finger states
      const indexExtended = isFingerExtended(lm, INDEX_TIP, INDEX_PIP, INDEX_MCP);
      const middleExtended = isFingerExtended(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
      const ringExtended = isFingerExtended(lm, RING_TIP, RING_PIP, RING_MCP);
      const pinkyExtended = isFingerExtended(lm, PINKY_TIP, PINKY_PIP, PINKY_MCP);
      const thumbExtended = lm[THUMB_TIP].x < lm[THUMB_IP].x;
      const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended, thumbExtended].filter(Boolean).length;

      const thumbIndexDist = distance(lm[THUMB_TIP], lm[INDEX_TIP]);
      const isPinch = thumbIndexDist < 0.05;

      let type: GestureResult['type'] = 'open';
      let confidence = 0.7;

      if (extendedCount <= 1 && !indexExtended) {
        type = 'fist';
        confidence = 0.85;
      } else if (isPinch) {
        type = 'pinch';
        confidence = 0.8;
      } else if (extendedCount >= 4) {
        type = 'open';
        confidence = 0.9;
      } else if (indexExtended && !middleExtended && !ringExtended) {
        type = 'point';
        confidence = 0.85;
      }

      // Detect wave gesture
      const now = Date.now();
      if (!this.prevPositions.has(handKey)) {
        this.prevPositions.set(handKey, []);
      }
      const history = this.prevPositions.get(handKey)!;
      history.push({ x: screenX, y: screenY, t: now });
      if (history.length > 10) history.shift();

      if (history.length >= 5) {
        const recent = history.slice(-5);
        let dirChanges = 0;
        for (let i = 2; i < recent.length; i++) {
          const prevDx = recent[i - 1].x - recent[i - 2].x;
          const currDx = recent[i].x - recent[i - 1].x;
          if (prevDx * currDx < 0 && Math.abs(currDx) > 3) dirChanges++;
        }
        if (dirChanges >= 2) {
          const cooldownKey = `wave_${handKey}`;
          const lastWave = this.cooldowns.get(cooldownKey) || 0;
          if (now - lastWave > 1000) {
            type = 'wave';
            confidence = 0.8;
            this.cooldowns.set(cooldownKey, now);
          }
        }
      }

      // Finger curl ratios
      const fingerCurls = {
        thumb: fingerCurl(lm, THUMB_TIP, THUMB_IP, THUMB_MCP),
        index: fingerCurl(lm, INDEX_TIP, INDEX_PIP, INDEX_MCP),
        middle: fingerCurl(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
        ring: fingerCurl(lm, RING_TIP, RING_PIP, RING_MCP),
        pinky: fingerCurl(lm, PINKY_TIP, PINKY_PIP, PINKY_MCP),
      };

      // Wrist angles (yaw = hand rotation, roll = hand tilt)
      const wristAngle = {
        yaw: radToDeg(Math.atan2(
          lm[MIDDLE_MCP].x - lm[WRIST].x,
          lm[MIDDLE_MCP].y - lm[WRIST].y,
        )),
        roll: radToDeg(Math.atan2(
          lm[PINKY_MCP].y - lm[INDEX_MCP].y,
          lm[PINKY_MCP].x - lm[INDEX_MCP].x,
        )),
      };

      // Palm delta (velocity from previous position)
      let palmDelta = { x: 0, y: 0 };
      if (history.length >= 2) {
        const prev = history[history.length - 2];
        palmDelta.x = screenX - prev.x;
        palmDelta.y = screenY - prev.y;
      }

      results.push({
        type,
        hand: handKey,
        position: { x: screenX, y: screenY },
        confidence,
        fingerTips,
        wristPosition: { x: wristX, y: wristY },
        palmAngle: Math.atan2(screenY - wristY, screenX - wristX),
        fingerCurls,
        wristAngle,
        palmDelta,
      } as GestureResult);
    }

    return results;
  }

  reset(): void {
    this.prevPositions.clear();
    this.cooldowns.clear();
  }
}
