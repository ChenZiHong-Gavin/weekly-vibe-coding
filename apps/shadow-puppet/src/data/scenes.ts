import { SceneDef } from '@/types/puppet';

export const scenes: SceneDef[] = [
  {
    id: 'palace',
    name: '金殿',
    description: '巍峨的宫殿，金碧辉煌',
    bgColor: '#D4A574',
    ambientColor: '#FFD700',
    elements: [
      {
        type: 'pagoda', x: 0.5, y: 0.15, scale: 1.2, opacity: 0.7,
        path: 'M-60,-80 L-50,-60 L-70,-60 L-55,-40 L-75,-40 L-40,0 L40,0 L75,-40 L55,-40 L70,-60 L50,-60 L60,-80 Z',
      },
      {
        type: 'cloud', x: 0.15, y: 0.12, scale: 0.8, opacity: 0.3,
        path: 'M-30,0 C-35,-15 -15,-25 0,-20 C10,-30 30,-20 25,-10 C35,-5 30,5 20,5 C15,10 -10,10 -20,5 C-30,8 -35,5 -30,0 Z',
      },
      {
        type: 'cloud', x: 0.82, y: 0.08, scale: 0.6, opacity: 0.25,
        path: 'M-30,0 C-35,-15 -15,-25 0,-20 C10,-30 30,-20 25,-10 C35,-5 30,5 20,5 C15,10 -10,10 -20,5 C-30,8 -35,5 -30,0 Z',
      },
      {
        type: 'building', x: 0.12, y: 0.65, scale: 0.5, opacity: 0.4,
        path: 'M-25,-30 L-30,-15 L30,-15 L25,-30 Z M-20,-15 L-20,20 L20,20 L20,-15 Z',
      },
      {
        type: 'building', x: 0.88, y: 0.65, scale: 0.5, opacity: 0.4,
        path: 'M-25,-30 L-30,-15 L30,-15 L25,-30 Z M-20,-15 L-20,20 L20,20 L20,-15 Z',
      },
    ],
  },
  {
    id: 'mountain',
    name: '山水',
    description: '层峦叠嶂，云雾缭绕',
    bgColor: '#C4B896',
    ambientColor: '#E8DCC8',
    elements: [
      {
        type: 'mountain', x: 0.2, y: 0.55, scale: 1.5, opacity: 0.5,
        path: 'M-80,60 L-40,-30 L-20,-10 L0,-50 L20,-20 L40,-40 L80,60 Z',
      },
      {
        type: 'mountain', x: 0.75, y: 0.5, scale: 1.2, opacity: 0.4,
        path: 'M-60,50 L-20,-40 L0,-20 L30,-45 L60,50 Z',
      },
      {
        type: 'mountain', x: 0.5, y: 0.65, scale: 1.8, opacity: 0.6,
        path: 'M-100,40 L-50,-20 L-20,0 L0,-35 L25,-5 L60,-25 L100,40 Z',
      },
      {
        type: 'cloud', x: 0.3, y: 0.2, scale: 1.0, opacity: 0.3,
        path: 'M-30,0 C-35,-15 -15,-25 0,-20 C10,-30 30,-20 25,-10 C35,-5 30,5 20,5 C15,10 -10,10 -20,5 C-30,8 -35,5 -30,0 Z',
      },
      {
        type: 'cloud', x: 0.7, y: 0.15, scale: 0.7, opacity: 0.25,
        path: 'M-30,0 C-35,-15 -15,-25 0,-20 C10,-30 30,-20 25,-10 C35,-5 30,5 20,5 C15,10 -10,10 -20,5 C-30,8 -35,5 -30,0 Z',
      },
      {
        type: 'tree', x: 0.1, y: 0.7, scale: 0.6, opacity: 0.5,
        path: 'M0,30 L0,-10 M-15,-5 C-10,-20 10,-20 15,-5 M-10,-15 C-5,-28 5,-28 10,-15',
      },
      {
        type: 'moon', x: 0.85, y: 0.1, scale: 1.0, opacity: 0.35,
      },
    ],
  },
  {
    id: 'village',
    name: '古镇',
    description: '小桥流水，白墙青瓦',
    bgColor: '#D8CCBA',
    ambientColor: '#F0E6D4',
    elements: [
      {
        type: 'bridge', x: 0.5, y: 0.78, scale: 1.2, opacity: 0.55,
        path: 'M-60,15 C-30,-15 30,-15 60,15 M-50,15 C-25,-8 25,-8 50,15 M-60,15 L-60,25 M60,15 L60,25 M-60,25 L60,25',
      },
      {
        type: 'building', x: 0.15, y: 0.45, scale: 0.7, opacity: 0.5,
        path: 'M-20,-25 L-25,-10 L25,-10 L20,-25 Z M-18,-10 L-18,15 L18,15 L18,-10 Z M-5,0 L-5,15 L5,15 L5,0 Z',
      },
      {
        type: 'building', x: 0.85, y: 0.42, scale: 0.65, opacity: 0.45,
        path: 'M-18,-30 L-22,-12 L22,-12 L18,-30 Z M-16,-12 L-16,18 L16,18 L16,-12 Z',
      },
      {
        type: 'tree', x: 0.35, y: 0.55, scale: 0.8, opacity: 0.45,
        path: 'M0,30 L0,-5 M-20,0 C-15,-25 15,-25 20,0 M-12,-15 C-8,-30 8,-30 12,-15',
      },
      {
        type: 'wave', x: 0.5, y: 0.88, scale: 2.0, opacity: 0.3,
        path: 'M-100,0 Q-75,-10 -50,0 Q-25,10 0,0 Q25,-10 50,0 Q75,10 100,0',
      },
      {
        type: 'cloud', x: 0.6, y: 0.1, scale: 0.5, opacity: 0.2,
        path: 'M-30,0 C-35,-15 -15,-25 0,-20 C10,-30 30,-20 25,-10 C35,-5 30,5 20,5 C15,10 -10,10 -20,5 C-30,8 -35,5 -30,0 Z',
      },
    ],
  },
  {
    id: 'battlefield',
    name: '沙场',
    description: '旌旗猎猎，鼓角争鸣',
    bgColor: '#BFA882',
    ambientColor: '#E8C496',
    elements: [
      {
        type: 'mountain', x: 0.3, y: 0.35, scale: 1.8, opacity: 0.35,
        path: 'M-80,50 L-30,-30 L0,-5 L30,-40 L80,50 Z',
      },
      {
        type: 'mountain', x: 0.7, y: 0.4, scale: 1.4, opacity: 0.3,
        path: 'M-60,40 L-15,-25 L15,-35 L60,40 Z',
      },
      {
        type: 'building', x: 0.1, y: 0.5, scale: 0.4, opacity: 0.5,
        path: 'M0,-50 L-3,-10 L3,-10 Z M-8,-10 L-8,10 L-2,10 L-2,-10 Z',
      },
      {
        type: 'building', x: 0.18, y: 0.48, scale: 0.35, opacity: 0.45,
        path: 'M0,-45 L-3,-10 L3,-10 Z M-7,-10 L-7,8 L-1,8 L-1,-10 Z',
      },
      {
        type: 'building', x: 0.9, y: 0.5, scale: 0.4, opacity: 0.5,
        path: 'M0,-50 L-3,-10 L3,-10 Z M-8,-10 L-8,10 L-2,10 L-2,-10 Z',
      },
      {
        type: 'cloud', x: 0.5, y: 0.12, scale: 1.2, opacity: 0.25,
        path: 'M-40,0 C-45,-18 -20,-30 0,-22 C15,-35 40,-25 35,-10 C45,-5 40,8 25,8 C18,14 -12,14 -25,8 C-38,10 -45,5 -40,0 Z',
      },
    ],
  },
];
