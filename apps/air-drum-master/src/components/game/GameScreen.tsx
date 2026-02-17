import React, { useCallback, useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { audioAnalyzer } from '@/core/AudioAnalyzer';
import { gameEngine } from '@/core/GameEngine';
import { MenuScreen } from '@/components/game/MenuScreen';
import { ScoreDisplay } from '@/components/game/ScoreDisplay';
import { ComboDisplay } from '@/components/game/ComboDisplay';
import { NoteRenderer } from '@/components/game/NoteRenderer';
import { DrumDisplay } from '@/components/game/DrumDisplay';
import { HitZone } from '@/components/game/HitZone';
import { Track } from '@/components/game/Track';
import { HandPreview } from '@/components/game/HandPreview';
import { Countdown } from '@/components/game/Countdown';
import { ResultsScreen } from '@/components/game/ResultsScreen';
import { BackgroundEffects } from '@/components/game/BackgroundEffects';
import type { Difficulty } from '@/types/game';

export function GameScreen() {
  const [handPreviewCollapsed, setHandPreviewCollapsed] = useState(false);
  
  const {
    gameState,
    setGameState,
    currentBeatMap,
    setCurrentBeatMap,
    activeNotes,
    setActiveNotes,
    resetScore,
    gameTime,
    audioFile,
  } = useGameStore();
  
  const { startGameLoop, stopGameLoop } = useGameLoop();
  
  const handleStartDemo = useCallback(async (difficulty: Difficulty) => {
    const demoSongs = [
      {
        url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3',
        title: 'Viper Tech',
        artist: 'MDN Sample'
      },
      {
        url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/drums.mp3',
        title: 'Rhythmic Drums',
        artist: 'MDN Rhythm'
      },
      {
        url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/leadguitar.mp3',
        title: 'Lead Guitar Solo',
        artist: 'MDN Rock'
      },
      {
        url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/bassguitar.mp3',
        title: 'Deep Bass',
        artist: 'MDN Bass'
      },
      {
        url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/horns.mp3',
        title: 'Brass Blast',
        artist: 'MDN Horns'
      }
    ];

    const randomSong = demoSongs[Math.floor(Math.random() * demoSongs.length)];
    
    try {
      const buffer = await audioAnalyzer.loadAudioFromUrl(randomSong.url);
      gameEngine.setAudioBuffer(buffer);
      const beatMap = audioAnalyzer.generateBeatMap(
        buffer,
        randomSong.title,
        randomSong.artist,
        difficulty
      );
      setCurrentBeatMap(beatMap);
      resetScore();
      setGameState('countdown');
    } catch (error) {
      console.error('Failed to load demo audio:', error);
      const beatMap = audioAnalyzer.createDemoBeatMap(difficulty);
      setCurrentBeatMap(beatMap);
      resetScore();
      setGameState('countdown');
    }
  }, [setCurrentBeatMap, resetScore, setGameState]);
  
  const handleStartWithAudio = useCallback(async (difficulty: Difficulty) => {
    if (!audioFile) return;
    
    try {
      const buffer = await audioAnalyzer.loadAudio(audioFile);
      gameEngine.setAudioBuffer(buffer);
      const beatMap = audioAnalyzer.generateBeatMap(
        buffer,
        audioFile.name.replace(/\.[^/.]+$/, ''),
        'Unknown Artist',
        difficulty
      );
      setCurrentBeatMap(beatMap);
      resetScore();
      setGameState('countdown');
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  }, [audioFile, setCurrentBeatMap, resetScore, setGameState]);
  
  const handleCountdownComplete = useCallback(() => {
    setGameState('playing');
    startGameLoop();
  }, [setGameState, startGameLoop]);
  
  const handleGameEnd = useCallback(() => {
    stopGameLoop();
    setGameState('results');
  }, [stopGameLoop, setGameState]);
  
  const handleReplay = useCallback(() => {
    gameEngine.reset();
    resetScore();
    setActiveNotes([]);
    setGameState('countdown');
  }, [resetScore, setActiveNotes, setGameState]);
  
  const handleHome = useCallback(() => {
    stopGameLoop();
    gameEngine.reset();
    resetScore();
    setActiveNotes([]);
    setCurrentBeatMap(null);
    setGameState('menu');
  }, [stopGameLoop, resetScore, setActiveNotes, setCurrentBeatMap, setGameState]);
  
  // Check if game should end
  useEffect(() => {
    if (gameState === 'playing' && currentBeatMap) {
      if (gameTime >= currentBeatMap.duration) {
        handleGameEnd();
      }
    }
  }, [gameState, gameTime, currentBeatMap, handleGameEnd]);
  
  // Enable hand detection globally to support menu interaction
  const enableHandDetection = true;
  
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Menu */}
      {gameState === 'menu' && (
        <MenuScreen 
          onStartDemo={handleStartDemo}
          onStartWithAudio={handleStartWithAudio}
        />
      )}
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <Countdown onComplete={handleCountdownComplete} />
      )}
      
      {gameState === 'playing' && (
        <>
          {/* Background Effects */}
          <BackgroundEffects />
          
          {/* Background */}
          <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          
          {/* Score Display */}
          <div className="fixed top-4 left-4 right-4 z-10">
            <ScoreDisplay />
          </div>
          
          {/* Song Info */}
          {currentBeatMap && (
            <div className="fixed top-24 left-4 z-10">
              <div className="text-foreground font-medium">{currentBeatMap.title}</div>
              <div className="text-muted-foreground text-sm">
                {currentBeatMap.artist} • {currentBeatMap.bpm} BPM
              </div>
            </div>
          )}
          
          {/* Game Area */}
          <div className="fixed inset-0">
            <Track />
            <HitZone />
            <NoteRenderer notes={activeNotes} />
            <ComboDisplay />
            <DrumDisplay />
          </div>
          
          {/* Progress Bar */}
          {currentBeatMap && (
            <div className="fixed bottom-4 left-4 right-4 z-10">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${(gameTime / currentBeatMap.duration) * 100}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Results */}
      {gameState === 'results' && (
        <ResultsScreen onReplay={handleReplay} onHome={handleHome} />
      )}
      
      {/* Hand Preview (always visible when detection is enabled) */}
      {enableHandDetection && (
        <HandPreview 
          enabled={enableHandDetection}
          collapsed={handPreviewCollapsed}
          onToggle={() => setHandPreviewCollapsed(!handPreviewCollapsed)}
        />
      )}
    </div>
  );
}