import { describe, expect, it } from 'vitest';
import { CELLS } from '../src/puzzle';
import { decodeState, loadState } from '../src/storage';

const validState = {
  marks: Array(CELLS.length).fill(0),
  strokes: [[{ x: 10, y: 20 }]],
  elapsed: 12,
  completed: false
};

describe('local state validation', () => {
  it('preserves every valid pencil stroke without an arbitrary cap', () => {
    const strokes = Array.from({ length: 1201 }, (_, index) => [{ x: index, y: index + 1 }]);
    const result = decodeState(JSON.stringify({ ...validState, strokes }));
    expect(result.repaired).toBe(false);
    expect(result.state.strokes).toHaveLength(1201);
  });

  it('drops malformed strokes while preserving valid marks', () => {
    const marks = [...validState.marks];
    marks[0] = 1;
    const result = decodeState(JSON.stringify({ ...validState, marks, strokes: ['bad'] }));
    expect(result.repaired).toBe(true);
    expect(result.state.marks[0]).toBe(1);
    expect(result.state.strokes).toEqual([]);
  });

  it.each([
    [[{ x: '10', y: 20 }]],
    [[{ x: Number.NaN, y: 20 }]],
    [[{ x: 10 }]],
    [{ x: 10, y: 20 }]
  ])('rejects invalid stroke and point shapes: %j', (strokes) => {
    expect(decodeState(JSON.stringify({ ...validState, strokes })).repaired).toBe(true);
  });

  it('recovers when browser storage cannot be read', () => {
    const result = loadState({ getItem: () => { throw new DOMException('denied'); } }, 'key');
    expect(result.unreadable).toBe(true);
    expect(result.state).toEqual(expect.objectContaining({ strokes: [], elapsed: 0, completed: false }));
  });
});
