import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw, Download, Circle } from 'lucide-react';
import type { Phase } from '../pages/Index';

interface ControlPanelProps {
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onGenerateWords: () => void;
  onReset: () => void;
  onExport: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  phase,
  onPhaseChange,
  onGenerateWords,
  onReset,
  onExport,
}) => {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* 阶段指示器 */}
      <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/30">
        <div className="flex items-center gap-3">
          {(['setup', 'generate', 'create'] as Phase[]).map((p, index) => {
            const isActive = phase === p;
            const isCompleted = (['setup', 'generate', 'create'] as Phase[]).indexOf(phase) > index;
            
            return (
              <div key={p} className="flex items-center gap-2">
                <div className={`
                  w-4 h-4 rounded-full transition-all duration-500 flex items-center justify-center
                  ${isActive 
                    ? 'bg-blue-500 scale-125 shadow-lg' 
                    : isCompleted
                      ? 'bg-green-400 scale-110'
                      : 'bg-gray-300 scale-100'
                  }
                `}>
                  <Circle className="w-2 h-2 text-white fill-current" />
                </div>
                {index < 2 && (
                  <div className={`
                    w-8 h-0.5 transition-colors duration-500
                    ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
        <div className="ml-4 text-sm font-medium text-slate-700">
          {phase === 'setup' && '设置阶段'}
          {phase === 'generate' && '生成阶段'}
          {phase === 'create' && '创作阶段'}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        {phase === 'setup' && (
          <Button
            onClick={onGenerateWords}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 rounded-2xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            生成词汇骰子
          </Button>
        )}

        {phase === 'create' && (
          <Button
            onClick={onExport}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 rounded-2xl"
          >
            <Download className="w-5 h-5 mr-2" />
            导出诗歌
          </Button>
        )}

        <Button
          onClick={onReset}
          variant="outline"
          className="border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-md hover:shadow-lg transition-all duration-300 px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          重新开始
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;
