import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note } from '@/types/game';
import { gameEngine } from '@/core/GameEngine';
import { useGameStore } from '@/store/gameStore';

interface NoteRendererProps {
  notes: Note[];
}

export function NoteRenderer({ notes }: NoteRendererProps) {
  const { calibrationOffset, gameState } = useGameStore();
  const [, forceUpdate] = useState(0);
  
  // Force re-render on every frame for smooth note movement
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let animationId: number;
    
    const animate = () => {
      forceUpdate(prev => prev + 1);
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {notes.map(note => (
          <NoteElement 
            key={note.id} 
            note={note} 
            calibrationOffset={calibrationOffset}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NoteElementProps {
  note: Note;
  calibrationOffset: number;
}

function NoteElement({ note, calibrationOffset }: NoteElementProps) {
  const position = gameEngine.getNotePosition(note, calibrationOffset);
  const { type } = note;
  
  // Calculate x position: notes spawn from right, move to left (hit zone)
  // Position 1 = spawn (right), Position 0 = hit zone (left center)
  const xPercent = 15 + position * 70; // 15% is hit zone, 85% is spawn point
  
  // Y position: both tracks in center area
  const yPercent = 50;
  
  const size = (type === 'boom' || type === 'air') ? 80 : 56;
  
  const getNoteClass = () => {
    switch (type) {
      case 'don': return 'note-don';
      case 'kat': return 'note-kat';
      case 'boom': return 'note-boom';
      case 'air': return 'note-air';
      default: return '';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'don': return '咚';
      case 'kat': return '咔';
      case 'boom': return 'BOOM';
      case 'air': return 'AIR';
      default: return '';
    }
  };

  const getLabelColor = () => {
    if (type === 'air') return 'text-black';
    return 'text-white';
  };
  
  return (
    <div
      className="absolute left-0 top-0 transition-none"
      style={{
        width: size,
        height: size,
        transform: `translate(${xPercent}vw, calc(${yPercent}vh - ${size / 2}px))`,
      }}
    >
      <motion.div 
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ 
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className={`
          w-full h-full flex items-center justify-center rounded-full
          ${getNoteClass()}
        `}
      >
        <span className={`font-bold ${getLabelColor()} ${type === 'boom' || type === 'air' ? 'text-lg' : 'text-xs'}`}>
          {getLabel()}
        </span>
      </motion.div>
    </div>
  );
}