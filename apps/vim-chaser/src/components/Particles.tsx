// ============================
// Particles — 浮动粒子背景
// ============================

import React, { useMemo } from 'react';

const PARTICLE_COUNT = 20;

const COLORS = [
  'rgba(0, 255, 159, 0.4)',
  'rgba(0, 245, 212, 0.3)',
  'rgba(58, 134, 255, 0.3)',
  'rgba(131, 56, 236, 0.2)',
  'rgba(255, 190, 11, 0.2)',
];

export const Particles: React.FC = () => {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 20,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })),
    []
  );

  return (
    <div className="particles-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
