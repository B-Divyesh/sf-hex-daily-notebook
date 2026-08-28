import { CELLS } from './puzzle';

export type Point = { x: number; y: number };
export type SavedState = {
  marks: number[];
  strokes: Point[][];
  elapsed: number;
  completed: boolean;
};

export type LoadResult = {
  state: SavedState;
  repaired: boolean;
  unreadable: boolean;
};

export function freshState(): SavedState {
  return { marks: Array(CELLS.length).fill(0), strokes: [], elapsed: 0, completed: false };
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const point = value as Record<string, unknown>;
  return typeof point.x === 'number' && Number.isFinite(point.x)
    && typeof point.y === 'number' && Number.isFinite(point.y);
}

/** Decode untrusted browser data without letting one damaged field break play. */
export function decodeState(raw: string | null): LoadResult {
  if (raw === null) return { state: freshState(), repaired: false, unreadable: false };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { state: freshState(), repaired: true, unreadable: false };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { state: freshState(), repaired: true, unreadable: false };
  }

  const parsed = value as Record<string, unknown>;
  const validMarks = Array.isArray(parsed.marks)
    && parsed.marks.length === CELLS.length
    && parsed.marks.every((mark) => mark === 0 || mark === 1 || mark === 2);
  const validStrokes = Array.isArray(parsed.strokes)
    && parsed.strokes.every((stroke) => Array.isArray(stroke) && stroke.every(isPoint));
  const validElapsed = typeof parsed.elapsed === 'number'
    && Number.isFinite(parsed.elapsed)
    && parsed.elapsed >= 0;
  const validCompleted = typeof parsed.completed === 'boolean';

  return {
    state: {
      marks: validMarks ? [...parsed.marks as number[]] : freshState().marks,
      strokes: validStrokes
        ? (parsed.strokes as Point[][]).map((stroke) => stroke.map(({ x, y }) => ({ x, y })))
        : [],
      elapsed: validElapsed ? Math.floor(parsed.elapsed as number) : 0,
      completed: validCompleted ? parsed.completed as boolean : false
    },
    repaired: !(validMarks && validStrokes && validElapsed && validCompleted),
    unreadable: false
  };
}

export function loadState(storage: Pick<Storage, 'getItem'>, key: string): LoadResult {
  try {
    return decodeState(storage.getItem(key));
  } catch {
    return { state: freshState(), repaired: false, unreadable: true };
  }
}
