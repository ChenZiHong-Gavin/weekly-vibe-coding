import React, { useState, useCallback } from 'react';
import Grid from '../components/Grid';
import TitleGrid from '../components/TitleGrid';
import { toast } from 'sonner';
import { generateWordsForCellsWithProgress } from '../services/llmService';

export type Phase = 'setup' | 'generate' | 'create';

export interface CellData {
  id: string;
  wordCount: number;
  words: string[];
  currentWordIndex: number;
}

const Index = () => {
  const [phase, setPhase] = useState<Phase>('setup');
  const [title, setTitle] = useState<string>('');
  const [gridData, setGridData] = useState<CellData[]>(() => 
    Array.from({ length: 25 }, (_, index) => ({
      id: `cell-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    }))
  );

  const [titleData, setTitleData] = useState<CellData[]>(() => 
    Array.from({ length: 1 }, (_, index) => ({
      id: `title-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    }))
  );

  const updateCellWordCount = useCallback((cellId: string, wordCount: number) => {
    setGridData(prev => 
      prev.map(cell => 
        cell.id === cellId ? { ...cell, wordCount } : cell
      )
    );
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const generateWords = useCallback(async () => {
    if (!title.trim()) {
      toast.error('请先输入标题！');
      return;
    }
    
    const cellsWithWords = gridData.filter(cell => cell.wordCount > 0);
    
    if (cellsWithWords.length === 0) {
      toast.error('请至少为一个格子设置字数！');
      return;
    }

    // 准备需要生成词汇的格子请求
    const cellRequests = cellsWithWords.map(cell => ({
      cellId: cell.id,
      wordCount: cell.wordCount
    }));
    
    // 添加标题词汇请求（只包含需要生成词汇的标题格子）
    const titleRequests = titleData
      .filter(cell => cell.wordCount > 0)
      .map(cell => ({
        cellId: cell.id,
        wordCount: cell.wordCount
      }));
    
    const allRequests = [...cellRequests, ...titleRequests];
    
    // 调试信息
    console.log('调试信息:');
    console.log('网格格子数量:', cellRequests.length);
    console.log('标题格子数量:', titleRequests.length);
    console.log('总请求数量:', allRequests.length);
    console.log('cellRequests:', cellRequests);
    console.log('titleRequests:', titleRequests);

    setIsGenerating(true);
    setPhase('generate');
    setGenerationProgress({ current: 0, total: allRequests.length });
    toast.success('正在使用AI顺序生成连贯的诗歌词汇...');
    
    try {
      
      // 使用LLM API顺序生成词汇，并更新进度
      const wordsResults = await generateWordsForCellsWithProgress(
        title.trim(), 
        allRequests,
        (current, total) => {
          setGenerationProgress({ current, total });
        }
      );
      
      // 更新网格数据
      const newGridData = gridData.map(cell => {
        if (cell.wordCount > 0 && wordsResults[cell.id]) {
          return {
            ...cell,
            words: wordsResults[cell.id],
            currentWordIndex: 0,
          };
        }
        return cell;
      });

      // 更新标题数据
      const newTitleData = titleData.map(cell => {
        if (wordsResults[cell.id]) {
          return {
            ...cell,
            words: wordsResults[cell.id],
            currentWordIndex: 0,
          };
        }
        return cell;
      });

      setGridData(newGridData);
      setTitleData(newTitleData);
      setPhase('create');
      toast.success('AI连贯词汇生成完成！开始创作你的诗歌吧！');
    } catch (error) {
      console.error('词汇生成失败:', error);
      toast.error('词汇生成失败，请重试');
      setPhase('setup');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  }, [gridData, titleData, title]);

  const rotateDice = useCallback((cellId: string, direction: 'forward' | 'backward' = 'forward') => {
    const updater = (prevData: CellData[]) =>
      prevData.map(cell => {
        if (cell.id === cellId && cell.words.length > 0) {
          const newIndex = direction === 'forward'
            ? (cell.currentWordIndex + 1) % cell.words.length
            : (cell.currentWordIndex - 1 + cell.words.length) % cell.words.length;
          return {
            ...cell,
            currentWordIndex: newIndex,
          };
        }
        return cell;
      });

    if (cellId.startsWith('title-')) {
      setTitleData(updater);
    } else {
      setGridData(updater);
    }
  }, []);

  const resetGrid = useCallback(() => {
    setTitle('');
    setGridData(Array.from({ length: 25 }, (_, index) => ({
      id: `cell-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    })));
    setTitleData(Array.from({ length: 1 }, (_, index) => ({
      id: `title-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    })));
    setPhase('setup');
  }, []);

  const exportPoem = useCallback(() => {
    const gridRows = [];
    for (let i = 0; i < 25; i += 5) {
      const row = gridData
        .slice(i, i + 5)
        .filter(cell => cell.words.length > 0)
        .map(cell => cell.words[cell.currentWordIndex])
        .join(' ');
      if (row.trim()) {
        gridRows.push(row);
      }
    }
    
    const content = gridRows.join('\n');
    const poem = title.trim() ? `${title.trim()}\n\n${content}` : content;
    
    if (poem.trim()) {
      navigator.clipboard.writeText(poem);
      toast.success('诗歌已复制到剪贴板！');
    } else {
      toast.error('暂无可导出的诗歌内容');
    }
  }, [gridData, title]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-slate-800 mb-2 sm:mb-4 tracking-wide">
            诗韵方格
          </h1>
          <div className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto mb-3 sm:mb-4 md:mb-6 rounded-full"></div>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg font-light max-w-md mx-auto leading-relaxed px-4">
            在方格中用骰子写诗
          </p>
        </header>

        <div className="flex flex-col items-center gap-3 sm:gap-4">
          {/* 阶段指示器和操作提示 */}
            <div className="bg-white/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 md:px-8 py-4 sm:py-6 shadow-lg border border-white/30 max-w-6xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-2">
                 {/* 阶段指示器 */}
                 <div className="flex items-center gap-2 sm:gap-4">
                   <div className="flex items-center gap-2 sm:gap-3">
                     {(['setup', 'generate', 'create'] as Phase[]).map((p, index) => {
                       const isActive = phase === p;
                       const isCompleted = (['setup', 'generate', 'create'] as Phase[]).indexOf(phase) > index;
                       
                       return (
                         <div key={p} className="flex items-center gap-1 sm:gap-2">
                           <div className={`
                             w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 flex items-center justify-center
                             ${isActive 
                               ? 'bg-blue-500 scale-125 shadow-lg' 
                               : isCompleted
                                 ? 'bg-green-400 scale-110'
                                 : 'bg-gray-300 scale-100'
                             }
                           `}>
                             <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                           </div>
                           {index < 2 && (
                             <div className={`
                               w-6 sm:w-8 h-0.5 transition-colors duration-500
                               ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}
                             `} />
                           )}
                         </div>
                       );
                     })}
                   </div>
                   <div className="text-sm sm:text-base md:text-lg font-bold text-slate-800">
                     {phase === 'setup' && '设置阶段'}
                     {phase === 'generate' && '生成阶段'}
                     {phase === 'create' && '创作阶段'}
                   </div>
                 </div>
                 
                 {/* 分隔线 */}
                 <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:hidden"></div>
                 <div className="hidden md:block w-px h-6 bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-2"></div>
                 
                 {/* 操作提示 */}
                 <div className="text-center md:text-right">
                   <p className="text-slate-600 text-xs sm:text-sm leading-relaxed px-2">
                     {phase === 'setup' && '请先输入标题，然后设置每个格子中的字数，最后点击生成词汇'}
                     {phase === 'generate' && (
                       <span className="flex items-center justify-center md:justify-end gap-2">
                         正在AI顺序生成连贯词汇... 
                         <span className="text-blue-600 font-medium">
                           {generationProgress.current}/{generationProgress.total}
                         </span>
                         {generationProgress.total > 0 && (
                           <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-blue-500 transition-all duration-300 ease-out"
                               style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                             />
                           </div>
                         )}
                       </span>
                     )}
                     {phase === 'create' && '左键前进，右键后退，旋转骰子创作你的诗歌'}
                   </p>
                 </div>
               </div>
            </div>
          
          {/* 第二行：操作按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full px-4">
            {phase === 'setup' && (
              <button
                onClick={generateWords}
                disabled={isGenerating}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isGenerating ? (
                   <>
                     <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     AI生成中... ({generationProgress.current}/{generationProgress.total})
                   </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                    </svg>
                    生成AI词汇骰子
                  </>
                )}
              </button>
            )}

            {phase === 'create' && (
              <button
                onClick={exportPoem}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出诗歌
              </button>
            )}

            <button
              onClick={resetGrid}
              className="w-full sm:w-auto border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-md hover:shadow-lg transition-all duration-300 px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新开始
            </button>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <TitleGrid
            data={titleData}
            phase={phase}
            onRotateDice={rotateDice}
            title={title}
            onTitleChange={setTitle}
          />

          <Grid
            data={gridData}
            phase={phase}
            onUpdateWordCount={updateCellWordCount}
            onRotateDice={rotateDice}
          />
        </div>


      </div>
    </div>
  );
};



export default Index;
