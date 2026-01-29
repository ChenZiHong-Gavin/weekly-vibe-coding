import { useRef, useCallback, useEffect, useState } from 'react';
import { gameEngine } from '@/core/GameEngine';
import { soundManager } from '@/core/SoundManager';
import { useGameStore } from '@/store/gameStore';
import type { Note } from '@/types/game';

export function useGameLoop() {
  const frameRef = useRef<number>();
  const hitNotesRef = useRef<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  
  const handleHit = useCallback((noteId: string, judgment: 'perfect' | 'good') => {
    const state = useGameStore.getState();
    const { addPerfect, addGood, setLastHit, activeNotes } = state;
    
    // Mark note as hit
    hitNotesRef.current.add(noteId);
    
    if (judgment === 'perfect') {
      addPerfect();
    } else {
      addGood();
    }
    
    const note = activeNotes.find(n => n.id === noteId);
    if (note) {
      // Play sound effect
      switch (note.type) {
        case 'don':
          soundManager.playDon();
          break;
        case 'kat':
          soundManager.playKat();
          break;
        case 'boom':
          soundManager.playBoom();
          break;
        case 'air':
          soundManager.playAir();
          break;
      }
      
      if (judgment === 'perfect') {
        soundManager.playPerfect();
      } else {
        soundManager.playGood();
      }
      
      setLastHit({
        type: note.type === 'don' || note.type === 'boom' ? 'don' : 'kat',
        judgment,
        time: Date.now(),
      });
      
      // Clear hit feedback after animation
      setTimeout(() => useGameStore.getState().setLastHit(null), 300);
    }
  }, []);
  
  const handleMiss = useCallback((noteId: string) => {
    const { addMiss } = useGameStore.getState();
    hitNotesRef.current.add(noteId);
    addMiss();
    soundManager.playMiss();
  }, []);
  
  const gameLoop = useCallback(() => {
    const state = useGameStore.getState();
    const { 
      gameState, 
      leftHand, 
      rightHand, 
      activeNotes, 
      currentBeatMap, 
      calibrationOffset,
      setGameTime,
      setActiveNotes,
    } = state;
    
    if (gameState !== 'playing') {
      setIsRunning(false);
      return;
    }
    
    const currentTime = gameEngine.getCurrentTime();
    setGameTime(currentTime);
    
    // Presence-based hit check (no swing required)
    let presence: 'none' | 'left_only' | 'right_only' | 'both';
    if (leftHand && rightHand) {
      presence = 'both';
    } else if (leftHand && !rightHand) {
      presence = 'left_only';
    } else if (!leftHand && rightHand) {
      presence = 'right_only';
    } else {
      presence = 'none';
    }
    const hit = gameEngine.checkHitByPresence(activeNotes, presence, calibrationOffset);
    if (hit && !hitNotesRef.current.has(hit.noteId)) {
      handleHit(hit.noteId, hit.judgment);
    }
    
    // Check for missed notes
    const missedIds = gameEngine.checkMissedNotes(activeNotes, calibrationOffset);
    for (const id of missedIds) {
      if (!hitNotesRef.current.has(id)) {
        handleMiss(id);
      }
    }
    
    // Update visible notes from beatmap
    if (currentBeatMap) {
      const visibleNotes = gameEngine.getVisibleNotes(currentBeatMap.notes, calibrationOffset);
      // Filter out notes that have already been hit
      const filteredNotes = visibleNotes.filter(n => !hitNotesRef.current.has(n.id));
      
      // Debug logging
      if (filteredNotes.length > 0 && activeNotes.length === 0) {
        console.log(`Notes appearing! Time: ${currentTime.toFixed(0)}ms, Count: ${filteredNotes.length}`);
      }
      
      setActiveNotes(filteredNotes);
    }
    
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [handleHit, handleMiss]);
  
  const startGameLoop = useCallback(() => {
    // Reset hit notes when starting a new game
    hitNotesRef.current = new Set();
    setIsRunning(true);
    gameEngine.start();
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);
  
  const stopGameLoop = useCallback(() => {
    setIsRunning(false);
    gameEngine.stop();
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);
  
  const pauseGameLoop = useCallback(() => {
    setIsRunning(false);
    gameEngine.pause();
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);
  
  const resumeGameLoop = useCallback(() => {
    setIsRunning(true);
    gameEngine.resume();
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);
  
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);
  
  return {
    isRunning,
    startGameLoop,
    stopGameLoop,
    pauseGameLoop,
    resumeGameLoop,
    getCurrentTime: () => gameEngine.getCurrentTime(),
    getNotePosition: (note: Note) => gameEngine.getNotePosition(note, useGameStore.getState().calibrationOffset),
  };
}
