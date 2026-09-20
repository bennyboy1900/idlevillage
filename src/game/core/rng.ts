/**
 * Deterministischer Zufall. Jeder Systembereich zieht seinen eigenen Strom aus
 * dem Weltseed, damit eine Änderung an einer Stelle nicht die gesamte Welt
 * verschiebt.
 */
export interface Rng {
  /** Gleichverteilt in [0, 1). */
  next(): number;
  /** Ganzzahl in [min, max]. */
  int(min: number, max: number): number;
  /** Gleitkomma in [min, max). */
  range(min: number, max: number): number;
  /** Zufälliges Element. */
  pick<T>(items: readonly T[]): T;
  /** true mit Wahrscheinlichkeit p. */
  chance(p: number): boolean;
  /** Aktueller Zustand, für Speicherstände. */
  state(): number;
}

/** mulberry32: klein, schnell, reproduzierbar über alle Browser. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    state: () => s,
  };
}

/** Leitet einen stabilen Unterseed aus Seed und Bezeichner ab. */
export function deriveSeed(seed: number, label: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Wertrauschen mit glatter Interpolation; für Gelände und Biome. */
export function valueNoise2d(seed: number) {
  const hash = (x: number, y: number) => {
    let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x2545f491);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** Mehrere Oktaven Wertrauschen, Ergebnis in [0, 1]. */
export function fbm2d(seed: number, octaves = 4) {
  const noise = valueNoise2d(seed);
  return (x: number, y: number) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}
