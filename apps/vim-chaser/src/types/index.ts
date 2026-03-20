// ============================
// Vim Chaser — Core Types
// ============================

/** Vim 模式 */
export type VimMode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'visual-block' | 'command' | 'replace';

/** 光标位置 */
export interface Cursor {
  line: number;
  col: number;
}

/** 编辑器状态 */
export interface EditorState {
  lines: string[];
  cursor: Cursor;
  mode: VimMode;
  // 命令缓冲区（如 d 等待 motion）
  pendingOperator: string;
  // 数字前缀
  count: number;
  // 可视模式起点
  visualStart: Cursor | null;
  // 搜索
  searchPattern: string;
  searchDirection: 'forward' | 'backward';
  // 寄存器
  registers: Record<string, string[]>;
  defaultRegister: string[];
  // 撤销/重做
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  // 命令行
  commandBuffer: string;
  // 状态消息
  message: string;
  // 上次 f/F/t/T 的参数，用于 ; 和 ,
  lastFind: { type: 'f' | 'F' | 't' | 'T'; char: string } | null;
  // 标记
  marks: Record<string, Cursor>;
  // 上次执行的完整编辑命令，用于 . 重复
  lastEdit: string[];
  // 跳转列表
  jumpList: Cursor[];
  jumpIdx: number;
  // 宏录制
  macroReg: string;
  macroBuffer: string[];
  isRecording: boolean;
  macros: Record<string, string[]>;
}

/** 用于撤销栈的快照 */
export interface EditorSnapshot {
  lines: string[];
  cursor: Cursor;
}

/** Vim 引擎处理按键后的返回结果 */
export interface KeyResult {
  newState: EditorState;
  /** 本次按键实际执行的命令描述（用于 UI 显示） */
  executedCommand: string | null;
  /** 按键是否产生了有效操作 */
  valid: boolean;
  /** 是否完成了一次编辑操作（用于 . 重复记录） */
  isEdit: boolean;
}

// ============================
// 游戏相关类型
// ============================

/** 关卡目标类型 */
export type GoalType =
  | 'cursor'      // 光标到达指定位置
  | 'text'        // 某行内容匹配
  | 'lines'       // 整个文件内容匹配
  | 'mode'        // 处于指定模式
  | 'custom';     // 自定义验证

/** 单个关卡目标 */
export interface Goal {
  type: GoalType;
  /** cursor 类型：目标位置 */
  position?: Cursor;
  /** text 类型：行号 + 期望内容 */
  lineIndex?: number;
  expectedText?: string;
  /** lines 类型：期望的全部内容 */
  expectedLines?: string[];
  /** mode 类型 */
  expectedMode?: VimMode;
  /** custom 类型 */
  validate?: (state: EditorState) => boolean;
  /** 目标描述（给 UI 显示） */
  description: string;
}

/** 关卡中引入的新命令 */
export interface NewCommand {
  keys: string;
  name: string;
  description: string;
}

/** 单个关卡定义 */
export interface Level {
  id: string;
  chapter: number;
  index: number;
  title: string;
  subtitle: string;
  /** 故事/场景描述 */
  story: string;
  /** 任务描述 */
  task: string;
  /** 初始代码 */
  initialCode: string[];
  /** 初始光标 */
  initialCursor: Cursor;
  /** 初始模式 */
  initialMode?: VimMode;
  /** 目标列表（全部达成则过关） */
  goals: Goal[];
  /** 本关引入的新命令 */
  newCommands: NewCommand[];
  /** 提示文本 */
  hints: string[];
  /** 三星标准：[一星最大步数, 二星最大步数, 三星最大步数] */
  starThresholds: [number, number, number];
  /** 该关卡允许的命令白名单（null = 不限制） */
  allowedKeys?: string[] | null;
}

/** 章节定义 */
export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  levels: Level[];
}

// ============================
// 极速模式类型
// ============================

/** 极速模式的目标 */
export interface SpeedTarget {
  /** 目标位置（需要光标到达） */
  position: Cursor;
  /** 目标在代码中高亮的文字 */
  label: string;
  /** 最优解步数（用于 PERFECT 判定） */
  optimalMoves: number;
}

/** 极速模式状态 */
export interface SpeedRunState {
  score: number;
  combo: number;
  maxCombo: number;
  timeLeft: number;
  totalMoves: number;
  targetsHit: number;
  level: number;
  isOnFire: boolean;
  currentTarget: SpeedTarget | null;
  isPaused: boolean;
}

// ============================
// 进度 & 统计
// ============================

/** 单关完成记录 */
export interface LevelResult {
  levelId: string;
  stars: number;
  moves: number;
  timeMs: number;
  completedAt: number;
}

/** 玩家进度 */
export interface PlayerProgress {
  /** 各关最佳记录 */
  levelResults: Record<string, LevelResult>;
  /** 极速模式最高分（按等级） */
  speedRunHighScores: Record<number, number>;
  /** 总按键次数 */
  totalKeystrokes: number;
  /** 各命令使用次数 */
  commandUsage: Record<string, number>;
  /** 最高解锁章节 */
  unlockedChapter: number;
  /** XP */
  xp: number;
}

/** 称号 */
export const TITLES = [
  { xp: 0, title: 'Vim Newbie', emoji: '🐣' },
  { xp: 100, title: 'Vim Novice', emoji: '🌱' },
  { xp: 500, title: 'Vim Apprentice', emoji: '⚔️' },
  { xp: 1500, title: 'Vim Warrior', emoji: '🔥' },
  { xp: 4000, title: 'Vim Master', emoji: '🏆' },
  { xp: 10000, title: 'Vim God', emoji: '👑' },
] as const;
