import {
  SAVE_VERSION,
  type Building,
  type GameState,
  type Household,
  type Resident,
  type TraitId,
} from '../core/types';
import { createRng, deriveSeed, type Rng } from '../core/rng';
import { BUILDING_BY_ID } from '../content/buildings';
import { NACHNAMEN, VORNAMEN } from '../content/names';
import { DORFMITTE, generateNodes, generateWorld, idx, terrainBlockiert } from '../world/terrain';

const TRAITS: TraitId[] = ['fleissig', 'gesellig', 'genuegsam', 'neugierig', 'naturverbunden', 'sorgfaeltig'];

export function erzeugeBewohner(
  state: GameState,
  rng: Rng,
  opts: { stage: Resident['stage']; haushalt: number; x: number; y: number },
): Resident {
  const traits: TraitId[] = [];
  while (traits.length < 2) {
    const t = rng.pick(TRAITS);
    if (!traits.includes(t)) traits.push(t);
  }
  const r: Resident = {
    id: state.naechsteId++,
    name: `${rng.pick(VORNAMEN)} ${rng.pick(NACHNAMEN)}`,
    stage: opts.stage,
    alter: opts.stage === 'kind' ? 0 : 20 * 60,
    haushalt: opts.haushalt,
    wohnung: null,
    arbeitsplatz: null,
    beruf: 'holzfaeller',
    berufFixiert: false,
    faehigkeiten: {},
    traits,
    energie: 85 + rng.range(0, 15),
    saettigung: 70 + rng.range(0, 25),
    zufriedenheit: 60 + rng.range(0, 10),
    beziehungen: {},
    x: opts.x,
    y: opts.y,
    zustand: 'idle',
    richtung: 'down',
    task: null,
    inventar: {},
    haltezeit: rng.range(0, 3),
    weg: [],
    wegFehler: 0,
    steckt: 0,
    favorit: false,
    status: '',
  };
  state.residents.push(r);
  return r;
}

function setzeGebaeude(state: GameState, typ: string, x: number, y: number): Building {
  const b: Building = {
    id: state.naechsteId++,
    type: typ,
    x,
    y,
    stufe: 1,
    status: 'aktiv',
    geliefert: {},
    bauarbeit: 0,
    arbeiter: [],
    bewohner: [],
    zyklus: 0,
    eingang: {},
    autobau: false,
  };
  state.buildings.push(b);
  return b;
}

export interface NeuesSpielOptionen {
  seed?: number;
  dorfname?: string;
  modus?: 'friedlich' | 'abenteuer';
}

