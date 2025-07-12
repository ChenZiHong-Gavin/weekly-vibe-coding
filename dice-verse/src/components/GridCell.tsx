
import React, { useState } from 'react';
import Dice from './Dice';
import { Plus, Minus } from 'lucide-react';
import type { CellData, Phase } from '../pages/Index';

interface GridCellProps {
  data: CellData;
  phase: Phase;
  index: number;
  onUpdateWordCount: (cellId: string, wordCount: number) => void;
  onRotateDice: (cellId: string, direction?: 'forward' | 'backward') => void;
}

// 随机特殊字符数组
const SPECIAL_CHARS = ['◯', '◇', '◆', '◈', '▢', '▣', '▤', '▥', '▦', '▧', '▨', '▩', '⬟', '⬢', '⬡', '⭘', '⭙', '⭚'];

const getRandomChar = () => SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)];

const GridCell: React.FC<GridCellProps> = ({
  data,
  phase,
  index,
  onUpdateWordCount,
  onRotateDice,
}) => {
  const isActive = data.wordCount > 0;

  const handleIncrease = () => {
    if (data.wordCount < 4) {
      onUpdateWordCount(data.id, data.wordCount + 1);
    }
  };

  const handleDecrease = () => {
    if (data.wordCount > 0) {
      onUpdateWordCount(data.id, data.wordCount - 1);
    }
  };

  const renderSpecialChars = () => {
    const chars = Array.from({ length: data.wordCount }).map((_, i) => getRandomChar());
    
    if (data.wordCount === 4) {
      return (
        <div className="grid grid-cols-2 gap-1 items-center justify-center">
          {chars.map((char, i) => (
            <span key={i} className="text-blue-600 text-lg font-bold text-center">{char}</span>
          ))}
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap gap-1 items-center justify-center">
          {chars.map((char, i) => (
            <span key={i} className="text-blue-600 text-lg font-bold">{char}</span>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="w-16 h-16 md:w-20 md:h-20">
      {phase === 'setup' && (
        <div className={`
          w-full h-full rounded-xl transition-all duration-300 ease-in-out group relative
          ${isActive 
            ? 'bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-blue-300 shadow-md' 
            : 'bg-white/60 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/80'
          }
        `}>
          {/* 显示随机特殊字符 */}
          <div className="w-full h-full flex items-center justify-center p-2">
            {isActive ? renderSpecialChars() : (
              <div className="text-gray-400 text-2xl">+</div>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrease}
                disabled={data.wordCount === 0}
                className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-white text-xs shadow-md transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[1rem] text-center">
                {data.wordCount}
              </span>
              <button
                onClick={handleIncrease}
                disabled={data.wordCount === 4}
                className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-white text-xs shadow-md transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'generate' && (
        <div className={`
          w-full h-full rounded-xl flex items-center justify-center
          ${isActive 
            ? 'bg-gradient-to-br from-blue-200 to-indigo-300 border-2 border-blue-400 animate-pulse' 
            : 'bg-gray-100 border-2 border-gray-300'
          }
        `}>
          {isActive && (
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
          )}
        </div>
      )}

      {phase === 'create' && isActive && (
        <Dice
          words={data.words}
          currentIndex={data.currentWordIndex}
          onRotate={(direction) => onRotateDice(data.id, direction)}
        />
      )}

      {phase === 'create' && !isActive && (
        <div className="w-full h-full rounded-xl bg-gray-100/50 border-2 border-gray-200 flex items-center justify-center opacity-40">
          <div className="w-3 h-3 border border-gray-300 rounded"></div>
        </div>
      )}
    </div>
  );
};

export default GridCell;
