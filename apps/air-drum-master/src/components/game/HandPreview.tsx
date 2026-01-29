import React from 'react';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import { motion } from 'framer-motion';
import { Camera, CameraOff } from 'lucide-react';

interface HandPreviewProps {
  enabled: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function HandPreview({ enabled, collapsed, onToggle }: HandPreviewProps) {
  const { videoRef, canvasRef, isInitialized, error } = useGestureDetection({ enabled });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed bottom-4 right-4 z-30
        bg-card/90 backdrop-blur-sm rounded-xl border border-border
        overflow-hidden shadow-lg
        ${collapsed ? 'w-12 h-12' : 'w-80'}
      `}
    >
      {collapsed ? (
        <button
          onClick={onToggle}
          className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Camera className="w-5 h-5" />
        </button>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Hand Detection
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              {onToggle && (
                <button
                  onClick={onToggle}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CameraOff className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Video preview */}
          <div className="relative aspect-[4/3] bg-background">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-0"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {!isInitialized && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Initializing camera...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center">
                  <CameraOff className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Status */}
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-y-1">
              <span>Only Right: Don (Red)</span>
              <span>Only Left: Kat (Blue)</span>
              <span>Both Hands: Boom (Black)</span>
              <span>No Hands: Air (White)</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
