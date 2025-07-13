
import React, { useState, useEffect } from 'react';

interface DiceProps {
  words: string[];
  currentIndex: number;
  onRotate: (direction: 'forward' | 'backward') => void;
  variant?: 'default' | 'title';
}

const Dice: React.FC<DiceProps> = ({ words, currentIndex, onRotate, variant = 'default' }) => {
  const [isRotating, setIsRotating] = useState(false);
  const [showText, setShowText] = useState(true);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(100);
  const cubeRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cubeRef.current) {
      setSize(cubeRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    setShowText(true);
  }, [currentIndex]);

  const handleClick = (e: React.MouseEvent, direction: 'forward' | 'backward') => {
    e.preventDefault();

    if (isRotating || words.length <= 1) return;

    setShowText(false);
    setIsRotating(true);

    setRotation(prev => ({
      ...prev,
      x: prev.x + (direction === 'forward' ? -90 : 90),
    }));

    setTimeout(() => {
      onRotate(direction);
      setIsRotating(false);
      setShowText(true);
    }, 1000);
  };

  const handleLeftClick = (e: React.MouseEvent) => handleClick(e, 'forward');
  const handleRightClick = (e: React.MouseEvent) => handleClick(e, 'backward');

  const currentWord = words[currentIndex] || '';

  const getTextTransform = (faceTransform: string) => {
    const normalizedRotationX = ((rotation.x % 360) + 360) % 360;
    
    if (faceTransform === 'rotateY(180deg)') {
      return (normalizedRotationX === 180 || normalizedRotationX === 270) ? 'rotateZ(180deg)' : undefined;
    }
    
    return undefined;
  };

  const Face: React.FC<{ transform: string; word: string; isVisible: boolean }> = ({ transform, word, isVisible }) => (
    <div
      className={`absolute w-full h-full rounded-lg flex items-center justify-center p-2 text-center
        ${variant === 'title'
          ? 'bg-amber-100/80 border-2 border-amber-300/50 text-amber-800 text-sm md:text-base'
          : 'bg-white/80 border-2 border-blue-200/50 text-slate-700 text-xs md:text-sm'}
        backdrop-blur-sm`}
      style={{ transform: `${transform} translateZ(${size / 2}px)` }}
    >
      <span 
        className={`font-medium leading-tight transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: getTextTransform(transform) }}
      >
        {word}
      </span>
    </div>
  );

  return (
    <div
      ref={cubeRef}
      onClick={handleLeftClick}
      onContextMenu={handleRightClick}
      className="w-full h-full cursor-pointer group"
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative w-full h-full transition-transform duration-1000 ease-in-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        <Face transform="rotateY(0deg)" word={currentWord} isVisible={showText} />
        <Face transform="rotateX(90deg)" word={currentWord} isVisible={showText} />
        <Face transform="rotateX(-90deg)" word={currentWord} isVisible={showText} />
        <Face transform="rotateY(180deg)" word={currentWord} isVisible={showText} />
      </div>
      {words.length > 1 && (
        <div className="absolute -top-1 -right-1">
          <div className={`w-3 h-3 rounded-full animate-pulse shadow-sm ${variant === 'title' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
        </div>
      )}
    </div>
  );
};

export default Dice;
