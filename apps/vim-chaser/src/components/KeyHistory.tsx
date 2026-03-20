// ============================
// KeyHistory — 按键历史条
// ============================

import React from 'react';

interface KeyHistoryProps {
  commands: string[];
  maxShow?: number;
}

export const KeyHistory: React.FC<KeyHistoryProps> = ({ commands, maxShow = 12 }) => {
  const visible = commands.slice(-maxShow);

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <span className="text-terminal-dim text-xs mr-1 flex-shrink-0">Keys:</span>
      {visible.map((cmd, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-terminal-dim/40 text-xs">›</span>}
          <kbd className={`
            px-1.5 py-0.5 rounded text-xs font-mono
            ${i === visible.length - 1
              ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30'
              : 'bg-terminal-surface text-terminal-dim border border-terminal-border'
            }
          `}>
            {cmd}
          </kbd>
        </span>
      ))}
      {commands.length === 0 && (
        <span className="text-terminal-dim/50 text-xs italic">waiting for input...</span>
      )}
    </div>
  );
};
