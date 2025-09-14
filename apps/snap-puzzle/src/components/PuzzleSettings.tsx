import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, Grid2X2 } from 'lucide-react';

interface PuzzleSettingsProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  disabled?: boolean;
}

const difficultyLevels = [
  { size: 3, label: '简单', icon: Grid2X2, description: '3×3 (9块)' },
  { size: 4, label: '中等', icon: Grid3X3, description: '4×4 (16块)' },
  { size: 5, label: '困难', icon: Grid3X3, description: '5×5 (25块)' },
  { size: 6, label: '专家', icon: Grid3X3, description: '6×6 (36块)' }
];

export const PuzzleSettings: React.FC<PuzzleSettingsProps> = ({
  gridSize,
  onGridSizeChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-3">选择难度</h4>
        <div className="grid grid-cols-2 gap-2">
          {difficultyLevels.map((level) => {
            const Icon = level.icon;
            const isActive = gridSize === level.size;
            
            return (
              <Button
                key={level.size}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-auto p-3 flex-col gap-1"
                onClick={() => onGridSizeChange(level.size)}
                disabled={disabled}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{level.label}</span>
                <span className="text-xs opacity-70">{level.description}</span>
              </Button>
            );
          })}
        </div>
      </div>
      
      <Card className="p-3 bg-muted/30">
        <div className="text-center">
          <div className="text-lg font-bold text-primary mb-1">
            {gridSize}×{gridSize}
          </div>
          <div className="text-xs text-muted-foreground">
            当前难度：{difficultyLevels.find(l => l.size === gridSize)?.label}
          </div>
        </div>
      </Card>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">游戏说明</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 点击拼图块移动到空白位置</p>
          <p>• 只能移动与空白相邻的拼图块</p>
          <p>• 将所有拼图块移动到正确位置即可获胜</p>
        </div>
      </div>
    </div>
  );
};