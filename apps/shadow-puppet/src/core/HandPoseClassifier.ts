import { HandData, HandPoseResult } from '@/types/hand-shadow';

// 11 classic hand shadow poses
export const POSE_NAMES: Record<string, string> = {
  bird: '飞鸟',
  dog: '小狗',
  rabbit: '玉兔',
  eagle: '雄鹰',
  deer: '小鹿',
  goose: '白鹅',
  peacock: '孔雀',
  fox: '狐狸',
  cat: '小猫',
  cobra: '眼镜蛇',
  old_man: '老翁',
};

const THUMB_TIP = 4;
const THUMB_IP = 3;
const THUMB_MCP = 2;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_PIP = 14;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_PIP = 18;
const PINKY_MCP = 17;

type LM = { x: number; y: number }[];

function isExtended(lm: LM, tip: number, pip: number, mcp: number): boolean {
  // MediaPipe y-down: extended finger has tip above pip above mcp
  return lm[tip].y < lm[pip].y && lm[pip].y < lm[mcp].y;
}

function fingerAngle(lm: LM, mcp: number, tip: number): number {
  return Math.atan2(lm[tip].y - lm[mcp].y, lm[tip].x - lm[mcp].x);
}

function dist(lm: LM, a: number, b: number): number {
  return Math.sqrt((lm[a].x - lm[b].x) ** 2 + (lm[a].y - lm[b].y) ** 2);
}

// Angle between two finger vectors (spread)
function spreadAngle(lm: LM, mcp1: number, tip1: number, mcp2: number, tip2: number): number {
  const a1 = fingerAngle(lm, mcp1, tip1);
  const a2 = fingerAngle(lm, mcp2, tip2);
  let diff = Math.abs(a1 - a2);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff * 180 / Math.PI;
}

export class HandPoseClassifier {
  classify(hand: HandData): HandPoseResult {
    const lm = hand.landmarks;
    const h = hand.handedness === 'Left' ? 'left' : 'right';

    const thumbEx = isExtended(lm, THUMB_TIP, THUMB_IP, THUMB_MCP);
    const indexEx = isExtended(lm, INDEX_TIP, INDEX_PIP, INDEX_MCP);
    const middleEx = isExtended(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    const ringEx = isExtended(lm, RING_TIP, RING_PIP, RING_MCP);
    const pinkyEx = isExtended(lm, PINKY_TIP, PINKY_PIP, PINKY_MCP);

    const thumbIndexDist = dist(lm, THUMB_TIP, INDEX_TIP);
    const indexMidDist = dist(lm, INDEX_TIP, MIDDLE_TIP);

    const spreadIdxMid = spreadAngle(lm, INDEX_MCP, INDEX_TIP, MIDDLE_MCP, MIDDLE_TIP);
    const spreadMidRing = spreadAngle(lm, MIDDLE_MCP, MIDDLE_TIP, RING_MCP, RING_TIP);
    const spreadRingPinky = spreadAngle(lm, RING_MCP, RING_TIP, PINKY_MCP, PINKY_TIP);
    const avgSpread = (spreadIdxMid + spreadMidRing + spreadRingPinky) / 3;

    const extendedCount = [thumbEx, indexEx, middleEx, ringEx, pinkyEx].filter(Boolean).length;

    // ── Classification ──
    const results: { pose: string; confidence: number }[] = [];

    // Old man: thumb + index extended in L-shape, others curled
    if (thumbEx && indexEx && !middleEx && !ringEx && !pinkyEx) {
      results.push({ pose: 'old_man', confidence: 0.85 });
    }

    // Bird: index + middle together, others curled
    if (!thumbEx && indexEx && middleEx && !ringEx && !pinkyEx && indexMidDist < 0.08) {
      results.push({ pose: 'bird', confidence: 0.85 });
    }

    // Rabbit (V sign): index + middle spread apart, others curled
    if (!thumbEx && indexEx && middleEx && !ringEx && !pinkyEx && spreadIdxMid > 8) {
      results.push({ pose: 'rabbit', confidence: 0.85 });
    }

    // Dog: index + middle + pinky extended, ring curled
    if (indexEx && middleEx && !ringEx && pinkyEx) {
      results.push({ pose: 'dog', confidence: 0.82 });
    }

    // Deer (shaka): thumb + pinky extended, others curled
    if (thumbEx && !indexEx && !middleEx && !ringEx && pinkyEx) {
      results.push({ pose: 'deer', confidence: 0.88 });
    }

    // Goose: thumb + index pinched, others extended
    if (thumbIndexDist < 0.08 && middleEx && ringEx && pinkyEx) {
      results.push({ pose: 'goose', confidence: 0.82 });
    }

    // Fox: thumb + index + middle together, ring + pinky curled
    if (thumbEx && indexEx && middleEx && !ringEx && !pinkyEx && indexMidDist < 0.06) {
      results.push({ pose: 'fox', confidence: 0.82 });
    }

    // Cat: all fingers slightly curled (moderate extension), close together
    if (extendedCount === 0 && avgSpread < 12) {
      results.push({ pose: 'cat', confidence: 0.75 });
    }

    // Cobra: all fingers extended, tightly together (small spread)
    if (extendedCount >= 4 && avgSpread < 10) {
      results.push({ pose: 'cobra', confidence: 0.82 });
    }

    // Peacock: all fingers extended, wide spread
    if (extendedCount >= 4 && avgSpread > 18) {
      results.push({ pose: 'peacock', confidence: 0.80 });
    }

    // Eagle: all fingers extended, moderate spread
    if (extendedCount >= 4 && avgSpread > 10 && avgSpread <= 18) {
      results.push({ pose: 'eagle', confidence: 0.78 });
    }

    // Best match
    if (results.length === 0) {
      return { pose: '', confidence: 0, hand: h };
    }
    results.sort((a, b) => b.confidence - a.confidence);
    return { ...results[0], hand: h };
  }
}
