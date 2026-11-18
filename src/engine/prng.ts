export type RngFn = () => number;

export function createSeededRng(seed: number): RngFn {
  let a = seed >>> 0;
  return function mulberry32(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng: RngFn, min: number, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

export function rngFloat(rng: RngFn, min: number, max: number, decimals = 2): number {
  const val = min + rng() * (max - min);
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function rngPick<T>(rng: RngFn, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function rngShuffle<T>(rng: RngFn, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
