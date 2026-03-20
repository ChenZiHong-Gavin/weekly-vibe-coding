// ============================
// ScorePopup — 浮动得分动画
// ============================

import React, { useEffect, useState } from 'react';

interface PopupItem {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

let popupId = 0;

export const ScorePopup: React.FC = () => {
  const [popups, setPopups] = useState<PopupItem[]>([]);

  // 暴露全局方法
  useEffect(() => {
    (window as any).__scorePopup = (text: string, color: string = 'text-terminal-green') => {
      const id = ++popupId;
      // 在屏幕中心偏随机位置显示
      const x = 50 + (Math.random() - 0.5) * 20;
      const y = 40 + (Math.random() - 0.5) * 10;
      setPopups(prev => [...prev, { id, text, color, x, y }]);
      setTimeout(() => {
        setPopups(prev => prev.filter(p => p.id !== id));
      }, 600);
    };
    return () => { delete (window as any).__scorePopup; };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {popups.map(p => (
        <div
          key={p.id}
          className={`absolute animate-score-pop font-mono font-bold text-2xl ${p.color}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
};

/** 全局调用方法 */
export function showScorePopup(text: string, color?: string) {
  (window as any).__scorePopup?.(text, color);
}
