import { useRef, useEffect } from 'react';
import { HandData } from '@/types/hand-shadow';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  visible: boolean;
  handData?: HandData[];
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const FINGER_TIPS = [4, 8, 12, 16, 20];
const TIP_COLORS = ['#FF6B4A', '#FFD700', '#00FF88', '#44AADD', '#FF88CC'];

function drawFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  handData?: HandData[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, w, h);

  if (handData && handData.length > 0) {
    const mx = (x: number) => (1 - x) * w;
    const my = (y: number) => y * h;

    for (const hand of handData) {
      const lm = hand.landmarks;

      ctx.strokeStyle = '#FFD70060';
      ctx.lineWidth = 1.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        if (!lm[a] || !lm[b]) continue;
        ctx.beginPath();
        ctx.moveTo(mx(lm[a].x), my(lm[a].y));
        ctx.lineTo(mx(lm[b].x), my(lm[b].y));
        ctx.stroke();
      }

      for (let i = 0; i < 21; i++) {
        if (!lm[i]) continue;
        const x = mx(lm[i].x);
        const y = my(lm[i].y);
        const isTip = FINGER_TIPS.includes(i);
        const tipIdx = FINGER_TIPS.indexOf(i);

        ctx.fillStyle = tipIdx >= 0 ? TIP_COLORS[tipIdx] : '#FFFFFFAA';
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const wristX = mx(lm[0].x);
      const wristY = my(lm[0].y);
      ctx.fillStyle = '#FFD700';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hand.handedness === 'Left' ? '左手' : '右手', wristX, wristY + 16);
    }
  }
}

export default function CameraPreview({ videoRef, visible, handData }: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const handDataRef = useRef(handData);
  handDataRef.current = handData;

  useEffect(() => {
    if (!visible) return;

    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      drawFrame(canvas, video, handDataRef.current);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20">
      <div className="relative rounded-lg overflow-hidden gold-border shadow-lg"
        style={{ width: 360, height: 270 }}
      >
        <canvas
          ref={canvasRef}
          width={240}
          height={180}
          className="w-full h-full block"
        />
        <div className="absolute top-1.5 left-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-white/80 font-song">手势追踪</span>
        </div>
      </div>
    </div>
  );
}
