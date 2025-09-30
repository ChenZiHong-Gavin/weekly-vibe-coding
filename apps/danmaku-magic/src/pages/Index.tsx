import React, { useState, useCallback } from 'react';
import { DanmakuInput } from '@/components/DanmakuInput';
import { DanmakuCanvas, DanmakuItem } from '@/components/DanmakuCanvas';
import { toast } from 'sonner';

const Index = () => {
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);

  const handleSendDanmaku = useCallback((text: string, pattern: 'firework' | 'flower' | 'heart' | 'spiral' | 'wave' | 'star') => {
    const newDanmaku: DanmakuItem = {
      id: Date.now().toString() + Math.random(),
      text,
      pattern,
      timestamp: Date.now()
    };

    setDanmakuList(prev => [...prev, newDanmaku]);
    
    const patternNames = {
      firework: '烟花',
      flower: '花朵', 
      heart: '爱心',
      spiral: '螺旋',
      wave: '波浪',
      star: '星星'
    };
    
    toast.success(`${patternNames[pattern]}弹幕发送成功！`, {
      description: `"${text}" 正在${patternNames[pattern]}中绽放...`
    });
  }, []);

  const handleDanmakuComplete = useCallback((id: string) => {
    setDanmakuList(prev => prev.filter(item => item.id !== id));
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* 标题区域 */}
      <div className="relative z-10 pt-20 text-center">
        <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
          弹幕文字动画
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          模仿哔哩哔哩弹幕效果，让文字绽放出美丽图案
        </p>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danmaku-pink"></div>
            <span>烟花爆炸</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danmaku-green"></div>
            <span>花朵绽放</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danmaku-purple"></div>
            <span>爱心浪漫</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danmaku-blue"></div>
            <span>螺旋展开</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danmaku-yellow"></div>
            <span>波浪律动</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>闪耀星星</span>
          </div>
        </div>
      </div>

      {/* 弹幕画布 */}
      <DanmakuCanvas 
        danmakuList={danmakuList}
        onDanmakuComplete={handleDanmakuComplete}
      />

      {/* 输入组件 */}
      <DanmakuInput onSendDanmaku={handleSendDanmaku} />

      {/* 使用说明 */}
      <div className="fixed top-4 right-4 bg-card/80 backdrop-blur-md rounded-xl p-4 max-w-xs text-sm">
        <h3 className="font-semibold text-primary mb-2">使用说明</h3>
        <ul className="text-muted-foreground space-y-1 text-xs">
          <li>• 选择图案类型（6种效果）</li>
          <li>• 输入文字内容</li>  
          <li>• 点击发送或按回车</li>
          <li>• 观看文字动态组成图案</li>
        </ul>
      </div>

      {/* 活跃弹幕计数 */}
      {danmakuList.length > 0 && (
        <div className="fixed top-4 left-4 bg-card/80 backdrop-blur-md rounded-xl px-4 py-2 text-sm">
          <span className="text-muted-foreground">活跃弹幕: </span>
          <span className="text-primary font-semibold">{danmakuList.length}</span>
        </div>
      )}
    </div>
  );
};

export default Index;