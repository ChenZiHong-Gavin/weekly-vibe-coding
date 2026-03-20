import { chapter1 } from './chapter1';
import { chapter2 } from './chapter2';
import { chapter3 } from './chapter3';
import { chapter4 } from './chapter4';
import { chapter5 } from './chapter5';
import { chapter6 } from './chapter6';
import { chapter7 } from './chapter7';
import { chapter8 } from './chapter8';
import { chapter9 } from './chapter9';
import { chapter10 } from './chapter10';
import type { Chapter, Level } from '@/types';

export const CHAPTERS: Chapter[] = [
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  chapter10,
];

export function getAllLevels(): Level[] {
  return CHAPTERS.flatMap(ch => ch.levels);
}

export function getLevelById(id: string): Level | undefined {
  return getAllLevels().find(l => l.id === id);
}

export function getChapterById(id: number): Chapter | undefined {
  return CHAPTERS.find(ch => ch.id === id);
}
