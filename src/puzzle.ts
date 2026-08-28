export type Hex = { q: number; r: number };
export type Puzzle = {
  date: string;
  cells: Hex[];
  targetMask: number;
  clues: Map<number, number>;
  solutionCount: number;
};

export const TRACE_SIZE = 7;
export const CELLS: Hex[] = [];
for (let r = -2; r <= 2; r += 1) {
  for (let q = -2; q <= 2; q += 1) {
    if (Math.abs(q + r) <= 2) CELLS.push({ q, r });
  }
}

const INDEX = new Map(CELLS.map((cell, index) => [`${cell.q},${cell.r}`, index]));
export const NEIGHBORS = CELLS.map(({ q, r }) =>
  [
    [q + 1, r], [q - 1, r], [q, r + 1],
    [q, r - 1], [q + 1, r - 1], [q - 1, r + 1]
  ].map(([nq, nr]) => INDEX.get(`${nq},${nr}`)).filter((n): n is number => n !== undefined)
);

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function hash(value: string): number {
  let state = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    state ^= value.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function random(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function countNeighbors(mask: number, index: number): number {
  return NEIGHBORS[index].reduce((sum, neighbor) => sum + ((mask >>> neighbor) & 1), 0);
}

export function isConnected(mask: number): boolean {
  if (!mask) return false;
  const first = Math.clz32(mask & -mask) ^ 31;
  let visited = 0;
  const queue = [first];
  while (queue.length) {
    const current = queue.pop()!;
    const bit = 1 << current;
    if (visited & bit) continue;
    visited |= bit;
    for (const neighbor of NEIGHBORS[current]) {
      if ((mask & (1 << neighbor)) && !(visited & (1 << neighbor))) queue.push(neighbor);
    }
  }
  return visited === mask;
}

let connectedMasks: number[] | undefined;
export function allConnectedMasks(): number[] {
  if (connectedMasks) return connectedMasks;
  const masks: number[] = [];
  const choose = (start: number, remaining: number, mask: number) => {
    if (remaining === 0) {
      if (isConnected(mask)) masks.push(mask);
      return;
    }
    for (let index = start; index <= CELLS.length - remaining; index += 1) {
      choose(index + 1, remaining - 1, mask | (1 << index));
    }
  };
  choose(0, TRACE_SIZE, 0);
  connectedMasks = masks;
  return masks;
}

function makeTarget(seed: number): number {
  const rng = random(seed);
  let mask = 1 << Math.floor(rng() * CELLS.length);
  while (popcount(mask) < TRACE_SIZE) {
    const frontier = new Set<number>();
    for (let index = 0; index < CELLS.length; index += 1) {
      if (mask & (1 << index)) NEIGHBORS[index].forEach((cell) => {
        if (!(mask & (1 << cell))) frontier.add(cell);
      });
    }
    const options = [...frontier];
    mask |= 1 << options[Math.floor(rng() * options.length)];
  }
  return mask;
}

type YearTargets = { next: Date; used: Set<number> };
const targetByDate = new Map<string, number>();
const yearTargets = new Map<number, YearTargets>();

/** Keep the original date seed unless it repeats a target already used that year. */
function targetForDate(date: string): number {
  const cached = targetByDate.get(date);
  if (cached !== undefined) return cached;

  const selected = parseDateKey(date)!;
  const year = selected.getFullYear();
  let sequence = yearTargets.get(year);
  if (!sequence) {
    sequence = { next: new Date(year, 0, 1), used: new Set() };
    yearTargets.set(year, sequence);
  }

  while (dateKey(sequence.next) <= date) {
    const key = dateKey(sequence.next);
    let attempt = 0;
    let target: number;
    do {
      const suffix = attempt === 0 ? '' : `:retry-${attempt}`;
      target = makeTarget(hash(`hex-daily-notebook:${key}:v1${suffix}`));
      attempt += 1;
    } while (sequence.used.has(target));
    sequence.used.add(target);
    targetByDate.set(key, target);
    sequence.next = addDays(sequence.next, 1);
  }

  return targetByDate.get(date)!;
}

export function popcount(mask: number): number {
  let value = mask;
  let count = 0;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

export function candidatesFor(clues: Map<number, number>): number[] {
  return allConnectedMasks().filter((mask) => {
    for (const [index, value] of clues) {
      if ((mask & (1 << index)) || countNeighbors(mask, index) !== value) return false;
    }
    return true;
  });
}

export function generatePuzzle(date: string): Puzzle {
  if (!parseDateKey(date)) throw new Error('Invalid puzzle date');
  const seed = hash(`hex-daily-notebook:${date}:v1`);
  const rng = random(seed ^ 0xa5a5a5a5);
  const targetMask = targetForDate(date);
  const clues = new Map<number, number>();
  let candidates = allConnectedMasks();
  const available = CELLS.map((_, index) => index).filter((index) => !(targetMask & (1 << index)));

  while (candidates.length > 1 || clues.size < 5) {
    let best: { index: number; next: number[]; score: number } | undefined;
    for (const index of available) {
      if (clues.has(index)) continue;
      const value = countNeighbors(targetMask, index);
      const next = candidates.filter((mask) => !(mask & (1 << index)) && countNeighbors(mask, index) === value);
      const jitter = rng() * 0.001;
      const score = next.length + jitter;
      if (!best || score < best.score) best = { index, next, score };
    }
    if (!best) throw new Error('Could not construct a unique puzzle');
    clues.set(best.index, countNeighbors(targetMask, best.index));
    candidates = best.next;
  }

  return { date, cells: CELLS, targetMask, clues, solutionCount: candidates.length };
}

export function isSolved(mask: number, puzzle: Puzzle): boolean {
  return mask === puzzle.targetMask;
}
