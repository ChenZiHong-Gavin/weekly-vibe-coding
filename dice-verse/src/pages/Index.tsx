import React, { useState, useCallback } from 'react';
import Grid from '../components/Grid';
import TitleGrid from '../components/TitleGrid';
import ControlPanel from '../components/ControlPanel';
import { toast } from 'sonner';

export type Phase = 'setup' | 'generate' | 'create';

export interface CellData {
  id: string;
  wordCount: number;
  words: string[];
  currentWordIndex: number;
}

const Index = () => {
  const [phase, setPhase] = useState<Phase>('setup');
  const [gridData, setGridData] = useState<CellData[]>(() => 
    Array.from({ length: 25 }, (_, index) => ({
      id: `cell-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    }))
  );

  // 标题只需要一个格子
  const [titleData, setTitleData] = useState<CellData[]>(() => 
    Array.from({ length: 1 }, (_, index) => ({
      id: `title-${index}`,
      wordCount: Math.floor(Math.random() * 3) + 1, // 随机1-3字
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

  const generateWords = useCallback(async () => {
    const cellsWithWords = gridData.filter(cell => cell.wordCount > 0);
    
    if (cellsWithWords.length === 0) {
      toast.error('请至少为一个格子设置字数！');
      return;
    }

    toast.success('正在生成诗歌词汇...');
    
    // 生成主网格词汇
    const newGridData = gridData.map(cell => {
      if (cell.wordCount > 0) {
        const words = generateWordsForCell(cell.wordCount);
        return {
          ...cell,
          words,
          currentWordIndex: 0,
        };
      }
      return cell;
    });

    // 生成标题词汇
    const newTitleData = titleData.map(cell => {
      const words = generateWordsForCell(cell.wordCount);
      return {
        ...cell,
        words,
        currentWordIndex: 0,
      };
    });

    setGridData(newGridData);
    setTitleData(newTitleData);
    setPhase('create');
    toast.success('词汇生成完成！开始创作你的诗歌吧！');
  }, [gridData, titleData]);

  const rotateDice = useCallback((cellId: string, direction: 'forward' | 'backward' = 'forward') => {
    const updateData = (data: CellData[]) => 
      data.map(cell => {
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
      setTitleData(updateData);
    } else {
      setGridData(updateData);
    }
  }, []);

  const resetGrid = useCallback(() => {
    setGridData(Array.from({ length: 25 }, (_, index) => ({
      id: `cell-${index}`,
      wordCount: 0,
      words: [],
      currentWordIndex: 0,
    })));
    setTitleData(Array.from({ length: 1 }, (_, index) => ({
      id: `title-${index}`,
      wordCount: Math.floor(Math.random() * 3) + 1,
      words: [],
      currentWordIndex: 0,
    })));
    setPhase('setup');
  }, []);

  const exportPoem = useCallback(() => {
    const title = titleData
      .filter(cell => cell.words.length > 0)
      .map(cell => cell.words[cell.currentWordIndex])
      .join('');
    
    // 按行组织内容，每5个格子一行
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
    const poem = title ? `${title}\n\n${content}` : content;
    
    if (poem.trim()) {
      navigator.clipboard.writeText(poem);
      toast.success('诗歌已复制到剪贴板！');
    } else {
      toast.error('暂无可导出的诗歌内容');
    }
  }, [gridData, titleData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-light text-slate-800 mb-4 tracking-wide">
            诗韵方格
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-slate-600 text-lg font-light max-w-md mx-auto leading-relaxed">
            在优雅的方格中创作你的诗歌
          </p>
        </header>

        <ControlPanel
          phase={phase}
          onPhaseChange={setPhase}
          onGenerateWords={generateWords}
          onReset={resetGrid}
          onExport={exportPoem}
        />

        <div className="mt-12 space-y-8">
          <TitleGrid
            data={titleData}
            phase={phase}
            onRotateDice={rotateDice}
          />

          <Grid
            data={gridData}
            phase={phase}
            onUpdateWordCount={updateCellWordCount}
            onRotateDice={rotateDice}
          />
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-white/20">
            <p className="text-slate-600 text-sm font-medium">
              {phase === 'setup' && '设置每个格子中的字数，然后点击生成词汇'}
              {phase === 'generate' && '准备生成词汇骰子'}
              {phase === 'create' && '左键前进，右键后退，旋转骰子创作你的诗歌'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 生成词汇的辅助函数（模拟AI生成）
function generateWordsForCell(wordCount: number): string[] {
  const sampleWords: Record<number, string[]> = {
    1: ['月', '风', '花', '雪', '云', '水', '山', '海', '星', '夜'],
    2: ['春风', '明月', '落花', '流水', '白云', '青山', '夜雨', '晨光', '秋叶', '冬雪'],
    3: ['春风起', '明月照', '落花飞', '流水去', '白云散', '青山远', '夜雨声', '晨光暖', '秋叶黄', '冬雪白'],
    4: ['春风又绿江', '明月几时有', '落花时节又', '流水无情草', '白云千载空', '青山不老如', '夜雨敲窗急', '晨光透帘幽'],
  };

  const words = sampleWords[wordCount] || [`${wordCount}字词`];
  return [...words].sort(() => Math.random() - 0.5);
}

export default Index;
