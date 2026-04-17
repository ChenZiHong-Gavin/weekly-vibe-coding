export interface Bar {
  id: number;
  value: number;
  state: "default" | "comparing" | "beheaded" | "sorted" | "active";
  originalValue?: number;
}

export interface SortStep {
  array: Bar[];
  highlightLine: number;
  message: string;
  j: number;          // current scan pointer (right-to-left)
  comparing?: [number, number]; // indices being compared
  beheading?: number;           // index being "beheaded"
}

export type SortSpeed = "slow" | "normal" | "fast";

export const SPEED_MS: Record<SortSpeed, number> = {
  slow: 1200,
  normal: 600,
  fast: 200,
};

export const PSEUDOCODE_LINES = [
  `function louisXVISort(arr):`,
  `  n ← length(arr)`,
  `  for i ← n-1 down to 1:`,
  `    if arr[i-1] > arr[i]:`,
  `      // 砍头！让 arr[i-1] = arr[i]`,
  `      behead(arr[i-1], arr[i])`,
  `  return arr`,
];
