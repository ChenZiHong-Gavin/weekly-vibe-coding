import { useTheaterStore } from '@/store/theaterStore';
import { puppets } from '@/data/puppets';
import { PuppetEngine } from '@/core/PuppetEngine';
import { SoundManager } from '@/core/SoundManager';
import { useRef } from 'react';
import { X } from 'lucide-react';

interface PuppetSelectorProps {
  soundManager: SoundManager | null;
}

export default function PuppetSelector({ soundManager }: PuppetSelectorProps) {
  const { addPuppet, puppetStates, removePuppet, sfxEnabled, activePuppetIndex, setActivePuppetIndex } = useTheaterStore();
  const engineRef = useRef(new PuppetEngine());

  const MAX_PUPPETS = 5;

  const handleSelect = (puppetId: string) => {
    const def = puppets.find(p => p.id === puppetId);
    if (!def) return;

    const existingIdx = puppetStates.findIndex(ps => ps.puppetId === puppetId);

    if (existingIdx >= 0) {
      // Puppet already on stage — switch to it as active
      setActivePuppetIndex(existingIdx);
      return;
    }

    if (puppetStates.length >= MAX_PUPPETS) return;

    const col = puppetStates.length % 3;
    const row = Math.floor(puppetStates.length / 3);
    const x = 250 + col * 300;
    const y = 300 + row * 200;

    const state = engineRef.current.createPuppetState(def, x, y, 0.8);
    addPuppet(state);
    // Auto-activate newly added puppet
    setActivePuppetIndex(puppetStates.length);

    if (sfxEnabled && soundManager) {
      soundManager.playWoodblock();
    }
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    removePuppet(index);
  };

  return (
    <div className="space-y-3">
      <h3 className="theater-title text-lg">选择角色</h3>
      <div className="grid grid-cols-1 gap-2">
        {puppets.map((puppet) => {
          const onStageIdx = puppetStates.findIndex(ps => ps.puppetId === puppet.id);
          const isOnStage = onStageIdx >= 0;
          const isActive = isOnStage && onStageIdx === activePuppetIndex;

          return (
            <button
              key={puppet.id}
              onClick={() => handleSelect(puppet.id)}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all text-left relative
                ${isActive
                  ? 'gold-border bg-[hsl(25_35%_14%)] ring-1 ring-[hsl(var(--gold)/0.4)]'
                  : isOnStage
                    ? 'border border-[hsl(var(--gold)/0.25)] bg-[hsl(25_35%_10%/0.6)]'
                    : 'border border-[hsl(25_25%_18%)] bg-[hsl(25_35%_10%/0.5)] hover:border-[hsl(var(--gold)/0.3)]'
                }
              `}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg overflow-hidden shrink-0"
                style={{
                  background: isOnStage
                    ? `linear-gradient(135deg, ${puppet.color}, ${puppet.color}88)`
                    : 'hsl(25 20% 15%)',
                  boxShadow: isActive ? `0 0 14px ${puppet.color}60` : isOnStage ? `0 0 8px ${puppet.color}30` : 'none',
                }}
              >
                {puppet.imagePath ? (
                  <img
                    src={puppet.imagePath}
                    alt={puppet.name}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  puppet.name[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-song text-sm" style={{ color: isActive ? 'hsl(var(--gold))' : isOnStage ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                  {puppet.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {isActive ? '当前操控' : isOnStage ? '点击切换操控' : puppet.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-glow-pulse" />
              )}
              {isOnStage && (
                <div
                  onClick={(e) => handleRemove(e, onStageIdx)}
                  className="w-5 h-5 rounded-full bg-[hsl(25_15%_12%)] border border-[hsl(var(--gold)/0.15)] flex items-center justify-center hover:border-[hsl(var(--vermilion)/0.5)] hover:bg-[hsl(var(--vermilion)/0.1)] transition-all shrink-0"
                  title="移除角色"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
