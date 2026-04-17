import type { Bar, SortStep } from "./types";

/**
 * Generate all steps for Louis XVI Sort.
 *
 * Algorithm: single pass from right to left.
 * If arr[i-1] > arr[i], "behead" arr[i-1] (set it equal to arr[i]).
 */
export function generateSteps(initial: Bar[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = initial.map((b) => ({ ...b, state: "default" as const }));
  const n = arr.length;

  // line 0: function declaration
  steps.push({
    array: arr.map((b) => ({ ...b })),
    highlightLine: 0,
    message: "开始路易十六排序 👑",
    j: -1,
  });

  // line 1: n ← length(arr)
  steps.push({
    array: arr.map((b) => ({ ...b })),
    highlightLine: 1,
    message: `数组长度 n = ${n}`,
    j: -1,
  });

  for (let i = n - 1; i >= 1; i--) {
    // line 2: for i
    const arrSnap1 = arr.map((b, idx) => ({
      ...b,
      state: idx === i || idx === i - 1 ? ("active" as const) : ("default" as const),
    }));
    steps.push({
      array: arrSnap1,
      highlightLine: 2,
      message: `遍历: i = ${i}`,
      j: i,
    });

    // line 3: compare
    const arrSnap2 = arr.map((b, idx) => ({
      ...b,
      state:
        idx === i - 1 || idx === i
          ? ("comparing" as const)
          : ("default" as const),
    }));
    steps.push({
      array: arrSnap2,
      highlightLine: 3,
      message: `比较: arr[${i - 1}]=${arr[i - 1].value} > arr[${i}]=${arr[i].value} ?`,
      j: i,
      comparing: [i - 1, i],
    });

    if (arr[i - 1].value > arr[i].value) {
      // line 4-5: behead
      const oldVal = arr[i - 1].value;
      arr[i - 1].value = arr[i].value;
      arr[i - 1].originalValue = oldVal;

      const arrSnap3 = arr.map((b, idx) => ({
        ...b,
        state: idx === i - 1 ? ("beheaded" as const) : ("default" as const),
      }));
      steps.push({
        array: arrSnap3,
        highlightLine: 5,
        message: `⚔️ 砍头！arr[${i - 1}]: ${oldVal} → ${arr[i].value}`,
        j: i,
        beheading: i - 1,
      });
    } else {
      // no beheading needed — show it passed
      steps.push({
        array: arr.map((b) => ({ ...b, state: "default" as const })),
        highlightLine: 3,
        message: `arr[${i - 1}]=${arr[i - 1].value} ≤ arr[${i}]=${arr[i].value}，安全通过`,
        j: i,
      });
    }
  }

  // Done - line 6: return
  steps.push({
    array: arr.map((b) => ({ ...b, state: "sorted" as const })),
    highlightLine: 6,
    message: "✅ 排序完成！所有头颅已就位 👑",
    j: -1,
  });

  return steps;
}

export function generateRandomArray(size: number): Bar[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    value: Math.floor(Math.random() * 90) + 10,
    state: "default" as const,
  }));
}
