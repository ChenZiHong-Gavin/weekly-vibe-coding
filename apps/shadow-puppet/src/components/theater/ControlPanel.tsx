import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';
import { Eye, EyeOff, Music, Volume2, VolumeX, Circle, Square, HelpCircle } from 'lucide-react';

interface ControlPanelProps {
  soundManager: SoundManager | null;
}

export default function ControlPanel({ soundManager }: ControlPanelProps) {
  const {
    isShadowMode,
    toggleShadowMode,
    bgmEnabled,
    toggleBGM,
    sfxEnabled,
    toggleSFX,
    isRecording,
    startRecording,
    stopRecording,
    showGestureGuide,
    setShowGestureGuide,
    cameraReady,
    mode,
    setMode,
  } = useTheaterStore();

  const handleBGMToggle = () => {
    const willEnable = !bgmEnabled;
    toggleBGM();
    if (soundManager) {
      if (willEnable) soundManager.startBGM();
      else soundManager.stopBGM();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="theater-title text-lg">控制</h3>

      <div className="space-y-2">
        <button
          onClick={toggleShadowMode}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)] transition-all"
        >
          {isShadowMode ? <Eye className="w-4 h-4 text-gold" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-song flex-1 text-left">
            {isShadowMode ? '皮影模式' : '彩色模式'}
          </span>
        </button>

        <button
          onClick={handleBGMToggle}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)] transition-all"
        >
          {bgmEnabled ? <Music className="w-4 h-4 text-gold" /> : <Music className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-song flex-1 text-left">
            {bgmEnabled ? '背景音乐 开' : '背景音乐 关'}
          </span>
        </button>

        <button
          onClick={toggleSFX}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)] transition-all"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4 text-gold" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-song flex-1 text-left">
            {sfxEnabled ? '音效 开' : '音效 关'}
          </span>
        </button>

        <button
          onClick={() => setShowGestureGuide(!showGestureGuide)}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)] transition-all"
        >
          <HelpCircle className={`w-4 h-4 ${showGestureGuide ? 'text-gold' : 'text-muted-foreground'}`} />
          <span className="text-sm font-song flex-1 text-left">
            手势提示
          </span>
        </button>

        {(mode === 'free') && (
          <button
            onClick={() => isRecording ? stopRecording() : startRecording()}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
              isRecording
                ? 'border-[hsl(var(--vermilion))] bg-[hsl(var(--vermilion)/0.15)]'
                : 'border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)]'
            }`}
          >
            {isRecording ? (
              <Square className="w-4 h-4 text-vermilion" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-song flex-1 text-left">
              {isRecording ? '停止录制' : '录制表演'}
            </span>
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-vermilion animate-pulse" />
            )}
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-[hsl(25_25%_18%)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-jade' : 'bg-vermilion'}`} />
          <span>{cameraReady ? '摄像头就绪' : '摄像头未就绪'}</span>
        </div>
      </div>
    </div>
  );
}
