import React from 'react';
import GridCell from './GridCell';
import type { CellData, Phase } from '../pages/Index';

interface GridProps {
  data: CellData[];
  phase: Phase;
  onUpdateWordCount: (cellId: string, wordCount: number) => void;
  onRotateDice: (cellId: string, direction?: 'forward' | 'backward') => void;
}

const Grid: React.FC<GridProps> = ({ data, phase, onUpdateWordCount, onRotateDice }) => {
  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-5 gap-3 md:gap-4 bg-white/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        {data.map((cell, index) => (
          <GridCell
            key={cell.id}
            data={cell}
            phase={phase}
            index={index}
            onUpdateWordCount={onUpdateWordCount}
            onRotateDice={onRotateDice}
          />
        ))}
      </div>
    </div>
  );
};

export default Grid;
