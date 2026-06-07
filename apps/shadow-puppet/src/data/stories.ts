import { StoryDef } from '@/types/puppet';

export const stories: StoryDef[] = [
  {
    id: 'wusong',
    name: '武松打虎',
    description: '武松景阳冈醉酒打虎的故事',
    sceneId: 'mountain',
    puppetIds: ['warrior'],
    acts: [
      {
        subtitle: '话说武松来到景阳冈下，饮了十八碗酒……',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'enter', targetX: 0.2, targetY: 0.55, delay: 0, duration: 1500 },
          { puppetIndex: 0, type: 'move', targetX: 0.4, targetY: 0.55, delay: 1500, duration: 2000 },
        ],
      },
      {
        subtitle: '只见林中忽有一阵狂风，吹得落叶纷飞……',
        duration: 4000,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 80, lowerArmR: 40 }, delay: 0, duration: 1000 },
          { puppetIndex: 0, type: 'pose', jointAngles: { head: -15, upperArmL: -60 }, delay: 1500, duration: 1000 },
        ],
      },
      {
        subtitle: '武松大喝一声，挥拳便打！',
        duration: 4000,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 120, lowerArmR: 80, upperArmL: -90, lowerArmL: -60 }, delay: 0, duration: 500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 40, lowerArmR: 20 }, delay: 800, duration: 300 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 130, lowerArmR: 90 }, delay: 1500, duration: 300 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 30, lowerArmR: 10 }, delay: 2100, duration: 300 },
        ],
      },
      {
        subtitle: '连打数十拳，那猛虎终于倒下，武松自此名震天下！',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 150, lowerArmR: 100, head: 10 }, delay: 0, duration: 1000 },
          { puppetIndex: 0, type: 'move', targetX: 0.5, targetY: 0.5, delay: 1500, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 60, lowerArmR: 30, upperArmL: -60, lowerArmL: -30, head: 0 }, delay: 3000, duration: 1000 },
        ],
      },
    ],
  },
  {
    id: 'monkey-king',
    name: '大闹天宫',
    description: '孙悟空大闹天宫的故事',
    sceneId: 'palace',
    puppetIds: ['monkey'],
    acts: [
      {
        subtitle: '孙悟空手持金箍棒，踏上筋斗云，直奔天宫……',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'enter', targetX: 0.15, targetY: 0.4, delay: 0, duration: 1200 },
          { puppetIndex: 0, type: 'move', targetX: 0.4, targetY: 0.35, delay: 1200, duration: 2000 },
        ],
      },
      {
        subtitle: '天兵天将列阵迎战，悟空毫不畏惧！',
        duration: 4500,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 100, lowerArmR: 60, head: -20 }, delay: 0, duration: 800 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -120, lowerArmL: -80, upperArmR: 140, lowerArmR: 100 }, delay: 1200, duration: 600 },
        ],
      },
      {
        subtitle: '金箍棒一挥，天兵天将纷纷败退！',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 160, lowerArmR: 120, body: 15 }, delay: 0, duration: 400 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: -30, lowerArmR: -20, body: -15 }, delay: 600, duration: 400 },
          { puppetIndex: 0, type: 'move', targetX: 0.6, targetY: 0.35, delay: 1200, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 150, lowerArmR: 110, body: 10 }, delay: 2800, duration: 400 },
        ],
      },
      {
        subtitle: '齐天大圣，大闹天宫，好不威风！',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'move', targetX: 0.5, targetY: 0.3, delay: 0, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 130, lowerArmR: 80, upperArmL: -130, lowerArmL: -80, head: 0 }, delay: 1800, duration: 1000 },
        ],
      },
    ],
  },
  {
    id: 'beauty',
    name: '贵妃醉酒',
    description: '杨贵妃在百花亭饮酒赏花',
    sceneId: 'palace',
    puppetIds: ['maiden'],
    acts: [
      {
        subtitle: '百花亭中，杨贵妃独自饮酒……',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'enter', targetX: 0.5, targetY: 0.5, delay: 0, duration: 2000 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmR: 60, lowerArmR: 80, head: 10 }, delay: 2500, duration: 1500 },
        ],
      },
      {
        subtitle: '酒入愁肠，翩翩起舞……',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -100, lowerArmL: -60, upperArmR: 100, lowerArmR: 60, head: -15 }, delay: 0, duration: 1500 },
          { puppetIndex: 0, type: 'move', targetX: 0.4, targetY: 0.48, delay: 1500, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -140, lowerArmL: -90, upperArmR: 50, lowerArmR: 30, head: 15 }, delay: 3000, duration: 1200 },
        ],
      },
      {
        subtitle: '长袖善舞，如梦如幻……',
        duration: 5500,
        actions: [
          { puppetIndex: 0, type: 'move', targetX: 0.6, targetY: 0.45, delay: 0, duration: 2000 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -70, lowerArmL: -120, upperArmR: 130, lowerArmR: 100, head: -10 }, delay: 500, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -150, lowerArmL: -80, upperArmR: 70, lowerArmR: 40, head: 10 }, delay: 3000, duration: 1500 },
        ],
      },
      {
        subtitle: '月下独酌，花间起舞，美人如画……',
        duration: 5000,
        actions: [
          { puppetIndex: 0, type: 'move', targetX: 0.5, targetY: 0.5, delay: 0, duration: 1500 },
          { puppetIndex: 0, type: 'pose', jointAngles: { upperArmL: -110, lowerArmL: -70, upperArmR: 110, lowerArmR: 70, head: 0 }, delay: 2000, duration: 2000 },
        ],
      },
    ],
  },
];
