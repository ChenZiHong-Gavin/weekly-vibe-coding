import { PuppetDef } from '@/types/puppet';

export const puppets: PuppetDef[] = [
  {
    id: 'warrior',
    name: '武生',
    description: '英武将军，威风凛凛',
    color: '#B22222',
    width: 284,
    height: 564,
    imagePath: '/puppets/warrior.png',
    joints: [
      { id: 'body', name: '躯干', x: 142, y: 320, parentId: null, angle: 0, length: 0, minAngle: -18, maxAngle: 18, damping: 0.88 },
      { id: 'head', name: '头部', x: 142, y: 180, parentId: 'body', angle: 0, length: 140, minAngle: -35, maxAngle: 35, damping: 0.82 },
      { id: 'upperArmL', name: '左臂', x: 95, y: 210, parentId: 'body', angle: 0, length: 70, minAngle: -130, maxAngle: 130, damping: 0.62 },
      { id: 'upperArmR', name: '右臂', x: 175, y: 210, parentId: 'body', angle: 0, length: 70, minAngle: -130, maxAngle: 130, damping: 0.62 },
    ],
    imageParts: [
      // Back arm (right, behind body)
      { id: 'armR', jointId: 'upperArmR', crop: { x: 0.47, y: 0.28, w: 0.50, h: 0.27 }, pivot: { x: 0.12, y: 0.14 }, zIndex: -1 },
      // Body (torso + legs)
      { id: 'body', jointId: 'body', crop: { x: 0.14, y: 0.30, w: 0.75, h: 0.70 }, pivot: { x: 0.50, y: 0.04 }, zIndex: 0 },
      // Front arm (left, with weapon)
      { id: 'armL', jointId: 'upperArmL', crop: { x: 0.0, y: 0.28, w: 0.52, h: 0.30 }, pivot: { x: 0.85, y: 0.10 }, zIndex: 1 },
      // Head (with tall headdress)
      { id: 'head', jointId: 'head', crop: { x: 0.15, y: 0.0, w: 0.80, h: 0.37 }, pivot: { x: 0.45, y: 0.95 }, zIndex: 2 },
    ],
    drawCommands: [],
  },
  {
    id: 'maiden',
    name: '花旦',
    description: '窈窕佳人，长袖善舞',
    color: '#C71585',
    width: 255,
    height: 411,
    imagePath: '/puppets/maiden.png',
    joints: [
      { id: 'body', name: '躯干', x: 128, y: 230, parentId: null, angle: 0, length: 0, minAngle: -15, maxAngle: 15, damping: 0.88 },
      { id: 'head', name: '头部', x: 128, y: 120, parentId: 'body', angle: 0, length: 110, minAngle: -35, maxAngle: 35, damping: 0.80 },
      { id: 'upperArmL', name: '左臂', x: 75, y: 155, parentId: 'body', angle: 0, length: 65, minAngle: -130, maxAngle: 130, damping: 0.58 },
      { id: 'upperArmR', name: '右臂', x: 175, y: 150, parentId: 'body', angle: 0, length: 65, minAngle: -130, maxAngle: 130, damping: 0.58 },
    ],
    imageParts: [
      // Left arm (wide sleeve going left)
      { id: 'armL', jointId: 'upperArmL', crop: { x: 0.0, y: 0.24, w: 0.45, h: 0.44 }, pivot: { x: 0.85, y: 0.08 }, zIndex: -1 },
      // Body (torso + legs)
      { id: 'body', jointId: 'body', crop: { x: 0.12, y: 0.27, w: 0.76, h: 0.73 }, pivot: { x: 0.48, y: 0.03 }, zIndex: 0 },
      // Right arm (wide sleeve going right)
      { id: 'armR', jointId: 'upperArmR', crop: { x: 0.52, y: 0.22, w: 0.48, h: 0.42 }, pivot: { x: 0.15, y: 0.12 }, zIndex: 1 },
      // Head (elaborate headdress)
      { id: 'head', jointId: 'head', crop: { x: 0.08, y: 0.0, w: 0.82, h: 0.34 }, pivot: { x: 0.52, y: 0.93 }, zIndex: 2 },
    ],
    drawCommands: [],
  },
  {
    id: 'monkey',
    name: '孙悟空',
    description: '齐天大圣，神通广大',
    color: '#DAA520',
    width: 500,
    height: 777,
    imagePath: '/puppets/monkey.png',
    joints: [
      { id: 'body', name: '躯干', x: 250, y: 450, parentId: null, angle: 0, length: 0, minAngle: -20, maxAngle: 20, damping: 0.82 },
      { id: 'head', name: '头部', x: 250, y: 280, parentId: 'body', angle: 0, length: 170, minAngle: -35, maxAngle: 35, damping: 0.75 },
      { id: 'upperArmL', name: '左臂', x: 155, y: 370, parentId: 'body', angle: 0, length: 80, minAngle: -130, maxAngle: 130, damping: 0.58 },
      { id: 'upperArmR', name: '右臂', x: 340, y: 360, parentId: 'body', angle: 0, length: 80, minAngle: -130, maxAngle: 130, damping: 0.58 },
    ],
    imageParts: [
      // Back arm (left, behind body)
      { id: 'armL', jointId: 'upperArmL', crop: { x: 0.06, y: 0.38, w: 0.38, h: 0.28 }, pivot: { x: 0.80, y: 0.10 }, zIndex: -1 },
      // Body (torso + legs)
      { id: 'body', jointId: 'body', crop: { x: 0.16, y: 0.40, w: 0.64, h: 0.60 }, pivot: { x: 0.50, y: 0.04 }, zIndex: 0 },
      // Front arm (right, with decorations)
      { id: 'armR', jointId: 'upperArmR', crop: { x: 0.50, y: 0.35, w: 0.44, h: 0.30 }, pivot: { x: 0.18, y: 0.15 }, zIndex: 1 },
      // Head (with crescent weapon headpiece)
      { id: 'head', jointId: 'head', crop: { x: 0.15, y: 0.0, w: 0.70, h: 0.46 }, pivot: { x: 0.50, y: 0.95 }, zIndex: 2 },
    ],
    drawCommands: [],
  },
  {
    id: 'dragon',
    name: '神龙',
    description: '东方神龙，腾云驾雾',
    color: '#228B22',
    width: 400,
    height: 600,
    imagePath: '/puppets/dragon.png',
    joints: [
      { id: 'body', name: '龙身', x: 200, y: 300, parentId: null, angle: 0, length: 0, minAngle: -15, maxAngle: 15, damping: 0.85 },
      { id: 'head', name: '龙头', x: 280, y: 130, parentId: 'body', angle: 0, length: 180, minAngle: -50, maxAngle: 50, damping: 0.68 },
      { id: 'bodyMid', name: '龙腰', x: 170, y: 420, parentId: 'body', angle: 0, length: 120, minAngle: -40, maxAngle: 40, damping: 0.72 },
      { id: 'tail', name: '龙尾', x: 160, y: 530, parentId: 'bodyMid', angle: 0, length: 110, minAngle: -60, maxAngle: 60, damping: 0.58 },
    ],
    imageParts: [
      // Tail section (bottom)
      { id: 'tail', jointId: 'tail', crop: { x: 0.08, y: 0.65, w: 0.70, h: 0.33 }, pivot: { x: 0.50, y: 0.10 }, zIndex: -1 },
      // Mid body
      { id: 'bodyMid', jointId: 'bodyMid', crop: { x: 0.05, y: 0.38, w: 0.80, h: 0.35 }, pivot: { x: 0.50, y: 0.15 }, zIndex: 0 },
      // Main body (upper)
      { id: 'body', jointId: 'body', crop: { x: 0.08, y: 0.18, w: 0.85, h: 0.32 }, pivot: { x: 0.50, y: 0.50 }, zIndex: 1 },
      // Head (with whiskers, horns)
      { id: 'head', jointId: 'head', crop: { x: 0.35, y: 0.02, w: 0.60, h: 0.30 }, pivot: { x: 0.30, y: 0.90 }, zIndex: 2 },
    ],
    drawCommands: [],
  },
  {
    id: 'scholar',
    name: '老生',
    description: '儒雅长者，手持折扇',
    color: '#2F4F4F',
    width: 400,
    height: 600,
    imagePath: '/puppets/scholar.png',
    joints: [
      { id: 'body', name: '躯干', x: 200, y: 310, parentId: null, angle: 0, length: 0, minAngle: -12, maxAngle: 12, damping: 0.88 },
      { id: 'head', name: '头部', x: 200, y: 175, parentId: 'body', angle: 0, length: 135, minAngle: -30, maxAngle: 30, damping: 0.82 },
      { id: 'upperArmL', name: '左臂', x: 120, y: 230, parentId: 'body', angle: 0, length: 75, minAngle: -130, maxAngle: 130, damping: 0.62 },
      { id: 'upperArmR', name: '右臂', x: 270, y: 230, parentId: 'body', angle: 0, length: 75, minAngle: -130, maxAngle: 130, damping: 0.62 },
    ],
    imageParts: [
      // Left arm (wide sleeve, going left in image)
      { id: 'armL', jointId: 'upperArmL', crop: { x: 0.05, y: 0.28, w: 0.40, h: 0.35 }, pivot: { x: 0.88, y: 0.08 }, zIndex: -1 },
      // Body (torso + robe + legs)
      { id: 'body', jointId: 'body', crop: { x: 0.17, y: 0.27, w: 0.66, h: 0.72 }, pivot: { x: 0.50, y: 0.04 }, zIndex: 0 },
      // Right arm (wide sleeve, going right)
      { id: 'armR', jointId: 'upperArmR', crop: { x: 0.50, y: 0.27, w: 0.42, h: 0.37 }, pivot: { x: 0.14, y: 0.09 }, zIndex: 1 },
      // Head (with scholar hat)
      { id: 'head', jointId: 'head', crop: { x: 0.27, y: 0.02, w: 0.48, h: 0.32 }, pivot: { x: 0.47, y: 0.94 }, zIndex: 2 },
    ],
    drawCommands: [],
  },
];
