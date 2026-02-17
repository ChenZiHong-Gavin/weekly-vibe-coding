import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { audioAnalyzer } from '@/core/AudioAnalyzer';
import { soundManager } from '@/core/SoundManager';
import { Music, Upload, Play, Drum } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Difficulty } from '@/types/game';

interface MenuScreenProps {
  onStartDemo: (difficulty: Difficulty) => void;
  onStartWithAudio: (difficulty: Difficulty) => void;
}

export function MenuScreen({ onStartDemo, onStartWithAudio }: MenuScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setAudioFile, setCurrentBeatMap, audioFile, leftHand, rightHand } = useGameStore();
  
  const isDon = !leftHand && rightHand;
  const isKat = leftHand && !rightHand;
  const isBoom = leftHand && rightHand;
  const isAir = !leftHand && !rightHand;

  // Sound effects for tutorial
  useEffect(() => {
    if (isDon) soundManager.playDon();
  }, [isDon]);

  useEffect(() => {
    if (isKat) soundManager.playKat();
  }, [isKat]);

  useEffect(() => {
    if (isBoom) soundManager.playBoom();
  }, [isBoom]);

  useEffect(() => {
    if (isAir) soundManager.playAir();
  }, [isAir]);
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setAudioFile(file);
    
    try {
      const buffer = await audioAnalyzer.loadAudio(file);
      const beatMap = audioAnalyzer.generateBeatMap(
        buffer,
        file.name.replace(/\.[^/.]+$/, ''),
        'Unknown Artist',
        selectedDifficulty
      );
      setCurrentBeatMap(beatMap);
    } catch (error) {
      console.error('Failed to load audio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setAudioFile, setCurrentBeatMap, selectedDifficulty]);
  
  const difficulties: { value: Difficulty; label: string; color: string }[] = [
    { value: 'easy', label: '简单', color: 'bg-green-500' },
    { value: 'normal', label: '普通', color: 'bg-secondary' },
    { value: 'hard', label: '困难', color: 'bg-primary' },
  ];
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Logo/Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Drum className="w-16 h-16 text-primary" />
          </motion.div>
          <h1 className="game-title text-6xl md:text-7xl text-foreground">
            手势<span className="text-primary">太鼓达人</span>
          </h1>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <Drum className="w-16 h-16 text-secondary" />
          </motion.div>
        </div>
        <p className="text-muted-foreground text-lg">
          通过控制双手的出现与消失来击响节拍 ✋
        </p>
      </motion.div>
      
      {/* Difficulty Selection */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="text-center text-muted-foreground text-sm uppercase tracking-wider mb-4">
          选择难度
        </div>
        <div className="flex gap-4">
          {difficulties.map((diff) => (
            <button
              key={diff.value}
              onClick={() => setSelectedDifficulty(diff.value)}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all
                ${selectedDifficulty === diff.value 
                  ? `${diff.color} text-white shadow-lg scale-105` 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
              `}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </motion.div>
      
      {/* Action Buttons */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Demo Play Button */}
        <Button
          onClick={() => onStartDemo(selectedDifficulty)}
          size="lg"
          className="gap-3 text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        >
          <Play className="w-6 h-6" />
          开始演示曲目
        </Button>
        
        {/* Upload Audio */}
        <div className="flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
            className="gap-3"
            disabled={isLoading}
          >
            <Upload className="w-5 h-5" />
            {isLoading ? '加载中...' : '上传自己的音乐'}
          </Button>
          
          {audioFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music className="w-4 h-4" />
              <span>{audioFile.name}</span>
              <Button
                onClick={() => onStartWithAudio(selectedDifficulty)}
                size="sm"
                variant="ghost"
                className="text-primary"
              >
                开始游戏
              </Button>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-center w-full max-w-2xl px-4"
      >
        <div className="text-muted-foreground text-sm mb-6">游戏玩法说明</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            className={`
              bg-card/50 rounded-xl p-4 border transition-all duration-200
              ${isDon ? 'border-red-500 bg-red-500/10 scale-105 shadow-lg shadow-red-500/20 ring-2 ring-red-500/50' : 'border-border'}
            `}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full drum-don flex items-center justify-center transition-transform ${isDon ? 'scale-110' : ''}`}>
              <span className="text-white font-bold">咚</span>
            </div>
            <div className={`font-medium mb-1 text-sm transition-colors ${isDon ? 'text-red-500 font-bold' : 'text-foreground'}`}>红鼓 (Don)</div>
            <div className="text-muted-foreground text-[10px] leading-tight">
              屏幕中只有右手
            </div>
          </div>
          <div 
            className={`
              bg-card/50 rounded-xl p-4 border transition-all duration-200
              ${isKat ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/50' : 'border-border'}
            `}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full drum-kat flex items-center justify-center transition-transform ${isKat ? 'scale-110' : ''}`}>
              <span className="text-white font-bold">咔</span>
            </div>
            <div className={`font-medium mb-1 text-sm transition-colors ${isKat ? 'text-blue-500 font-bold' : 'text-foreground'}`}>蓝鼓 (Kat)</div>
            <div className="text-muted-foreground text-[10px] leading-tight">
              屏幕中只有左手
            </div>
          </div>
          <div 
            className={`
              bg-card/50 rounded-xl p-4 border transition-all duration-200
              ${isBoom ? 'border-zinc-500 bg-zinc-500/10 scale-105 shadow-lg shadow-zinc-500/20 ring-2 ring-zinc-500/50' : 'border-border'}
            `}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full drum-boom flex items-center justify-center transition-transform ${isBoom ? 'scale-110' : ''}`}>
              <span className="text-white font-bold text-xs">BOOM</span>
            </div>
            <div className={`font-medium mb-1 text-sm transition-colors ${isBoom ? 'text-zinc-500 font-bold' : 'text-foreground'}`}>黑鼓 (Boom)</div>
            <div className="text-muted-foreground text-[10px] leading-tight">
              屏幕中有双手
            </div>
          </div>
          <div 
            className={`
              bg-card/50 rounded-xl p-4 border transition-all duration-200
              ${isAir ? 'border-zinc-300 bg-zinc-100/10 scale-105 shadow-lg shadow-zinc-300/20 ring-2 ring-zinc-300/50' : 'border-border'}
            `}
          >
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full drum-air flex items-center justify-center transition-transform ${isAir ? 'scale-110' : ''}`}>
              <span className="text-black font-bold text-xs">AIR</span>
            </div>
            <div className={`font-medium mb-1 text-sm transition-colors ${isAir ? 'text-zinc-300 font-bold' : 'text-foreground'}`}>白鼓 (Air)</div>
            <div className="text-muted-foreground text-[10px] leading-tight">
              屏幕中没有手
            </div>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          无需挥动，只要在音符到达判定圈时满足对应的手部状态即可得分！
        </p>
      </motion.div>
    </div>
  );
}