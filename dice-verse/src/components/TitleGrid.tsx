
import React from 'react';
import Dice from './Dice';
import type { CellData, Phase } from '../pages/Index';

interface TitleGridProps {
  data: CellData[];
  phase: Phase;
  onRotateDice: (cellId: string, direction?: 'forward' | 'backward') => void;
}

const TitleGrid: React.FC<TitleGridProps> = ({ data, phase, onRotateDice }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
        <div className="w-20 h-20 md:w-24 md:h-24">
          {data.map((cell) => (
            <div key={cell.id} className="w-full h-full">
              {phase === 'setup' && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 rounded-lg border border-amber-300 shadow-sm">
                  <div className="text-amber-600/50 text-sm font-light">标题</div>
                </div>
              )}

              {phase === 'generate' && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg border border-amber-400 shadow-md animate-pulse">
                  <div className="w-4 h-4 bg-amber-600 rounded-full animate-bounce"></div>
                </div>
              )}

              {phase === 'create' && (
                <Dice
                  words={cell.words}
                  currentIndex={cell.currentWordIndex}
                  onRotate={(direction) => onRotateDice(cell.id, direction)}
                  variant="title"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TitleGrid;
