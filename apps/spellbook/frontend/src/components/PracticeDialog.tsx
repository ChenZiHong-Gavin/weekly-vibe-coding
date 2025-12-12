import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spell } from '@/data/spells';
import { useBackendVoiceRecognition } from '@/hooks/useBackendVoiceRecognition';
import { Mic, Square, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PracticeDialogProps {
  spell: Spell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PracticeDialog({ 
  spell, 
  open, 
  onOpenChange,
  onSuccess 
}: PracticeDialogProps) {
  const {
    isListening,
    isProcessing,
    isPrepared,
    isPreparing,
    error,
    prepare,
    startListening,
    stopListening,
    result,
    waveform,
    reset,
  } = useBackendVoiceRecognition(spell?.latinName || '');

  // Reset when dialog opens/closes or spell changes
  useEffect(() => {
    if (open) {
      prepare();
    } else {
      reset();
    }
  }, [open, spell, prepare, reset]);

  // Handle success callback
  useEffect(() => {
    if (result?.success && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500); // Delay closing to show success state
      return () => clearTimeout(timer);
    }
  }, [result, onSuccess, onOpenChange]);

  if (!spell) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-heading text-primary">
            <Wand2 className="w-6 h-6" />
            咒语练习
          </DialogTitle>
          <DialogDescription className="text-lg text-foreground/80">
            {spell.chineseName} ({spell.latinName})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              请挥舞魔杖，大声念出咒语
            </p>
            <p className="text-xl font-bold font-serif text-primary">
              "{spell.latinName}"
            </p>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="listening"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative"
                >
                  <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full opacity-20"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-20 h-20 rounded-full relative z-10"
                    onClick={stopListening}
                  >
                    <Square className="w-8 h-8 fill-current" />
                  </Button>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="lg"
                    className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90"
                    onClick={startListening}
                    disabled={isPreparing}
                  >
                    <Mic className="w-8 h-8" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-md h-20 rounded-lg border border-primary/20 bg-muted/30 overflow-hidden">
            <svg viewBox="0 0 400 80" width="100%" height="100%">
              <polyline
                points={waveform && waveform.length ? waveform.map((v, i) => {
                  const x = (i / waveform.length) * 400;
                  const y = 40 - v * 35;
                  return `${x},${y}`;
                }).join(' ') : ''}
                fill="none"
                stroke={isListening ? 'hsl(45, 80%, 55%)' : 'hsl(215, 16%, 47%)'}
                strokeWidth={2}
              />
            </svg>
          </div>

          <div className="h-24 w-full flex flex-col items-center justify-center text-center">
            {isListening && (
              <p className="text-sm animate-pulse text-red-500">正在录音...</p>
            )}
            {isProcessing && (
              <p className="text-sm text-muted-foreground">正在分析魔力...</p>
            )}
            {!isListening && isPreparing && (
              <p className="text-sm text-muted-foreground">魔力检测准备中...</p>
            )}
            {error && (
              <p className="text-sm text-destructive font-medium">
                出错啦: {error}
              </p>
            )}
            {result && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <div className={`text-lg font-bold ${result.success ? 'text-green-500' : 'text-orange-500'}`}>
                  {result.success ? '✨ 施法成功！' : '💨 施法失败'}
                </div>
                {result.score !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    契合度: <span className="font-mono">{result.score}%</span>
                  </p>
                )}
                {result.user_phonemes && (
                  <p className="text-xs text-muted-foreground/50 font-mono mt-2">
                    识别音素: {result.user_phonemes}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
