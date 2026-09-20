import { deriveSeed, fbm2d, createRng } from '../core/rng';
import type { NodeKind, ResourceNode, TerrainId } from '../core/types';
import { REGIONS, REGION_BY_ID, WELTGROESSE } from '../content/world-content';

/** Numerische Kodierung des Geländes, damit die Karte in typisierte Arrays passt. */
export const TERRAIN: Record<TerrainId, number> = {
  tiefwasser: 0,
  wasser: 1,
  ufer: 2,
  wiese: 3,
  grasnarbe: 4,
  trockengras: 5,
  schnee: 6,
  fels: 7,
};

export const TERRAIN_NAME = Object.fromEntries(
  Object.entries(TERRAIN).map(([k, v]) => [v, k]),
) as Record<number, TerrainId>;

/** Nicht erschlossenes Gebiet. Wird abgedunkelt gezeichnet und ist gesperrt. */
export const UNERSCHLOSSEN = 255;

export interface World {
  seed: number;
  size: number;
  /** Geländeindex je Kachel. */
  terrain: Uint8Array;
  /** Detailvariante für die Darstellung. */
  detail: Uint8Array;
  /** Freigeschaltete Regionen. */
  regionen: string[];
}

export const idx = (size: number, x: number, y: number) => y * size + x;

export function istWasser(t: number): boolean {
  return t === TERRAIN.wasser || t === TERRAIN.tiefwasser;
}

/** Gelände blockiert Bewegung: Wasser, Fels und gesperrte Gebiete. */
export function terrainBlockiert(t: number): boolean {
  return istWasser(t) || t === TERRAIN.fels || t === UNERSCHLOSSEN;
}


/** Mittelpunkt der Startregion; hier steht das erste Lager. */
export const DORFMITTE = { x: 64, y: 64 };

/**
 * Erzeugt die Karte deterministisch aus Seed und freigeschalteten Regionen.
 * Das Gelände wird nicht gespeichert, sondern beim Laden neu berechnet.
 */
export function generateWorld(seed: number, regionen: string[]): World {
  const size = WELTGROESSE;
  const terrain = new Uint8Array(size * size).fill(UNERSCHLOSSEN);
  const detail = new Uint8Array(size * size);
  const hoehe = fbm2d(deriveSeed(seed, 'hoehe'), 4);
  const feucht = fbm2d(deriveSeed(seed, 'feucht'), 3);

  for (const region of REGIONS) {
    if (!regionen.includes(region.id)) continue;
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        const i = idx(size, x, y);
        const h = hoehe(x * 0.07, y * 0.07);
        // Ränder zur Nachbarregion bleiben Land, damit Gebiete erreichbar sind.
        const randAbstand = Math.min(
          x - region.x,
          region.x + region.w - 1 - x,
          y - region.y,
          region.y + region.h - 1 - y,
        );
        const randLand = randAbstand < 2;

        let t: number;
        if (!randLand && h < region.wasser) {
          t = h < region.wasser * 0.45 ? TERRAIN.tiefwasser : TERRAIN.wasser;
        } else if (!randLand && h < region.wasser + 0.035) {
          t = TERRAIN.ufer;
        } else if (region.boden === 'schnee') {
          t = TERRAIN.schnee;
        } else if (region.boden === 'trockengras') {
          t = TERRAIN.trockengras;
        } else if (region.boden === 'sand') {
          t = h > 0.62 ? TERRAIN.wiese : TERRAIN.ufer;
        } else {
          t = feucht(x * 0.11, y * 0.11) > 0.52 ? TERRAIN.wiese : TERRAIN.grasnarbe;
        }

        // Hochland bekommt echte Felsenkämme statt zufällig gestreuter Klippen.
        if (region.id === 'hochland' && h > 0.74) t = TERRAIN.fels;
        if (region.id === 'ruinen' && h > 0.78) t = TERRAIN.fels;

        terrain[i] = t;
        detail[i] = (Math.floor(h * 997) + Math.floor(feucht(x * 0.3, y * 0.3) * 13)) % 6;
      }
    }
  }

  // Der Dorfplatz ist immer freie, trockene Fläche.
  for (let y = DORFMITTE.y - 7; y <= DORFMITTE.y + 7; y++) {
    for (let x = DORFMITTE.x - 7; x <= DORFMITTE.x + 7; x++) {
      const dx = x - DORFMITTE.x;
      const dy = y - DORFMITTE.y;
      if (dx * dx + dy * dy > 49) continue;
      const i = idx(size, x, y);
      if (istWasser(terrain[i]) || terrain[i] === TERRAIN.fels) terrain[i] = TERRAIN.wiese;
    }
  }

  return { seed, size, terrain, detail, regionen: [...regionen] };
}

// ---------------------------------------------------------------------------
// Rohstoffknoten
// ---------------------------------------------------------------------------

const NODE_MENGE: Record<NodeKind, number> = {
  baum: 14,
  nadelbaum: 16,
  totholz: 8,
  winterbaum: 14,
  palme: 10,
  kaktus: 6,
  fels: 12,
  erzfels: 10,
  kristallfels: 6,
  beerenstrauch: 8,
  kraut: 5,
};

/** Nachwachszeit in Sekunden; null bedeutet endgültig erschöpft. */
const NODE_REGROW: Partial<Record<NodeKind, number>> = {
  baum: 240,
  nadelbaum: 300,
  winterbaum: 300,
  palme: 240,
  beerenstrauch: 120,
  kraut: 150,
};

export function nodeNachwachszeit(kind: NodeKind): number | null {
  return NODE_REGROW[kind] ?? null;
}

/**
 * Setzt Rohstoffe in eine Region. Waldgruppen entstehen über Rauschen, damit
 * Lichtungen, Bauflächen und Landmarken erhalten bleiben.
 */
export function generateNodes(
  world: World,
  regionId: string,
  startId: number,
  belegt: (x: number, y: number) => boolean,
): ResourceNode[] {
  const region = REGION_BY_ID[regionId];
  const rng = createRng(deriveSeed(world.seed, `nodes:${regionId}`));
  const gruppen = fbm2d(deriveSeed(world.seed, `gruppen:${regionId}`), 3);
  const out: ResourceNode[] = [];
  let id = startId;

  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      const t = world.terrain[idx(world.size, x, y)];
      if (terrainBlockiert(t) || t === TERRAIN.ufer) continue;
      if (belegt(x, y)) continue;

      // Dichte Gruppen statt gleichmäßigem Streuen.
      const dichte = gruppen(x * 0.13, y * 0.13);
      for (const [kind, basis] of Object.entries(region.vorkommen) as [NodeKind, number][]) {
        const istHolz = kind === 'baum' || kind === 'nadelbaum' || kind === 'winterbaum' || kind === 'palme' || kind === 'totholz';
        const p = basis * (istHolz ? dichte * 2.2 : 1.4 - dichte);
        if (!rng.chance(p)) continue;
        const menge = NODE_MENGE[kind];
        out.push({
          id: id++,
          kind,
          x,
          y,
          amount: menge,
          regrow: null,
          variant: rng.int(0, 2),
          reservedBy: null,
          geschuetzt: false,
        });
        break;
      }
    }
  }
  return out;
}
