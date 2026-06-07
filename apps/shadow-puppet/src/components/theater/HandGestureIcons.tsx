import { useId } from 'react';

// Finger colors matching CameraPreview TIP_COLORS
const THUMB = '#FF6B4A';
const INDEX = '#FFD700';
const MIDDLE = '#00FF88';
const RING = '#44AADD';
const PINKY = '#FF88CC';
const PALM = '#FFFFFF';

interface HandIconProps { size?: number; className?: string; }

/* ── Open palm facing camera — main control illustration ── */
export function OpenHandLabeled({ size = 90, className }: HandIconProps) {
  const w = 90, h = 78;
  const sx = (x: number) => (x / 90) * w;
  const sy = (y: number) => (y / 78) * h;
  // Palm as rounded shape
  const palmPath = [
    `M ${sx(24)} ${sy(52)}`,
    `C ${sx(24)} ${sy(36)} ${sx(28)} ${sy(28)} ${sx(30)} ${sy(26)}`, // left → index base
    `C ${sx(32)} ${sy(16)} ${sx(31)} ${sy(8)}  ${sx(32)} ${sy(6)}`,  // index up
    `C ${sx(33)} ${sy(3)}  ${sx(35)} ${sy(4)}  ${sx(35)} ${sy(6)}`,  // index tip
    `C ${sx(35)} ${sy(10)} ${sx(34)} ${sy(18)} ${sx(34)} ${sy(26)}`, // index down
    `C ${sx(36)} ${sy(16)} ${sx(36)} ${sy(6)}  ${sx(36)} ${sy(3)}`,  // middle up
    `C ${sx(36)} ${sy(0)}  ${sx(39)} ${sy(1)}  ${sx(39)} ${sy(3)}`,  // middle tip
    `C ${sx(39)} ${sy(10)} ${sx(38)} ${sy(18)} ${sx(38)} ${sy(26)}`, // middle down
    `C ${sx(40)} ${sy(16)} ${sx(42)} ${sy(8)}  ${sx(43)} ${sy(5)}`,  // ring up
    `C ${sx(44)} ${sy(2)}  ${sx(46)} ${sy(4)}  ${sx(46)} ${sy(6)}`,  // ring tip
    `C ${sx(45)} ${sy(12)} ${sx(44)} ${sy(18)} ${sx(43)} ${sy(26)}`, // ring down
    `C ${sx(46)} ${sy(20)} ${sx(50)} ${sy(14)} ${sx(52)} ${sy(12)}`, // pinky up
    `C ${sx(54)} ${sy(9)}  ${sx(56)} ${sy(10)} ${sx(57)} ${sy(13)}`, // pinky tip
    `C ${sx(56)} ${sy(18)} ${sx(54)} ${sy(24)} ${sx(50)} ${sy(28)}`, // pinky down
    `C ${sx(56)} ${sy(30)} ${sx(60)} ${sy(36)} ${sx(62)} ${sy(44)}`,  // right palm
    `C ${sx(64)} ${sy(52)} ${sx(62)} ${sy(56)} ${sx(58)} ${sy(56)}`,  // right wrist
    `C ${sx(54)} ${sy(56)} ${sx(30)} ${sy(56)} ${sx(26)} ${sy(56)}`,  // wrist bottom
    `C ${sx(22)} ${sy(56)} ${sx(20)} ${sy(52)} ${sx(22)} ${sy(46)}`,  // left wrist
    `C ${sx(24)} ${sy(38)} ${sx(24)} ${sy(30)} ${sx(16)} ${sy(28)}`,  // left palm up
    `C ${sx(10)} ${sy(26)} ${sx(6)}  ${sy(20)} ${sx(8)}  ${sy(16)}`,  // thumb out
    `C ${sx(10)} ${sy(12)} ${sx(14)} ${sy(14)} ${sx(16)} ${sy(18)}`,  // thumb tip
    `C ${sx(18)} ${sy(22)} ${sx(20)} ${sy(26)} ${sx(22)} ${sy(28)}`,  // thumb back
  ].join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      {/* Palm outline */}
      <path d={palmPath} stroke={PALM} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="rgba(255,255,255,0.06)" />
      {/* Finger joints (subtle lines) */}
      {[[32,12,34,12],[36,10,38,10],[42,10,44,10]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke={PALM} strokeWidth="0.6" opacity="0.3" />
      ))}
      {/* Finger tip dots — color coded */}
      <circle cx={sx(33.5)} cy={sy(5)} r="2.5" fill={INDEX} />
      <circle cx={sx(37.5)} cy={sy(2)} r="2.5" fill={MIDDLE} />
      <circle cx={sx(45)} cy={sy(4.5)} r="2.5" fill={RING} />
      <circle cx={sx(55)} cy={sy(12)} r="2" fill={PINKY} />
      <circle cx={sx(11)} cy={sy(16)} r="2" fill={THUMB} />
      {/* Palm center dot */}
      <circle cx={sx(40)} cy={sy(40)} r="3" fill={PALM} opacity="0.5" />
    </svg>
  );
}

