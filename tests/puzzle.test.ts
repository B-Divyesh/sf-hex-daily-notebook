import { describe, expect, it } from 'vitest';
import {
  CELLS, TRACE_SIZE, addDays, candidatesFor, dateKey, generatePuzzle,
  isConnected, parseDateKey, popcount
} from '../src/puzzle';

describe('daily puzzle generator', () => {
  it('creates a deterministic, unique connected trace', () => {
    const first = generatePuzzle('2026-08-28');
    const again = generatePuzzle('2026-08-28');
    expect(CELLS).toHaveLength(19);
    expect(first.targetMask).toBe(again.targetMask);
    expect([...first.clues]).toEqual([...again.clues]);
    expect(popcount(first.targetMask)).toBe(TRACE_SIZE);
    expect(isConnected(first.targetMask)).toBe(true);
    expect(candidatesFor(first.clues)).toEqual([first.targetMask]);
  });

  it('keeps a sample month uniquely solvable', () => {
    for (let day = 1; day <= 31; day += 1) {
      const puzzle = generatePuzzle(`2026-07-${String(day).padStart(2, '0')}`);
      expect(puzzle.solutionCount).toBe(1);
    }
  });

  it('keeps every 2026 daily trace fresh and uniquely solvable', () => {
    const targets = new Set<number>();
    const signatures = new Set<string>();
    for (let date = new Date(2026, 0, 1); date.getFullYear() === 2026; date = addDays(date, 1)) {
      const puzzle = generatePuzzle(dateKey(date));
      const signature = `${puzzle.targetMask}:${JSON.stringify([...puzzle.clues].sort((a, b) => a[0] - b[0]))}`;
      targets.add(puzzle.targetMask);
      signatures.add(signature);
      expect(puzzle.solutionCount).toBe(1);
    }
    expect(targets.size).toBe(365);
    expect(signatures.size).toBe(365);
  });

  it('handles local calendar dates strictly', () => {
    expect(parseDateKey('2026-02-29')).toBeNull();
    expect(dateKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });
});
