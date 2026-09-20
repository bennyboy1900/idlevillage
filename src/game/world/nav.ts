import { terrainBlockiert, idx, type World } from './terrain';
import { BUILDING_BY_ID } from '../content/buildings';
import type { Building, ResourceNode } from '../core/types';

/**
 * Begehbarkeitskarte. Sie wird nur neu aufgebaut, wenn sich Gebäude, Felsen
 * oder freigeschaltete Regionen ändern, nicht jeden Tick.
 */
export interface NavGrid {
  size: number;
  /** 0 = frei, 1 = blockiert. */
  blockiert: Uint8Array;
  /** Zählt Änderungen, damit Wege-Caches gezielt verworfen werden. */
  version: number;
}

export function createNavGrid(world: World): NavGrid {
  return { size: world.size, blockiert: new Uint8Array(world.size * world.size), version: 0 };
}

/**
 * Bäume blockieren bewusst nicht: Bewohner gehen zwischen den Stämmen hindurch.
 * Das verhindert eingeschlossene Bewohner in dichten Wäldern. Felsen, Gebäude
 * und Gelände blockieren.
 */
export function rebuildNav(nav: NavGrid, world: World, buildings: Building[], nodes: ResourceNode[]): void {
  const { size } = world;
  nav.blockiert.fill(0);
  for (let i = 0; i < size * size; i++) {
    if (terrainBlockiert(world.terrain[i])) nav.blockiert[i] = 1;
  }
  for (const node of nodes) {
    if (node.amount <= 0) continue;
    if (node.kind === 'fels' || node.kind === 'erzfels' || node.kind === 'kristallfels') {
      nav.blockiert[idx(size, node.x, node.y)] = 1;
    }
  }
  for (const b of buildings) {
    const def = BUILDING_BY_ID[b.type];
    if (!def) continue;
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const i = idx(size, b.x + dx, b.y + dy);
        // Brücken machen Wasser begehbar statt es zu blockieren.
        nav.blockiert[i] = def.ueberWasser ? 0 : 1;
      }
    }
  }
  nav.version++;
}

export function begehbar(nav: NavGrid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= nav.size || y >= nav.size) return false;
  return nav.blockiert[y * nav.size + x] === 0;
}

// ---------------------------------------------------------------------------
// A* mit binärem Heap
// ---------------------------------------------------------------------------

class Heap {
  private items: number[] = [];
  private kosten: number[] = [];

  get size() {
    return this.items.length;
  }

  push(item: number, cost: number) {
    this.items.push(item);
    this.kosten.push(cost);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.kosten[p] <= this.kosten[i]) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastCost = this.kosten.pop()!;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.kosten[0] = lastCost;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.kosten[l] < this.kosten[m]) m = l;
        if (r < this.items.length && this.kosten[r] < this.kosten[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.kosten[a], this.kosten[b]] = [this.kosten[b], this.kosten[a]];
  }
}

/** Puffer, damit A* keine Arrays je Aufruf anlegt. */
interface NavScratch {
  gScore: Float32Array;
  vonWo: Int32Array;
  besucht: Uint8Array;
  marke: number;
  markeArray: Int32Array;
}

const scratchCache = new WeakMap<NavGrid, NavScratch>();

function scratchFor(nav: NavGrid): NavScratch {
  let s = scratchCache.get(nav);
  if (!s || s.gScore.length !== nav.size * nav.size) {
    s = {
      gScore: new Float32Array(nav.size * nav.size),
      vonWo: new Int32Array(nav.size * nav.size),
      besucht: new Uint8Array(nav.size * nav.size),
      marke: 0,
      markeArray: new Int32Array(nav.size * nav.size),
    };
    scratchCache.set(nav, s);
  }
  return s;
}

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
] as const;

/**
 * Sucht einen Weg von (sx, sy) nach (zx, zy).
 * Gibt die Kachelindizes ohne Startkachel zurück, oder null.
 * `maxKnoten` begrenzt die Arbeit je Aufruf, damit ein Tick nicht entgleist.
 */
export function findePfad(
  nav: NavGrid,
  sx: number,
  sy: number,
  zx: number,
  zy: number,
  maxKnoten = 3000,
): number[] | null {
  const { size } = nav;
  if (sx === zx && sy === zy) return [];
  if (zx < 0 || zy < 0 || zx >= size || zy >= size) return null;
  if (!begehbar(nav, zx, zy)) return null;

  const s = scratchFor(nav);
  s.marke++;
  const marke = s.marke;
  const start = sy * size + sx;
  const ziel = zy * size + zx;
  const heap = new Heap();
  s.gScore[start] = 0;
  s.vonWo[start] = -1;
  s.markeArray[start] = marke;
  s.besucht[start] = 0;
  heap.push(start, 0);

  let expandiert = 0;
  while (heap.size > 0) {
    const aktuell = heap.pop();
    if (s.besucht[aktuell] === 1 && s.markeArray[aktuell] === marke) continue;
    s.besucht[aktuell] = 1;
    if (aktuell === ziel) break;
    if (++expandiert > maxKnoten) return null;

    const ax = aktuell % size;
    const ay = (aktuell / size) | 0;
    for (const [dx, dy, kosten] of DIRS) {
      const nx = ax + dx;
      const ny = ay + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const n = ny * size + nx;
      if (nav.blockiert[n]) continue;
      // Diagonale nur, wenn beide Nachbarkacheln frei sind: kein Ecken-Schneiden.
      if (dx !== 0 && dy !== 0) {
        if (nav.blockiert[ay * size + nx] || nav.blockiert[ny * size + ax]) continue;
      }
      const neu = s.gScore[aktuell] + kosten;
      const bekannt = s.markeArray[n] === marke;
      if (bekannt && s.gScore[n] <= neu) continue;
      s.gScore[n] = neu;
      s.vonWo[n] = aktuell;
      s.markeArray[n] = marke;
      s.besucht[n] = 0;
      const hx = Math.abs(nx - zx);
      const hy = Math.abs(ny - zy);
      const h = Math.max(hx, hy) + 0.414 * Math.min(hx, hy);
      heap.push(n, neu + h);
    }
  }

  if (s.markeArray[ziel] !== marke || s.besucht[ziel] !== 1) return null;

  const pfad: number[] = [];
  let k = ziel;
  while (k !== start && k >= 0) {
    pfad.push(k);
    k = s.vonWo[k];
  }
  // Rückwärts gespeichert: Der Bewohner nimmt jeweils das letzte Element.
  return pfad;
}

/** Nächste begehbare Kachel um ein Ziel herum, für Ziele auf blockierten Feldern. */
export function nachbarKachel(nav: NavGrid, x: number, y: number): { x: number; y: number } | null {
  if (begehbar(nav, x, y)) return { x, y };
  for (const [dx, dy] of DIRS) {
    if (begehbar(nav, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  for (let r = 2; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (begehbar(nav, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}