/** Legt einen frischen, vollständig spielbaren Anfangszustand an. */
export function neuesSpiel(opts: NeuesSpielOptionen = {}): GameState {
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    dorfname: opts.dorfname?.trim() || 'Wurzelhain',
    modus: opts.modus ?? 'friedlich',
    tick: 0,
    zeit: 0,
    gespeichertAm: Date.now(),
    weltgroesse: 128,
    regionen: ['wiesenwald'],
    store: { holz: 60, stein: 35, beeren: 60, fisch: 10, muenzen: 20 },
    reserviert: {},
    residents: [],
    haushalte: [],
    buildings: [],
    nodes: [],
    policy: {
      strategie: 'ausgewogen',
      bauanteil: 0.25,
      holzreserve: 20,
      nahrungsziel: 80,
      autobau: true,
      zonen: [],
      rodenErlaubt: true,
    },
    research: { abgeschlossen: [], aktiv: null, fortschritt: 0 },
    quests: [],
    events: [],
    champions: [],
    beraterAktiv: [],
    log: [],
    naechsteId: 1,
    statistik: {
      gewonnen: {},
      verbraucht: {},
      verbaut: {},
      verworfen: {},
      haeuserGebaut: 0,
      geburten: 0,
      zugezogen: 0,
    },
    raten: {},
    hinweise: [],
  };

  const world = generateWorld(seed, state.regionen);
  const rng = createRng(deriveSeed(seed, 'start'));

  // Der Dorfkern: Lagerhaus in der Mitte, Brunnen daneben, zwei Starthütten.
  const mitte = DORFMITTE;
  const frei = (x: number, y: number) => !terrainBlockiert(world.terrain[idx(world.size, x, y)]);
  const platziere = (typ: string, dx: number, dy: number) => {
    let x = mitte.x + dx;
    let y = mitte.y + dy;
    if (!frei(x, y)) {
      suche: for (let r = 1; r <= 4; r++) {
        for (let oy = -r; oy <= r; oy++) {
          for (let ox = -r; ox <= r; ox++) {
            if (frei(x + ox, y + oy) && !state.buildings.some((b) => b.x === x + ox && b.y === y + oy)) {
              x += ox;
              y += oy;
              break suche;
            }
          }
        }
      }
    }
    return setzeGebaeude(state, typ, x, y);
  };

  // Der Dorfplatz: Lager, Brunnen, Auftragsbrett und Wegweiser bilden den Hub.
  platziere('lager', 0, 0);
  platziere('brunnen', 2, 1);
  platziere('auftragsbrett', 2, -1);
  platziere('wegweiser', 0, 2);
  platziere('huette', -2, -1);
  platziere('huette', -2, 1);

  // Rohstoffe setzen, aber nicht unter die Startgebäude.
  const belegt = (x: number, y: number) =>
    state.buildings.some((b) => {
      const def = BUILDING_BY_ID[b.type];
      return x >= b.x - 1 && x < b.x + def.w + 1 && y >= b.y - 1 && y < b.y + def.h + 1;
    });
  state.nodes = generateNodes(world, 'wiesenwald', state.naechsteId, belegt);
  state.naechsteId += state.nodes.length + 1;

  // Ein kleiner geschützter Hain am Dorfplatz bleibt immer stehen.
  for (const node of state.nodes) {
    if (Math.hypot(node.x - mitte.x, node.y - mitte.y) < 4) node.geschuetzt = true;
  }

  // Sechs Erwachsene in drei Haushalten, mit bestehenden Beziehungen.
  for (let h = 0; h < 3; h++) {
    const haushalt: Household = { id: state.naechsteId++, mitglieder: [], cooldown: 0 };
    state.haushalte.push(haushalt);
    const leute: Resident[] = [];
    for (let i = 0; i < 2; i++) {
      const r = erzeugeBewohner(state, rng, {
        stage: 'erwachsen',
        haushalt: haushalt.id,
        x: mitte.x + rng.range(-2, 2),
        y: mitte.y + rng.range(-2, 2),
      });
      haushalt.mitglieder.push(r.id);
      leute.push(r);
    }
    leute[0].beziehungen[leute[1].id] = 55;
    leute[1].beziehungen[leute[0].id] = 55;
  }

  return state;
}

/**
 * Stellt nach dem Laden einen konsistenten Zustand her: fehlende Felder,
 * verwaiste Reservierungen und ungültige Wege werden bereinigt.
 */
export function zustandReparieren(state: GameState): GameState {
  state.reserviert ??= {};
  state.zeit ??= state.tick / 10;
  state.hinweise = [];
  state.raten ??= {};
  state.statistik.verworfen ??= {};

  const ids = new Set(state.residents.map((r) => r.id));
  for (const node of state.nodes) {
    if (node.reservedBy !== null && !ids.has(node.reservedBy)) node.reservedBy = null;
  }
  for (const r of state.residents) {
    r.weg = [];
    r.wegFehler = 0;
    r.steckt = 0;
    // Laufende Aufgaben werden neu geplant; Ansprüche daraus entfallen.
    if (r.task && (r.task.phase === 'hol' || r.task.phase === 'hin')) r.task = null;
  }

  // Zusagen neu aus den offenen Baustellen ableiten: keine Geisterreservierungen.
  const reserviert: GameState['reserviert'] = {};
  for (const b of state.buildings) {
    if (b.status !== 'baustelle') continue;
    const def = BUILDING_BY_ID[b.type];
    for (const [id, n] of Object.entries(def.kosten) as [keyof typeof def.kosten & string, number][]) {
      const offen = n - ((b.geliefert as Record<string, number>)[id] ?? 0);
      if (offen > 0) {
        (reserviert as Record<string, number>)[id] = ((reserviert as Record<string, number>)[id] ?? 0) + offen;
      }
    }
  }
  // Güter, die beim Speichern getragen wurden und deren Träger fehlt, sind
  // verloren. Zusagen werden deshalb auf den tatsächlichen Bestand begrenzt;
  // sonst stünde mehr zugesagt als vorhanden im Lager.
  for (const id of Object.keys(reserviert) as (keyof typeof reserviert)[]) {
    const da = state.store[id] ?? 0;
    if ((reserviert[id] ?? 0) > da) reserviert[id] = da;
  }
  state.reserviert = reserviert;
  return state;
}
