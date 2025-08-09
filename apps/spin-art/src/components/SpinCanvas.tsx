import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Save, RotateCcw, Palette, Play, Pause } from "lucide-react";

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export const SpinCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState([2]);
  const [brushSize, setBrushSize] = useState([3]);
  const [currentColor, setCurrentColor] = useState("#9333ea");
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const animationRef = useRef<number>();
  const pathRef = useRef<Point[]>([]); // 存储当前绘制路径
  const lastClientPosRef = useRef<{ x: number; y: number } | null>(null);

  const colors = [
    "#9333ea", // purple
    "#06b6d4", // cyan  
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#8b5cf6", // violet
    "#f97316", // orange
  ];

  // Helper: map client (screen) coordinates to canvas coordinates (no rotation compensation)
  function mapClientToCanvas(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    // Convert screen coordinates to canvas coordinates
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    return { x, y };
  }

  // Helper: map client coordinates to canvas coordinates WITH rotation compensation
  function mapClientToCanvasCompensated(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Convert screen coordinates to canvas coordinates
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    // Apply inverse rotation compensation
    const dx = x - centerX;
    const dy = y - centerY;
    const currentRotation = rotationRef.current;

    const rotatedX = dx * Math.cos(-currentRotation) - dy * Math.sin(-currentRotation) + centerX;
    const rotatedY = dx * Math.sin(-currentRotation) + dy * Math.cos(-currentRotation) + centerY;

    return { x: rotatedX, y: rotatedY };
  }

  const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent): Point | null => {
    let clientX: number, clientY: number;
    
    if (e.type.startsWith('touch')) {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length === 0) return null;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = e as MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return isRotating
      ? mapClientToCanvasCompensated(clientX, clientY)
      : mapClientToCanvas(clientX, clientY);
  }, [isRotating]);
  
  

  const drawLine = useCallback((from: Point, to: Point, color: string, size: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    // 创建更平滑的渐变效果
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  // 绘制平滑路径
  const drawSmoothPath = useCallback((points: Point[], color: string, size: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || points.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // 使用二次贝塞尔曲线创建平滑路径
    for (let i = 1; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      const controlPointX = (currentPoint.x + nextPoint.x) / 2;
      const controlPointY = (currentPoint.y + nextPoint.y) / 2;
      
      ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlPointX, controlPointY);
    }

    // 绘制最后一段
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    let clientX: number, clientY: number;
    if (e.type.startsWith('touch')) {
      const te = e as TouchEvent;
      if (te.touches.length === 0) return;
      clientX = te.touches[0].clientX;
      clientY = te.touches[0].clientY;
    } else {
      const me = e as MouseEvent;
      clientX = me.clientX;
      clientY = me.clientY;
    }
    lastClientPosRef.current = { x: clientX, y: clientY };
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
    pathRef.current = [point]; // 开始新的路径
  }, [getCanvasPoint]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    let clientX: number, clientY: number;
    if (e.type.startsWith('touch')) {
      const te = e as TouchEvent;
      if (te.touches.length === 0) return;
      clientX = te.touches[0].clientX;
      clientY = te.touches[0].clientY;
    } else {
      const me = e as MouseEvent;
      clientX = me.clientX;
      clientY = me.clientY;
    }
    lastClientPosRef.current = { x: clientX, y: clientY };

    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;

    // 添加点到当前路径
    pathRef.current.push(point);
    
    // 如果有足够的点，绘制平滑的最后几段
    if (pathRef.current.length >= 3) {
      const recentPoints = pathRef.current.slice(-3); // 只取最后3个点
      drawSmoothPath(recentPoints, currentColor, brushSize[0]);
    } else if (lastPointRef.current) {
      // 如果点不够，就画直线
      drawLine(lastPointRef.current, point, currentColor, brushSize[0]);
    }

    lastPointRef.current = point;
  }, [isDrawing, getCanvasPoint, drawLine, drawSmoothPath, currentColor, brushSize]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && pathRef.current.length > 1) {
      // 绘制完整的平滑路径
      drawSmoothPath(pathRef.current, currentColor, brushSize[0]);
    }
    
    setIsDrawing(false);
    lastPointRef.current = null;
    pathRef.current = []; // 清空当前路径
    lastClientPosRef.current = null;
  }, [isDrawing, drawSmoothPath, currentColor, brushSize]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // 只在用户主动点击清空时才清空画布
    ctx.fillStyle = 'hsl(var(--canvas-bg))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    toast("画布已清空");
  }, []);

  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `spiral-art-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast("作品已保存");
  }, []);

  // Animation loop for rotation and continuous inking
  useEffect(() => {
    const animate = () => {
      if (isRotating) {
        rotationRef.current += (rotationSpeed[0] * Math.PI) / 180;
        setRotation(rotationRef.current);
      }

      if (isDrawing && lastClientPosRef.current) {
        const { x, y } = lastClientPosRef.current;
        const p = isRotating
          ? mapClientToCanvasCompensated(x, y)
          : mapClientToCanvas(x, y);
        if (p) {
          pathRef.current.push(p);
          if (pathRef.current.length >= 3) {
            const recentPoints = pathRef.current.slice(-3);
            drawSmoothPath(recentPoints, currentColor, brushSize[0]);
          } else if (lastPointRef.current) {
            drawLine(lastPointRef.current, p, currentColor, brushSize[0]);
          }
          lastPointRef.current = p;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating, rotationSpeed, isDrawing, drawSmoothPath, currentColor, brushSize, drawLine]);

  // Initialize canvas size and background once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6, 600);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'hsl(var(--canvas-bg))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Setup canvas events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 鼠标事件 - 改进事件处理
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startDrawing(e);
    };
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      stopDrawing();
    };

    // 触摸事件 - 改进触摸处理
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrawing(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing();
    };

    canvas.addEventListener('mousedown', handleMouseDown, { passive: false });
    canvas.addEventListener('mousemove', handleMouseMove, { passive: false });
    canvas.addEventListener('mouseup', handleMouseUp, { passive: false });
    canvas.addEventListener('mouseleave', handleMouseUp, { passive: false });

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 space-y-6">
      {/* Title */}
      <div className="text-center animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          旋转画盘
        </h1>
        <p className="text-muted-foreground">在旋转的画布上创造螺旋艺术</p>
      </div>

      {/* Canvas Container */}
      <div className="relative">
        <div 
          className="relative rounded-full overflow-hidden border-4 border-primary/20 animate-pulse-glow"
        >
          <canvas
            ref={canvasRef}
            className="block cursor-crosshair bg-canvas-bg rounded-full"
            style={{ touchAction: 'none' }}
          />
        </div>
        
        {/* Center dot indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/50 rounded-full pointer-events-none" />
      </div>

      {/* Controls */}
      <Card className="p-6 w-full max-w-md space-y-6 animate-fade-in">
        {/* Rotation Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">旋转控制</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRotating(!isRotating)}
              className="flex items-center gap-2"
            >
              {isRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRotating ? '暂停' : '开始'}
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">旋转速度</label>
            <Slider
              value={rotationSpeed}
              onValueChange={setRotationSpeed}
              max={8}
              min={0.5}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Brush Controls */}
        <div className="space-y-3">
          <span className="text-sm font-medium">画笔设置</span>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">画笔大小</label>
            <Slider
              value={brushSize}
              onValueChange={setBrushSize}
              max={12}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-3">
          <span className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            颜色选择
          </span>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  currentColor === color ? 'border-foreground scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={clearCanvas} variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            清空
          </Button>
          <Button onClick={saveCanvas} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
        </div>
      </Card>
    </div>
  );
};