/* ── Hand from side, index pointing up ── */
export function PointHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 48" fill="none" className={className}>
      {/* Fist */}
      <rect x="10" y="26" width="20" height="14" rx="6" stroke="currentColor" strokeWidth="2" />
      <line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="34" x2="26" y2="34" stroke="currentColor" strokeWidth="1" />
      {/* Thumb */}
      <path d="M 10 32 Q 4 28 6 22" stroke={THUMB} strokeWidth="2.5" strokeLinecap="round" />
      {/* Index */}
      <path d="M 26 26 Q 28 14 27 6" stroke={INDEX} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="27" cy="6" r="2.5" fill={INDEX} />
    </svg>
  );
}

/* ── Thumb + pinky extended (arms control) ── */
export function ShakaHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 48" fill="none" className={className}>
      {/* Fist */}
      <rect x="10" y="26" width="22" height="14" rx="6" stroke="currentColor" strokeWidth="2" />
      {/* Curled middle fingers */}
      <line x1="14" y1="30" x2="18" y2="30" stroke="currentColor" strokeWidth="1" />
      <line x1="21" y1="30" x2="24" y2="30" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="34" x2="24" y2="34" stroke="currentColor" strokeWidth="1" />
      {/* Thumb out left */}
      <path d="M 11 32 Q 4 28 6 20" stroke={THUMB} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="6" cy="20" r="2" fill={THUMB} />
      {/* Pinky up right */}
      <path d="M 31 28 Q 36 20 35 10" stroke={PINKY} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="35" cy="10" r="2" fill={PINKY} />
    </svg>
  );
}

/* ── Pinching hand ── */
export function PinchHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" className={className}>
      {/* Palm side */}
      <rect x="12" y="24" width="16" height="12" rx="5" stroke="currentColor" strokeWidth="2" />
      {/* Curled ring/pinky */}
      <line x1="16" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="32" x2="26" y2="32" stroke="currentColor" strokeWidth="1" />
      {/* Thumb curving to meet index */}
      <path d="M 12 30 Q 6 24 14 14" stroke={THUMB} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.5" fill={THUMB} />
      {/* Index curving to meet thumb */}
      <path d="M 26 24 Q 22 18 16 15" stroke={INDEX} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2.5" fill={INDEX} />
      {/* Sparkle */}
      <text x="18" y="10" fontSize="8" fill="#FFD700">✦</text>
    </svg>
  );
}

/* ── Closed fist ── */
export function FistHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 40" fill="none" className={className}>
      {/* Main fist shape */}
      <rect x="6" y="12" width="22" height="20" rx="8" stroke="currentColor" strokeWidth="2" />
      {/* Knuckle lines */}
      <line x1="9" y1="17" x2="25" y2="17" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="22" x2="25" y2="22" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="27" x2="25" y2="27" stroke="currentColor" strokeWidth="1" />
      {/* Finger tops (knuckles visible at top) */}
      <path d="M 10 12 Q 12 6 14 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M 14 12 Q 17 4 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M 20 12 Q 22 6 24 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Thumb side */}
      <path d="M 6 20 Q 2 16 4 12" stroke={THUMB} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Waving hand ── */
export function WaveHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none" className={className}>
      <g transform="rotate(-12 22 26)">
        {/* Palm */}
        <rect x="10" y="26" width="20" height="14" rx="6" stroke="currentColor" strokeWidth="2" />
        {/* Fingers */}
        <path d="M 14 26 L 13 14" stroke={PINKY} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 18 26 L 17 10" stroke={RING} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 22 26 L 22 8" stroke={MIDDLE} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 26 26 L 27 10" stroke={INDEX} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 30 28 L 34 20" stroke={THUMB} strokeWidth="2.5" strokeLinecap="round" />
        {/* Finger tips */}
        <circle cx="13" cy="14" r="2" fill={PINKY} />
        <circle cx="17" cy="10" r="2" fill={RING} />
        <circle cx="22" cy="8" r="2" fill={MIDDLE} />
        <circle cx="27" cy="10" r="2" fill={INDEX} />
        <circle cx="34" cy="20" r="2" fill={THUMB} />
      </g>
      {/* Motion arcs */}
      <path d="M 36 8 Q 40 10 38 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M 40 4 Q 44 6 42 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* ── Open palm (simpler, for compact use) ── */
export function OpenHand({ size = 40, className }: HandIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" className={className}>
      <rect x="8" y="22" width="24" height="16" rx="7" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="22" x2="12" y2="12" stroke={PINKY} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="22" x2="16" y2="8" stroke={RING} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="22" x2="20" y2="6" stroke={MIDDLE} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="22" x2="24" y2="8" stroke={INDEX} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="24" x2="32" y2="16" stroke={THUMB} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill={PINKY} />
      <circle cx="16" cy="8" r="2" fill={RING} />
      <circle cx="20" cy="6" r="2" fill={MIDDLE} />
      <circle cx="24" cy="8" r="2" fill={INDEX} />
      <circle cx="32" cy="16" r="2" fill={THUMB} />
      <circle cx="20" cy="31" r="2.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
