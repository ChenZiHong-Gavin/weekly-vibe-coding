// Hand silhouette contour generation from MediaPipe 21 landmarks
// Uses Catmull-Rom splines for smooth organic hand shadow outlines
// Adapts contour based on finger curl state to avoid self-intersection on fist

const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

// Finger definitions: [mcp, pip, dip, tip]
const FINGERS: [number, number, number, number][] = [
  [THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP],
  [INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP],
  [MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP],
  [RING_MCP, RING_PIP, RING_DIP, RING_TIP],
  [PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP],
];

const SEGMENTS = 12;

export interface ContourPoint {
  x: number;
  y: number;
}

export class HandSilhouette {

  // Check if a finger is extended (not curled into fist)
  private isFingerExtended(
    landmarks: { x: number; y: number }[],
    mcp: number,
    pip: number,
    tip: number,
  ): boolean {
    const lmMCP = landmarks[mcp];
    const lmPIP = landmarks[pip];
    const lmTIP = landmarks[tip];
    if (!lmMCP || !lmPIP || !lmTIP) return true; // default to extended if data missing

    // Distance MCP→TIP divided by (MCP→PIP + PIP→TIP)
    const mcpToTip = Math.hypot(lmTIP.x - lmMCP.x, lmTIP.y - lmMCP.y);
    const mcpToPip = Math.hypot(lmPIP.x - lmMCP.x, lmPIP.y - lmMCP.y);
    const pipToTip = Math.hypot(lmTIP.x - lmPIP.x, lmTIP.y - lmPIP.y);

    const extendedDist = mcpToPip + pipToTip;
    if (extendedDist < 0.001) return true;

    // Ratio > 0.55 means finger is mostly straight
    return mcpToTip / extendedDist > 0.55;
  }

  // Check if thumb is extended
  private isThumbExtended(
    landmarks: { x: number; y: number }[],
  ): boolean {
    const lmCMC = landmarks[THUMB_CMC];
    const lmMCP = landmarks[THUMB_MCP];
    const lmTIP = landmarks[THUMB_TIP];
    if (!lmCMC || !lmMCP || !lmTIP) return true;

    const cmcToTip = Math.hypot(lmTIP.x - lmCMC.x, lmTIP.y - lmCMC.y);
    const cmcToMcp = Math.hypot(lmMCP.x - lmCMC.x, lmMCP.y - lmCMC.y);
    const mcpToTip = Math.hypot(lmTIP.x - lmMCP.x, lmTIP.y - lmMCP.y);

    const extendedDist = cmcToMcp + mcpToTip;
    if (extendedDist < 0.001) return true;

    return cmcToTip / extendedDist > 0.5;
  }

  generateContour(landmarks: { x: number; y: number }[], canvasW: number, canvasH: number): ContourPoint[] {
    const mx = (v: number) => (1 - v) * canvasW;
    const my = (v: number) => v * canvasH;

    const thumbExt = this.isThumbExtended(landmarks);
    const indexExt = this.isFingerExtended(landmarks, INDEX_MCP, INDEX_PIP, INDEX_TIP);
    const middleExt = this.isFingerExtended(landmarks, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP);
    const ringExt = this.isFingerExtended(landmarks, RING_MCP, RING_PIP, RING_TIP);
    const pinkyExt = this.isFingerExtended(landmarks, PINKY_MCP, PINKY_PIP, PINKY_TIP);

    // Build adaptive contour
    // Extended fingers: trace full MCP→PIP→DIP→TIP path
    // Curled fingers: use only MCP (knuckle), the natural outer boundary of a fist
    const contour: number[] = [WRIST];

    // ── Pinky ──
    contour.push(PINKY_MCP);
    if (pinkyExt) {
      contour.push(PINKY_PIP, PINKY_DIP, PINKY_TIP);
    }

    // ── Ring (tip→pip when extended, MCP when curled) ──
    if (ringExt) {
      contour.push(RING_TIP, RING_DIP, RING_PIP);
    } else {
      contour.push(RING_MCP);
    }

    // ── Middle ──
    if (middleExt) {
      contour.push(MIDDLE_TIP, MIDDLE_DIP, MIDDLE_PIP);
    } else {
      contour.push(MIDDLE_MCP);
    }

    // ── Index ──
    if (indexExt) {
      contour.push(INDEX_TIP, INDEX_DIP, INDEX_PIP, INDEX_MCP);
    } else {
      contour.push(INDEX_MCP);
    }

    // ── Thumb ──
    if (thumbExt) {
      contour.push(THUMB_TIP, THUMB_IP, THUMB_MCP, THUMB_CMC);
    } else {
      contour.push(THUMB_MCP, THUMB_CMC);
    }
    contour.push(WRIST);

    const points: ContourPoint[] = [];
    for (const idx of contour) {
      const lm = landmarks[idx];
      if (!lm) continue;
      points.push({ x: mx(lm.x), y: my(lm.y) });
    }

    if (points.length < 3) return points;
    return this.catmullRomSmooth(points, SEGMENTS);
  }

  private catmullRomSmooth(pts: ContourPoint[], segments: number): ContourPoint[] {
    const result: ContourPoint[] = [];

    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const p3 = pts[(i + 2) % pts.length];

      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        result.push({ x, y });
      }
    }

    return result;
  }

  generateShadowPath(landmarks: { x: number; y: number }[], canvasW: number, canvasH: number): Path2D {
    const contour = this.generateContour(landmarks, canvasW, canvasH);
    const path = new Path2D();

    if (contour.length < 3) return path;

    path.moveTo(contour[0].x, contour[0].y);
    for (let i = 1; i < contour.length; i++) {
      path.lineTo(contour[i].x, contour[i].y);
    }
    path.closePath();

    return path;
  }
}
