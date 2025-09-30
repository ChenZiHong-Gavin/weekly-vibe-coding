import React, { useState, useCallback } from 'react';
import { DanmakuText } from './DanmakuText';

export interface DanmakuItem {
  id: string;
  text: string;
  pattern: 'firework' | 'flower' | 'heart' | 'spiral' | 'wave' | 'star';
  timestamp: number;
}

interface DanmakuCanvasProps {
  danmakuList: DanmakuItem[];
  onDanmakuComplete: (id: string) => void;
}

export const DanmakuCanvas: React.FC<DanmakuCanvasProps> = ({ 
  danmakuList, 
  onDanmakuComplete 
}) => {
  return (
    <div className="danmaku-container">
      {danmakuList.map((danmaku) => (
        <DanmakuText
          key={danmaku.id}
          text={danmaku.text}
          pattern={danmaku.pattern}
          onComplete={() => onDanmakuComplete(danmaku.id)}
        />
      ))}
    </div>
  );
};