import { motion, AnimatePresence } from 'framer-motion';
import { useTheaterStore } from '@/store/theaterStore';
import { POSE_NAMES } from '@/core/HandPoseClassifier';
import { useState } from 'react';

// Which fingers are extended for each pose
// thumb, index, middle, ring, pinky — true = extended
const POSE_FINGERS: Record<string, { fingers: boolean[]; instruction: string }> = {
  bird:      { fingers: [true,  true,  true,  false, false], instruction: '食指中指并拢伸直，拇指外展，其余握拳' },
  dog:       { fingers: [true,  true,  true,  false, true],  instruction: '食指中指小指伸直，无名指弯曲贴手心' },
  rabbit:    { fingers: [false, true,  true,  false, false], instruction: '食指中指分开伸直成V字，其余弯曲握拳' },
  eagle:     { fingers: [true,  true,  true,  true,  true],  instruction: '五指全部张开，指间尽量分开伸展' },
  deer:      { fingers: [true,  false, false, false, true],  instruction: '拇指小指伸直，中间三指向掌心弯曲' },
  goose:     { fingers: [true,  false, true,  true,  true],  instruction: '拇指食指指尖相捏，其余三指伸直并拢' },
  peacock:   { fingers: [true,  true,  true,  true,  true],  instruction: '五指全部张开，指间用力撑开到最大' },
  fox:       { fingers: [true,  true,  true,  false, false], instruction: '拇指食指中指伸直并拢，无名指小指弯曲' },
  cat:       { fingers: [false, false, false, false, false], instruction: '五指自然微曲放松，指尖靠近，如猫爪状' },
  cobra:     { fingers: [true,  true,  true,  true,  true],  instruction: '五指并拢伸直，手掌平展，如蛇头状' },
  old_man:   { fingers: [true,  true,  false, false, false], instruction: '拇指食指伸直成L形，其余三指弯曲握拳' },
};

const FINGER_NAMES = ['拇', '食', '中', '无', '小'];

export default function GestureGuide() {
  const { showGestureGuide, gestures, cameraReady, detectedPose } = useTheaterStore();
  const [selectedPose, setSelectedPose] = useState<string | null>(null);

  const gesture = gestures[0];
  const hasHand = gesture && gesture.type !== 'none';
  const poseName = detectedPose ? (POSE_NAMES[detectedPose] || detectedPose) : null;

  return (
    <AnimatePresence>
      {showGestureGuide && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-4 left-4 z-10"
        >
          <div className="panel-traditional rounded-xl px-5 py-4 max-w-[340px]">

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${cameraReady ? 'bg-jade animate-pulse' : 'bg-vermilion'}`} />
              <span className="text-base text-gold font-song">手影戏台</span>
            </div>

            {!cameraReady && (
              <p className="text-sm text-vermilion font-song mb-2">摄像头未就绪，请检查权限</p>
            )}

            {/* Detection status */}
            {cameraReady && (
              <div className="flex flex-wrap gap-2 mb-3">
                <Chip ok={hasHand} label={hasHand ? '手掌已检测' : '寻找手掌'} />
                {poseName && <Chip ok label={`当前姿势：${poseName}`} />}
              </div>
            )}

            {/* Pose guide with finger diagrams */}
            <div className="pt-3 border-t border-[hsl(var(--gold)/0.15)]">
              <p className="text-xs text-muted-foreground font-song mb-2">点击姿势查看手指位置</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-song mb-3">
                {Object.entries(POSE_NAMES).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPose(selectedPose === key ? null : key)}
                    className={`text-left flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors ${
                      detectedPose === key
                        ? 'text-gold bg-gold/10'
                        : selectedPose === key
                          ? 'text-gold/80 bg-gold/5'
                          : 'text-muted-foreground hover:text-parchment/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      detectedPose === key ? 'bg-gold shadow-[0_0_6px_hsl(var(--gold))]' : 'bg-muted-foreground/30'
                    }`} />
                    {name}
                  </button>
                ))}
              </div>

              {/* Selected pose detail with finger diagram */}
              {selectedPose && POSE_FINGERS[selectedPose] && (
                <div className="bg-[hsl(25_35%_10%/0.6)] rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-3">
                    <FingerDiagram fingers={POSE_FINGERS[selectedPose].fingers} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gold font-song mb-1">
                        {POSE_NAMES[selectedPose]}
                      </p>
                      <p className="text-xs text-muted-foreground font-song leading-relaxed">
                        {POSE_FINGERS[selectedPose].instruction}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current detected pose highlight */}
              {detectedPose && POSE_FINGERS[detectedPose] && !selectedPose && (
                <div className="bg-[hsl(var(--gold)/0.08)] rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FingerDiagram fingers={POSE_FINGERS[detectedPose].fingers} highlight />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gold font-song mb-1">
                        {POSE_NAMES[detectedPose]} ✓
                      </p>
                      <p className="text-xs text-muted-foreground font-song leading-relaxed">
                        {POSE_FINGERS[detectedPose].instruction}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Waiting for hand */}
            {cameraReady && !hasHand && (
              <div className="text-sm text-muted-foreground font-song mt-3">
                <p>将手掌对准摄像头</p>
                <p className="mt-1 text-xs opacity-60">张开五指，掌心朝向镜头</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple 5-finger hand diagram SVG
function FingerDiagram({ fingers, highlight }: { fingers: boolean[]; highlight?: boolean }) {
  const w = 56, h = 64;
  const activeColor = highlight ? '#FFD700' : '#C9A84C';
  const dimColor = '#4A4030';

  // Finger lines: x1,y1 (base) → x2,y2 (tip)
  const fingerLines = [
    { x1: 40, y1: 20, x2: 46, y2: 4 },  // thumb
    { x1: 28, y1: 20, x2: 24, y2: 3 },  // index
    { x1: 20, y1: 20, x2: 16, y2: 2 },  // middle
    { x1: 12, y1: 20, x2: 8, y2: 5 },   // ring
    { x1: 5, y1: 22, x2: 1, y2: 10 },   // pinky
  ];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      {/* Palm */}
      <rect x="2" y="18" width="40" height="28" rx="10"
        stroke={activeColor} strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Wrist */}
      <line x1="14" y1="44" x2="14" y2="58" stroke={activeColor} strokeWidth="1.5" opacity="0.4" />
      <line x1="30" y1="44" x2="30" y2="58" stroke={activeColor} strokeWidth="1.5" opacity="0.4" />

      {/* Fingers */}
      {fingerLines.map((f, i) => {
        const active = fingers[i];
        return (
          <g key={i}>
            <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2}
              stroke={active ? activeColor : dimColor}
              strokeWidth={active ? "2.5" : "1.8"}
              strokeLinecap="round"
              opacity={active ? 1 : 0.4}
            />
            <circle cx={f.x2} cy={f.y2} r={active ? 2.5 : 1.5}
              fill={active ? activeColor : dimColor}
              opacity={active ? 1 : 0.35}
            />
            {/* Finger label */}
            <text x={f.x2} y={f.y2 + (active ? -6 : -4)}
              fill={active ? activeColor : dimColor}
              fontSize="7" textAnchor="middle"
              opacity={active ? 0.9 : 0.4}
            >
              {FINGER_NAMES[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`text-xs px-2 py-0.5 rounded-full font-song transition-colors ${
      ok ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-muted/20 text-muted-foreground border border-muted/20'
    }`}>
      {ok ? '✓ ' : '○ '}{label}
    </div>
  );
}
