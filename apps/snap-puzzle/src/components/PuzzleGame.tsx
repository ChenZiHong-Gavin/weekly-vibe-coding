import React, { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUploader } from './ImageUploader';
import { PuzzleBoard } from './PuzzleBoard';
import { PuzzleSettings } from './PuzzleSettings';
import { RotateCcw, Trophy, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';

export interface PuzzlePiece {
  id: number;
  correctPosition: number;
  currentPosition: number;
  imageUrl: string;
}

export const PuzzleGame = () => {
  const [image, setImage] = useState<string | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [gridSize, setGridSize] = useState(3);
  const [isComplete, setIsComplete] = useState(false);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const createPuzzle = useCallback((imageUrl: string, size: number) => {
    const totalPieces = size * size;
    const newPieces: PuzzlePiece[] = [];
    
    // Create pieces - all start as unplaced (currentPosition = -1)
    for (let i = 0; i < totalPieces; i++) {
      newPieces.push({
        id: i,
        correctPosition: i,
        currentPosition: -1, // -1 means unplaced/in pieces area
        imageUrl: imageUrl
      });
    }
    
    // Shuffle pieces for scattered appearance
    for (let i = newPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPieces[i], newPieces[j]] = [newPieces[j], newPieces[i]];
    }
    
    setPieces(newPieces);
    setIsComplete(false);
    setMoves(0);
    setStartTime(new Date());
    setElapsedTime(0);
    
    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    toast.success(`${size}x${size} 拼图已生成！开始拖拽碎片吧！`);
  }, []);

  const handleImageUpload = (imageUrl: string) => {
    setImage(imageUrl);
    createPuzzle(imageUrl, gridSize);
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    if (image) {
      createPuzzle(image, size);
    }
  };

  const handlePieceDrop = (pieceId: number, targetPosition: number) => {
    setPieces(prev => {
      const newPieces = [...prev];
      const draggedPiece = newPieces.find(p => p.id === pieceId);
      
      if (draggedPiece) {
        // If target position is occupied, swap pieces
        const occupyingPiece = newPieces.find(p => p.currentPosition === targetPosition);
        if (occupyingPiece) {
          occupyingPiece.currentPosition = -1; // Move back to pieces area
        }
        
        // Place the dragged piece
        draggedPiece.currentPosition = targetPosition;
      }
      
      return newPieces;
    });
    
    setMoves(prev => prev + 1);
    
    // Check if puzzle is complete
    setTimeout(() => {
      const isComplete = pieces.every(piece => piece.correctPosition === piece.currentPosition);
      if (isComplete && pieces.length > 0) {
        setIsComplete(true);
        if (timerRef.current) clearInterval(timerRef.current);
        toast.success('🎉 恭喜！拼图完成！', {
          description: `用时 ${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}，共 ${moves + 1} 步`
        });
      }
    }, 100);
  };

  const resetPuzzle = () => {
    if (image) {
      createPuzzle(image, gridSize);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!image) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">🧩 智能拼图生成器</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            上传您的照片，创建个性化拼图游戏
          </p>
        </div>
        
        <Card className="p-8">
          <ImageUploader onImageUpload={handleImageUpload} />
        </Card>
        
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">智能切割</h3>
            <p className="text-sm text-muted-foreground">自动生成拼图块，支持多种难度级别</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">有趣互动</h3>
            <p className="text-sm text-muted-foreground">拖拽式操作，流畅的游戏体验</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">计时挑战</h3>
            <p className="text-sm text-muted-foreground">记录用时和步数，挑战自己</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Panel */}
        <Card className="lg:w-80 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">游戏设置</h2>
              <PuzzleSettings
                gridSize={gridSize}
                onGridSizeChange={handleGridSizeChange}
                disabled={false}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">进度</span>
                <Badge variant="outline">
                  <Trophy className="w-3 h-3 mr-1" />
                  {pieces.filter(p => p.correctPosition === p.currentPosition && p.currentPosition !== -1).length}/{gridSize * gridSize}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">用时</span>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(elapsedTime)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">步数</span>
                <Badge variant="outline">
                  <Target className="w-3 h-3 mr-1" />
                  {moves}
                </Badge>
              </div>
            </div>
            
            <Button
              onClick={resetPuzzle}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重新开始
            </Button>
            
            {isComplete && (
              <Card className="p-4 bg-success/5 border-success/20">
                <div className="text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-success" />
                  <h3 className="font-semibold text-success">拼图完成！</h3>
                  <p className="text-sm text-success/80 mt-1">
                    用时 {formatTime(elapsedTime)}，共 {moves} 步
                  </p>
                </div>
              </Card>
            )}
          </div>
        </Card>
        
        {/* Game Board */}
        <div className="flex-1">
          <PuzzleBoard
            pieces={pieces}
            gridSize={gridSize}
            image={image}
            onPieceDrop={handlePieceDrop}
            isComplete={isComplete}
          />
        </div>
      </div>
    </div>
  );
};