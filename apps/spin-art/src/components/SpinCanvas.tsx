import { useEffect, useRef, useState, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
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
  const startRotationRef = useRef(0); // ★ 记录按下时的旋转角
  const lastPointRef = useRef<Point | null>(null);
  const animationRef = useRef<number>();
  const pathRef = useRef<Point[]>([]);
  const lastClientPosRef = useRef<{ x: number; y: number } | null>(null);

  // 基本映射：屏幕坐标 -> 画布坐标（不补偿）
  function mapClientToCanvas(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  // ★ 相对补偿映射：以按下时角度为基准，只补偿增量角度 delta
  function mapClientToCanvasWithDelta(
    clientX: number,
    clientY: number,
    delta: number
  ): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const dx = x - centerX;
    const dy = y - centerY;

    const cos = Math.cos(-delta);
    const sin = Math.sin(-delta);

    const rotatedX = dx * cos - dy * sin + centerX;
    const rotatedY = dx * sin + dy * cos + centerY;

    return { x: rotatedX, y: rotatedY };
  }

  // ★ 统一的取点：旋转时用“相对角度”补偿；不旋转则直接映射
  const getCanvasPoint = useCallback(
    (e: MouseEvent | TouchEvent): Point | null => {
      let clientX: number, clientY: number;
      if (e.type.startsWith("touch")) {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length === 0) return null;
        clientX = touchEvent.touches[0].clientX;
        clientY = touchEvent.touches[0].clientY;
      } else {
        const mouseEvent = e as MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
      }

      const delta = isRotating
        ? rotationRef.current - startRotationRef.current
        : 0;

      return delta === 0
        ? mapClientToCanvas(clientX, clientY)
        : mapClientToCanvasWithDelta(clientX, clientY, delta);
    },
    [isRotating]
  );

  const drawLine = useCallback((from: Point, to: Point, color: string, size: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;

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

  const drawSmoothPath = useCallback((points: Point[], color: string, size: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || points.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      const cpx = (currentPoint.x + nextPoint.x) / 2;
      const cpy = (currentPoint.y + nextPoint.y) / 2;
      ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, cpx, cpy);
    }

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
    if (e.type.startsWith("touch")) {
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

    // ★ 记录“按下时”的旋转角
    startRotationRef.current = rotationRef.current;

    // ★ 第一个点用 delta=0 的映射（就是鼠标所在位置）
    const point = mapClientToCanvas(clientX, clientY);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
    pathRef.current = [point];
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    let clientX: number, clientY: number;
    if (e.type.startsWith("touch")) {
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

    pathRef.current.push(point);

    if (pathRef.current.length >= 3) {
      const recentPoints = pathRef.current.slice(-3);
      drawSmoothPath(recentPoints, currentColor, brushSize[0]);
    } else if (lastPointRef.current) {
      drawLine(lastPointRef.current, point, currentColor, brushSize[0]);
    }

    lastPointRef.current = point;
  }, [isDrawing, getCanvasPoint, drawLine, drawSmoothPath, currentColor, brushSize]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && pathRef.current.length > 1) {
      drawSmoothPath(pathRef.current, currentColor, brushSize[0]);
    }
    setIsDrawing(false);
    lastPointRef.current = null;
    pathRef.current = [];
    lastClientPosRef.current = null;
  }, [isDrawing, drawSmoothPath, currentColor, brushSize]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "hsl(var(--canvas-bg))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    toast("画布已清空");
  }, []);

  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `spiral-art-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast("作品已保存");
  }, []);

  // 旋转 + 连续描画
  useEffect(() => {
    const animate = () => {
      if (isRotating) {
        rotationRef.current += (rotationSpeed[0] * Math.PI) / 180;
        setRotation(rotationRef.current);
      }

      if (isDrawing && lastClientPosRef.current) {
        const { x, y } = lastClientPosRef.current;

        // ★ 用“相对角度”补偿（θ - θStart）
        const delta = isRotating
          ? rotationRef.current - startRotationRef.current
          : 0;
        const p =
          delta === 0
            ? mapClientToCanvas(x, y)
            : mapClientToCanvasWithDelta(x, y, delta);

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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRotating, rotationSpeed, isDrawing, drawSmoothPath, currentColor, brushSize, drawLine]);

  // 初始化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6, 600);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "hsl(var(--canvas-bg))";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // 事件绑定
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); startDrawing(e); };
    const handleMouseMove = (e: MouseEvent) => { e.preventDefault(); draw(e); };
    const handleMouseUp = (e: MouseEvent) => { e.preventDefault(); stopDrawing(); };

    const handleTouchStart = (e: TouchEvent) => { e.preventDefault(); startDrawing(e); };
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); draw(e); };
    const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); stopDrawing(); };

    canvas.addEventListener("mousedown", handleMouseDown, { passive: false });
    canvas.addEventListener("mousemove", handleMouseMove, { passive: false });
    canvas.addEventListener("mouseup", handleMouseUp, { passive: false });
    canvas.addEventListener("mouseleave", handleMouseUp, { passive: false });

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);

      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center animate-fade-in mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          旋转画盘
        </h1>
        <p className="text-muted-foreground">在旋转的画布上创造螺旋艺术</p>
      </div>

      <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-8">
        <div className="relative">
          <div
            className={`relative rounded-full overflow-hidden border-4 transition-colors ${
              isRotating
                ? "border-primary/20 animate-pulse-glow"
                : "border-border"
            }`}
          >
            <canvas
              ref={canvasRef}
              className={`block cursor-crosshair bg-canvas-bg rounded-full transition-opacity ${
                isRotating ? "" : "opacity-70"
              }`}
              style={{ touchAction: "none" }}
            />
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/50 rounded-full pointer-events-none" />
        </div>

        <Card className="p-6 w-full max-w-md space-y-6 animate-fade-in">
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
                {isRotating ? "暂停" : "开始"}
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

          <div className="space-y-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              颜色选择
            </span>
            <div className="flex justify-center">
              <HexColorPicker color={currentColor} onChange={setCurrentColor} />
            </div>
          </div>

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
    </div>
  );
};
