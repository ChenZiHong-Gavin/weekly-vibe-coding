import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DanmakuTextProps {
  text: string;
  pattern: 'firework' | 'flower' | 'heart' | 'spiral' | 'wave' | 'star';
  onComplete: () => void;
}

interface TextPosition {
  x: number;
  y: number;
  char: string;
  delay: number;
  color: string;
}

export const DanmakuText: React.FC<DanmakuTextProps> = ({ text, pattern, onComplete }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  // 生成不同图案的文字位置
  const textPositions = useMemo(() => {
    const positions: TextPosition[] = [];
    const colors = ['danmaku-pink', 'danmaku-blue', 'danmaku-yellow', 'danmaku-green', 'danmaku-purple'];
    
    // 中心位置（视口中心）
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
    
    switch (pattern) {
      case 'firework': {
        // 烟花爆炸效果 - 从中心向外放射
        const textArray = text.split('');
        const angleStep = (Math.PI * 2) / Math.max(textArray.length, 8);
        
        textArray.forEach((char, index) => {
          // 重复使用文字来填充更多位置
          for (let radius = 50; radius <= 200; radius += 30) {
            for (let i = 0; i < 3; i++) {
              const angle = angleStep * index + (i * 0.3);
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              
              positions.push({
                x,
                y,
                char,
                delay: (radius / 50) * 200 + i * 100,
                color: colors[Math.floor(Math.random() * colors.length)]
              });
            }
          }
        });
        break;
      }
      
      case 'flower': {
        // 花朵绽放效果 - 花瓣形状
        const textArray = text.split('');
        const petalCount = 8;
        const petalAngle = (Math.PI * 2) / petalCount;
        
        for (let petal = 0; petal < petalCount; petal++) {
          const baseAngle = petalAngle * petal;
          
          textArray.forEach((char, charIndex) => {
            // 每个花瓣上的文字
            for (let point = 0; point < 5; point++) {
              const t = point / 4;
              const radius = 80 + Math.sin(t * Math.PI) * 60; // 花瓣弧形
              const angle = baseAngle + (t - 0.5) * 0.8;
              
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              
              positions.push({
                x,
                y,
                char,
                delay: petal * 100 + point * 50,
                color: colors[petal % colors.length]
              });
            }
          });
        }
        break;
      }
      
      case 'heart': {
        // 爱心形状效果
        const textArray = text.split('');
        
        // 爱心的参数方程，减少密度
        for (let t = 0; t <= Math.PI * 2; t += 0.25) {
          // 爱心参数方程: x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
          const x = 16 * Math.pow(Math.sin(t), 3) * 3;
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 3;
          
          const char = textArray[Math.floor(t * 4) % textArray.length];
          
          positions.push({
            x: centerX + x,
            y: centerY + y,
            char,
            delay: t * 200,
            color: colors[0] // 主要用粉色
          });
        }
        break;
      }
      
      case 'spiral': {
        // 螺旋展开效果
        const textArray = text.split('');
        
        for (let i = 0; i < 200; i++) {
          const angle = i * 0.3;
          const radius = i * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          const char = textArray[i % textArray.length];
          
          positions.push({
            x,
            y,
            char,
            delay: i * 30,
            color: colors[Math.floor(i / 40) % colors.length]
          });
        }
        break;
      }
      
      case 'wave': {
        // 波浪起伏效果
        const textArray = text.split('');
        
        for (let wave = 0; wave < 3; wave++) {
          for (let x = -200; x <= 200; x += 20) {
            const y = Math.sin((x + wave * 100) * 0.02) * 50 + wave * 60 - 60;
            
            const char = textArray[Math.floor((x + 200) / 20 + wave * 20) % textArray.length];
            
            positions.push({
              x: centerX + x,
              y: centerY + y,
              char,
              delay: (x + 200) / 4 + wave * 500,
              color: colors[wave % colors.length]
            });
          }
        }
        break;
      }
      
      case 'star': {
        // 五角星形状效果
        const textArray = text.split('');
        const starPoints = [];
        
        // 生成五角星的顶点
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? 90 : 45; // 稍微增大半径
          const x = Math.cos(angle - Math.PI / 2) * radius;
          const y = Math.sin(angle - Math.PI / 2) * radius;
          starPoints.push({ x, y });
        }
        
        // 在星形边缘填充文字，减少密度
        for (let i = 0; i < starPoints.length; i++) {
          const current = starPoints[i];
          const next = starPoints[(i + 1) % starPoints.length];
          
          // 在两点之间插值，增加步长减少密度
          for (let t = 0; t <= 1; t += 0.3) {
            const x = current.x + (next.x - current.x) * t;
            const y = current.y + (next.y - current.y) * t;
            
            const char = textArray[Math.floor(i * 3 + t * 3) % textArray.length];
            
            positions.push({
              x: centerX + x,
              y: centerY + y,
              char,
              delay: i * 150 + t * 150,
              color: colors[Math.floor(i / 2) % colors.length]
            });
          }
        }
        break;
      }
    }
    
    return positions;
  }, [text, pattern]);

  useEffect(() => {
    // 动画完成后清理
    const maxDelay = Math.max(...textPositions.map(p => p.delay));
    const animationDuration = pattern === 'firework' ? 2000 : pattern === 'flower' ? 3000 : pattern === 'heart' ? 2500 : pattern === 'spiral' ? 4000 : pattern === 'wave' ? 3000 : 2000;
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete();
    }, maxDelay + animationDuration + 500);

    return () => clearTimeout(timer);
  }, [textPositions, pattern, onComplete]);

  if (!isAnimating) return null;

  return (
    <>
      {textPositions.map((pos, index) => (
        <div
          key={index}
          className={cn(
            'danmaku-text',
            `text-${pos.color}`
          )}
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            animationDelay: `${pos.delay}ms`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {pos.char}
        </div>
      ))}
      
      {/* 图案容器用于整体动画效果 */}
      <div 
        className={cn(
          'absolute',
          `pattern-${pattern}`
        )}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
      />
    </>
  );
};