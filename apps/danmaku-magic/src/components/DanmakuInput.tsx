import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Flower, Heart, RotateCcw, Waves, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DanmakuInputProps {
  onSendDanmaku: (text: string, pattern: 'firework' | 'flower' | 'heart' | 'spiral' | 'wave' | 'star') => void;
}

export const DanmakuInput: React.FC<DanmakuInputProps> = ({ onSendDanmaku }) => {
  const [text, setText] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<'firework' | 'flower' | 'heart' | 'spiral' | 'wave' | 'star'>('firework');

  const patterns = [
    { id: 'firework' as const, name: '烟花', icon: Sparkles, description: '绚烂爆炸' },
    { id: 'flower' as const, name: '花朵', icon: Flower, description: '绽放美丽' },
    { id: 'heart' as const, name: '爱心', icon: Heart, description: '浪漫表白' },
    { id: 'spiral' as const, name: '螺旋', icon: RotateCcw, description: '旋转展开' },
    { id: 'wave' as const, name: '波浪', icon: Waves, description: '起伏律动' },
    { id: 'star' as const, name: '星星', icon: Star, description: '闪耀五角' }
  ];

  const handleSend = () => {
    if (text.trim()) {
      onSendDanmaku(text.trim(), selectedPattern);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
      {/* Pattern Selector */}
      <div className="pattern-selector mb-4 flex justify-center">
        <div className="flex gap-2">
          {patterns.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <button
                key={pattern.id}
                onClick={() => setSelectedPattern(pattern.id)}
                className={cn(
                  'pattern-btn flex items-center gap-2',
                  selectedPattern === pattern.id && 'active'
                )}
              >
                <Icon size={18} />
                <span className="text-sm">{pattern.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input and Send */}
      <div className="flex gap-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入弹幕内容，按回车或点击发送..."
          className="input-hero text-lg px-6 py-4 rounded-2xl"
          maxLength={50}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim()}
          className="btn-danmaku px-8 py-4 rounded-2xl"
          size="lg"
        >
          <Send size={20} className="mr-2" />
          发送
        </Button>
      </div>

      {/* Selected Pattern Info */}
      <div className="text-center mt-3">
        <p className="text-muted-foreground text-sm">
          当前模式: <span className="text-primary font-medium">
            {patterns.find(p => p.id === selectedPattern)?.name}
          </span>
          {" - "}
          <span className="text-xs">
            {patterns.find(p => p.id === selectedPattern)?.description}
          </span>
        </p>
      </div>
    </div>
  );
};