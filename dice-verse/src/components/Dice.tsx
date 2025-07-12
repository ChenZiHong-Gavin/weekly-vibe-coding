
import React, { useState } from 'react';

interface DiceProps {
  words: string[];
  currentIndex: number;
  onRotate: (direction: 'forward' | 'backward') => void;
  variant?: 'default' | 'title';
}

const Dice: React.FC<DiceProps> = ({ words, currentIndex, onRotate, variant = 'default' }) => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotateDirection, setRotateDirection] = useState<'forward' | 'backward'>('forward');

  const handleClick = (e: React.MouseEvent, direction: 'forward' | 'backward') => {
    e.preventDefault();
    if (isRotating || words.length <= 1) return;
    
    setIsRotating(true);
    setRotateDirection(direction);
    onRotate(direction);
    
    setTimeout(() => {
      setIsRotating(false);
    }, 600);
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    handleClick(e, 'forward');
  };

  const handleRightClick = (e: React.MouseEvent) => {
    handleClick(e, 'backward');
  };

  const currentWord = words[currentIndex] || '';

  const baseClasses = variant === 'title' 
    ? 'w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-amber-300' 
    : 'w-full h-full bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200';

  return (
    <div
      onClick={handleLeftClick}
      onContextMenu={handleRightClick}
      className={`
        ${baseClasses}
        rounded-xl shadow-lg cursor-pointer relative overflow-hidden
        transition-all duration-600 ease-in-out
        hover:shadow-xl hover:scale-105
        ${isRotating 
          ? `transform ${rotateDirection === 'forward' ? 'rotateY(180deg)' : 'rotateY(-180deg)'} scale-110` 
          : ''
        }
      `}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* 骰子表面纹理 */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-transparent via-white to-transparent"></div>
        <div className="absolute top-1 left-1 w-2 h-2 bg-white/30 rounded-full"></div>
        <div className="absolute bottom-1 right-1 w-1 h-1 bg-black/10 rounded-full"></div>
      </div>

      {/* 文字内容 */}
      <div className={`
        w-full h-full flex items-center justify-center p-2
        transition-all duration-300
        ${isRotating ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
      `}>
        <span className={`
          font-medium text-center leading-tight
          ${variant === 'title' 
            ? 'text-amber-800 text-sm md:text-base' 
            : 'text-slate-700 text-xs md:text-sm'
          }
        `}>
          {currentWord}
        </span>
      </div>
      
      {/* 可旋转指示器 */}
      {words.length > 1 && (
        <div className="absolute -top-1 -right-1">
          <div className={`
            w-3 h-3 rounded-full animate-pulse shadow-sm
            ${variant === 'title' ? 'bg-amber-500' : 'bg-blue-500'}
          `}></div>
        </div>
      )}
    </div>
  );
};

export default Dice;
