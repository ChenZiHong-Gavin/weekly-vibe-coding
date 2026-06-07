import { motion, AnimatePresence } from 'framer-motion';
import { useTheaterStore } from '@/store/theaterStore';
import { useMemo } from 'react';
import {
  OpenHandLabeled,
  PinchHand,
  FistHand,
  WaveHand,
} from './HandGestureIcons';

export default function GestureGuide() {
  const { showGestureGuide, gestures, puppetStates, activePuppetIndex, cameraReady } = useTheaterStore();

  const activePuppet = puppetStates[activePuppetIndex];
  const isDragon = activePuppet?.puppetId === 'dragon';

  const detection = useMemo(() => {
    if (!cameraReady || gestures.length === 0) return null;
    const g = gestures[0];
    return {
      hasHand: g && g.type !== 'none',
      fingertips: g?.fingerTips?.length || 0,
      gestureType: g?.type || 'none',
    };
  }, [gestures, cameraReady]);

  const getPuppetName = (id: string) => {
    const map: Record<string, string> = { warrior: '武生', maiden: '花旦', monkey: '孙悟空', dragon: '神龙', scholar: '老生' };
    return map[id] || id;
  };

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

            {/* ── Header ── */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${cameraReady ? 'bg-jade animate-pulse' : 'bg-vermilion'}`} />
              <span className="text-base text-gold font-song">手势操控</span>
              {activePuppet && (
                <span className="text-sm text-muted-foreground font-song">
                  {getPuppetName(activePuppet.puppetId)}
                </span>
              )}
            </div>

            {!cameraReady && (
              <p className="text-sm text-vermilion font-song mb-2">摄像头未就绪，请检查权限</p>
            )}

            {/* ── Detection status ── */}
            {detection && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Chip ok={detection.hasHand} label={detection.hasHand ? '手掌已检测' : '寻找手掌'} />
                <Chip ok={detection.fingertips >= 5} label={detection.fingertips >= 5 ? '五指已识别' : '手指追踪中'} />
              </div>
            )}

            {/* ── Main hand illustration with labels ── */}
            {detection?.hasHand && (
              <>
                {/* Large labeled hand */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <OpenHandLabeled size={90} className="text-gold" />
                  </div>

                  {/* Legend — controls mapping */}
                  <div className="flex flex-col gap-1.5 text-sm font-song">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/50" />
                      <span className="text-muted-foreground">移动手掌</span>
                      <span className="text-gold">身体惯性移动</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#66B2FF' }} />
                      <span className="text-muted-foreground">转动手腕</span>
                      <span className="text-gold">{isDragon ? '龙头方向' : '头部转动 & 倾斜'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF6B4A' }} />
                      <span className="text-muted-foreground">弯拇指</span>
                      <span className="text-gold">{isDragon ? '龙腰摆动' : '左臂挥舞'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF88CC' }} />
                      <span className="text-muted-foreground">弯小指</span>
                      <span className="text-gold">{isDragon ? '龙尾摆动' : '右臂挥舞'}</span>
                    </div>
                  </div>
                </div>

                {/* ── Combo gestures ── */}
                <div className="pt-3 border-t border-[hsl(var(--gold)/0.15)]">
                  <p className="text-xs text-muted-foreground font-song mb-2">手势组合特效</p>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center gap-1">
                      <PinchHand size={40} className="text-gold" />
                      <span className="text-xs text-gold font-song">捏合</span>
                      <span className="text-xs text-muted-foreground font-song">金光特效</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <WaveHand size={40} className="text-gold" />
                      <span className="text-xs text-gold font-song">挥手</span>
                      <span className="text-xs text-muted-foreground font-song">花瓣特效</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <FistHand size={40} className="text-gold" />
                      <span className="text-xs text-gold font-song">握拳</span>
                      <span className="text-xs text-muted-foreground font-song">烟雾特效</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Waiting for hand ── */}
            {cameraReady && !detection?.hasHand && (
              <div className="text-sm text-muted-foreground font-song">
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

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`text-xs px-2 py-0.5 rounded-full font-song transition-colors ${
      ok ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-muted/20 text-muted-foreground border border-muted/20'
    }`}>
      {ok ? '✓ ' : '○ '}{label}
    </div>
  );
}
