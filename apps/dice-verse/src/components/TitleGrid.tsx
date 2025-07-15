
import React from 'react';
import type { CellData, Phase } from '../pages/Index';

interface TitleGridProps {
  data: CellData[];
  phase: Phase;
  onRotateDice: (cellId: string, direction?: 'forward' | 'backward') => void;
  title: string;
  onTitleChange: (title: string) => void;
}

const TitleGrid: React.FC<TitleGridProps> = ({ data, phase, onRotateDice, title, onTitleChange }) => {
  return (
    <div className="flex justify-center mb-8">
      {phase === 'setup' && (
        <div className="w-[400px]">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="在此输入标题..."
            className="w-full px-4 py-3 text-center text-xl font-medium text-slate-700 bg-transparent border-0 focus:outline-none placeholder-slate-400 transition-all duration-200"
            maxLength={20}
          />
        </div>
      )}
      
      {phase === 'generate' && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
                正在生成词汇...
              </span>
            </div>
          </div>
        </div>
      )}
      
      {phase === 'create' && (
        <div className="text-center">
          <div className="text-xl md:text-2xl font-bold text-slate-800 px-4 py-2">
            {title || '无题'}
          </div>
        </div>
      )}
    </div>
  );
};

export default TitleGrid;
