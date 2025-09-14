import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { PuzzlePiece } from './PuzzleGame';

interface PuzzleBoardProps {
  pieces: PuzzlePiece[];
  gridSize: number;
  image: string;
  onPieceDrop: (pieceId: number, targetPosition: number) => void;
  isComplete: boolean;
}

interface PuzzlePieceComponentProps {
  piece: PuzzlePiece;
  gridSize: number;
  image: string;
  onDragStart: (pieceId: number) => void;
  isPlaced?: boolean;
}

interface DropZoneProps {
  position: number;
  piece?: PuzzlePiece;
  gridSize: number;
  image: string;
  onDrop: (position: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemovePiece?: (pieceId: number) => void;
}

const PuzzlePieceComponent: React.FC<PuzzlePieceComponentProps> = ({
  piece,
  gridSize,
  image,
  onDragStart,
  isPlaced = false
}) => {
  const row = Math.floor(piece.correctPosition / gridSize);
  const col = piece.correctPosition % gridSize;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', piece.id.toString());
    onDragStart(piece.id);
  };

  return (
    <div
      className={`puzzle-piece aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isPlaced ? 'border-success hover:border-destructive hover:scale-105' : 'border-border hover:border-primary hover:scale-105'
      }`}
      draggable={true}
      onDragStart={handleDragStart}
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        backgroundPosition: `-${col * 100}% -${row * 100}%`
      }}
    />
  );
};

const DropZone: React.FC<DropZoneProps> = ({
  position,
  piece,
  gridSize,
  image,
  onDrop,
  onDragOver,
  onRemovePiece
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(position);
  };

  if (piece) {
    return (
      <PuzzlePieceComponent
        piece={piece}
        gridSize={gridSize}
        image={image}
        onDragStart={(pieceId) => onRemovePiece?.(pieceId)}
        isPlaced={true}
      />
    );
  }

  return (
    <div
      className={`aspect-square rounded-lg border-2 border-dashed transition-all duration-200 ${
        isDragOver 
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-muted-foreground/30 bg-muted/5'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    />
  );
};

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  pieces,
  gridSize,
  image,
  onPieceDrop,
  isComplete
}) => {
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);

  const handleDragStart = useCallback((pieceId: number) => {
    setDraggedPiece(pieceId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetPosition: number) => {
    if (draggedPiece !== null) {
      onPieceDrop(draggedPiece, targetPosition);
      setDraggedPiece(null);
    }
  }, [draggedPiece, onPieceDrop]);

  const handleRemovePiece = useCallback((pieceId: number) => {
    onPieceDrop(pieceId, -1); // -1 means move back to pieces area
  }, [onPieceDrop]);

  // Get placed pieces (those with currentPosition !== -1)
  const placedPieces = pieces.filter(piece => piece.currentPosition !== -1);
  
  // Get unplaced pieces (those with currentPosition === -1)
  const unplacedPieces = pieces.filter(piece => piece.currentPosition === -1);

  // Create target grid
  const targetGrid = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const placedPiece = placedPieces.find(piece => piece.currentPosition === index);
    return (
        <DropZone
          key={index}
          position={index}
          piece={placedPiece}
          gridSize={gridSize}
          image={image}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onRemovePiece={handleRemovePiece}
        />
    );
  });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Target Area */}
      <Card className={`p-6 ${isComplete ? 'success-pulse ring-2 ring-success' : ''}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">拼图区域</h3>
            <div className="text-sm text-muted-foreground">
              {gridSize} × {gridSize}
            </div>
          </div>
          
          <div 
            className="grid gap-1 mx-auto max-w-sm"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              aspectRatio: '1/1'
            }}
          >
            {targetGrid}
          </div>
          
          {isComplete && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full">
                <span className="text-2xl">🎉</span>
                <span className="font-medium">拼图完成！</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Pieces Area */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">拼图碎片</h3>
          <div className="text-sm text-muted-foreground mb-4">
            拖拽碎片到左侧正确位置
          </div>
          
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {unplacedPieces.map((piece) => (
              <div key={piece.id}>
                <PuzzlePieceComponent
                  piece={piece}
                  gridSize={gridSize}
                  image={image}
                  onDragStart={handleDragStart}
                />
              </div>
            ))}
          </div>
          
          {unplacedPieces.length === 0 && !isComplete && (
            <div className="text-center text-muted-foreground">
              所有碎片都已放置
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};