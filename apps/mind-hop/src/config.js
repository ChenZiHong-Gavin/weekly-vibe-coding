// ═══════════════════════════════════════════════════════════
//  全局调参表
// ═══════════════════════════════════════════════════════════

export const CITY = {
  blocks: 4,            // 4x4 街区
  blockSize: 48,        // m
  streetW: 15,          // 街道宽
  sidewalk: 3.4,        // 人行道宽（贴着建筑）
  minH: 14, maxH: 58,   // 建筑高度
};
CITY.span = CITY.blocks * CITY.blockSize + (CITY.blocks + 1) * CITY.streetW;
CITY.half = CITY.span / 2;

// ── 人群（Helbing social force，SI 单位）──
export const CROWD = {
  count: 320,
  mass: 80, tau: 0.5,
  vCalm: 1.30, vPanic: 3.4,
  A: 2000, B: 0.26, lambda: 0.35,
  kBody: 1.2e5, kappa: 2.4e5,
  aWall: 2400, bWall: 0.18,
  cutoff: 3.0,
  radius: [0.24, 0.32],
  panicRadius: 2.4, panicRate: 1.7,
  hostYield: 0.30, hostContact: 0.6, tauHost: 0.16,
  // 动画可读性：低于 walkAnimMin 就用待机（别播超慢走路），
  // 播走路时相位每秒至少走 phaseMin 圈（否则腿会定在半步上像冻住）。
  walkAnimMin: 0.55, phaseMin: 0.62,
  stuckSpeed: 0.45,     // 低于此速视为可能卡住，累计到阈值就重选目标
};

// ── 附身 ──
export const HOP = {
  range: 13.0,          // m —— 接近原作的 30 英尺，略放宽一点可玩性
  travelBase: 0.20,     // s 意识飞行
  travelPerM: 0.016,
  chainWindow: 1.6,     // s 内再跳 → 连锁（省链条）
  chainMax: 6,
  stumbleIn: 0.55,      // 进入时踉跄
  stumbleOut: 0.62,     // 脱离时踉跄
};

// ── 链条稳定度 / 暴露度 ──
// 盈亏平衡跳跃间隔 T(d) = perJump / (baseDecay + distDecay·d)
//   d=20m → 3.3s   d=60m → 1.8s   d=110m → 1.2s
export const LINK = {
  baseDecay: 3.0, distDecay: 0.085, perJump: 26,
  bodyRegen: 34,
};

export const EXPO = {
  max: 100,
  panicNearBody: 26,      // m 采样半径
  panicRate: 0.55,        // 每个惊慌者每秒
  snapback: 7,
  challenged: 14,         // 被守卫喝止
  detained: 26,           // 被制服
  alarm: 18,              // 警报拉响
  decay: 2.6,             // 无事时每秒回落
};

// ── 任务 ──
export const MISSION = {
  informants: 3,
  senseFar: 55,           // m 开始有心灵回响（给方向）
  senseNear: 13,          // m 回响清晰
  readTime: 1.6,          // s 读取记忆
  disturbCost: 8,         // 制造骚乱的链条代价
  disturbPull: 42,        // m 吸引守卫的半径
  disturbTime: 14,        // s 守卫被吸引的时长
  restrictedR: 22,        // m 设施禁区半径
};

// ── 目击：附身是"看得见"的 ──
// 宿主进入和脱离的瞬间眼神一空、猛地一个趔趄。旁人看到这一下要付代价，
// 于是"先制造骚乱把守卫引开、再挑一个落单的人跳"才成为真正的玩法 ——
// 没有这一层，喊叫解决的是一个不存在的问题（附身本来就零代价）。
export const WITNESS = {
  guardRange: 34,         // m 守卫能看出"这人不对"的距离
  // 怀疑度是 0~100 的量表（>45 喝止，=100 制服）。26 点意味着：
  // 当众跳进一个平民，看到的守卫会走过来盘查；跳进一名同僚 ×2.1 = 55 点，
  // 直接触发喝止 —— 所以"穿制服"这条捷径必须先把周围清空。
  guardSuspect: 26,       // 每个目击守卫的一次性怀疑跳升
  guardHostMul: 2.1,      // 被跳的是穿制服的同僚 → 事故等级更高
  civRange: 13,           // m 平民会侧目/惊退的距离
  // 实测 13m 内平民数中位 3、p90 5。1.3 的时候连跳 6 次要付 39 点暴露 ——
  // 那等于惩罚连锁跳跃本身，而连锁正是这个角色的招牌。降到 0.55：
  // 人群是掩护（暴露每秒回落 2.6，连跳基本被抵消），守卫才是真正的威胁。
  civExpo: 0.55,          // 每个目击平民累计的暴露度
  exitMul: 0.72,          // 脱离比进入轻一点（人是"醒过来"，不是"断线"）
};

// ── 移动 ──
// 默认是走，长按空格是跑。跑起来很显眼 —— 守卫看见跑动的人会起疑。
// 没有跳跃：琴是个普通人，这座城市也没有需要跳的地方。
export const MOVE = {
  walk: 2.4, run: 5.6,
  accel: 26,
  gravity: 22,
  hostWalk: 2.3, hostRun: 5.2,
  // 意识在外时对自己身体的残余控制：能挪，但像梦游一样慢。
  // 慢到"把身体搬远"依然昂贵，快到"挪进旁边的巷子"是可行的。
  drag: 1.15,
};

// ── DODC 守卫 ──
export const DODC = {
  count: 20,
  speed: 3.2,
  // 站岗不是"钉在原点"：来回踱步 + 偶尔换个站位。
  // 一个纹丝不动又离墙不到 1m 的人形，看起来就是"卡在墙里"。
  patrolRadius: 7.5,      // m 岗位周围的活动范围
  patrolPause: [1.2, 2.8],// s 到点后停留多久（别太长 —— 纯静止读作卡住）
  patrolSpeed: 1.15,
  idleShift: 0.34,        // m 停留时的重心挪动幅度（站着也不会一动不动）
  viewRange: 26, viewCone: 0.55,      // cos 半角
  suspectRate: 34,                    // 每秒累积的怀疑（正对且近时）
  suspectDecay: 16,
  detainRange: 2.6,
  investigateTime: 12,
};

export const RENDER = {
  pip: { w: 440, h: 275, margin: 26, cull: 30 },   // 画中画：本体监视窗（cull=窗内可见半径）
  cullDist: 78,          // m 超出此距离的人群不渲染（仿真照跑）
  cullDistGuard: 110,    // 守卫是任务目标，看得更远
  fov: 62, fovSprint: 70, fovHop: 78,
  shadowSize: 2048, shadowSpan: 80,
  crowdFrames: 26,      // 每个动画片段烘焙的帧数
};
