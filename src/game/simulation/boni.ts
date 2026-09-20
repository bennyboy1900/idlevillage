import type { GameState, JobId, ResourceId } from '../core/types';
import { RESEARCH_BY_ID, type Effekt } from '../content/research';
import { CHAMPION_BY_ID, EVENT_BY_ID, MAX_BERATER } from '../content/world-content';
import { BUILDING_BY_ID, stufenfaktor } from '../content/buildings';
import { menge } from './store';

/** Zusammengefasste, zwischengespeicherte Wirkung aller aktiven Effekte. */
export interface Boni {
  tragen: number;
  tempo: number;
  tempoBeruf: Partial<Record<JobId, number>>;
  gehen: number;
  lager: number;
  nachwachsen: number;
  nahrungsbedarf: number;
  zufriedenheit: number;
  offlineStunden: number;
  bauzeit: number;
  handel: number;
  ertrag: Partial<Record<ResourceId, number>>;
  lernen: number;
  freigeschaltet: Set<string>;
  /** Regionen, die durch Forschung erschließbar geworden sind. */
  regionenFrei: Set<string>;
}

function leereBoni(): Boni {
  return {
    tragen: 6,
    tempo: 1,
    tempoBeruf: {},
    gehen: 1,
    lager: 0,
    nachwachsen: 1,
    nahrungsbedarf: 1,
    zufriedenheit: 0,
    offlineStunden: 8,
    bauzeit: 1,
    handel: 1,
    ertrag: {},
    lernen: 1,
    freigeschaltet: new Set(),
    regionenFrei: new Set(),
  };
}

function wende(boni: Boni, e: Effekt | undefined): void {
  if (!e) return;
  if (e.tragen) boni.tragen += e.tragen;
  if (e.tempo) boni.tempo *= e.tempo;
  if (e.tempoBeruf) {
    boni.tempoBeruf[e.tempoBeruf.beruf] = (boni.tempoBeruf[e.tempoBeruf.beruf] ?? 1) * e.tempoBeruf.faktor;
  }
  if (e.gehen) boni.gehen *= e.gehen;
  if (e.lager) boni.lager += e.lager;
  if (e.nachwachsen) boni.nachwachsen *= e.nachwachsen;
  if (e.nahrungsbedarf) boni.nahrungsbedarf *= e.nahrungsbedarf;
  if (e.zufriedenheit) boni.zufriedenheit += e.zufriedenheit;
  if (e.offlineStunden) boni.offlineStunden += e.offlineStunden;
  if (e.bauzeit) boni.bauzeit *= e.bauzeit;
  if (e.handel) boni.handel *= e.handel;
  if (e.lernen) boni.lernen *= e.lernen;
  if (e.ertrag) {
    for (const [id, f] of Object.entries(e.ertrag) as [ResourceId, number][]) {
      boni.ertrag[id] = (boni.ertrag[id] ?? 1) * f;
    }
  }
  if (e.freischalten) for (const id of e.freischalten) boni.freigeschaltet.add(id);
  if (e.region) boni.regionenFrei.add(e.region);
}

/**
 * Berechnet die Gesamtwirkung neu. Wird nur bei Änderungen an Forschung,
 * Ereignissen, Beratern oder Gebäuden aufgerufen, nicht jeden Tick.
 */
export function berechneBoni(state: GameState): Boni {
  const boni = leereBoni();
  for (const id of state.research.abgeschlossen) wende(boni, RESEARCH_BY_ID[id]?.effekt);
  for (const ev of state.events) wende(boni, EVENT_BY_ID[ev.id]?.effekt);
  for (const id of state.beraterAktiv.slice(0, MAX_BERATER)) wende(boni, CHAMPION_BY_ID[id]?.effekt);

  for (const b of state.buildings) {
    if (b.status !== 'aktiv') continue;
    const def = BUILDING_BY_ID[b.type];
    if (def?.lager) boni.lager += def.lager * stufenfaktor(def, b.stufe);
    // Ställe verkürzen die Transportwege im ganzen Dorf.
    if (def?.id === 'stall') boni.gehen *= 1 + 0.08 * stufenfaktor(def, b.stufe);
  }

  // Werkzeuge im Lager beschleunigen die Arbeit, mit klarer Obergrenze.
  const werkzeuge = menge(state.store, 'werkzeug');
  const arbeiter = state.residents.filter((r) => r.stage !== 'kind').length || 1;
  boni.tempo *= 1 + 0.25 * Math.min(1, werkzeuge / arbeiter);

  return boni;
}

/** Arbeitstempo eines Bewohners: Boni, Beruf, Fähigkeit, Energie und Charakter. */
export function arbeitstempo(boni: Boni, beruf: JobId, faehigkeit: number, energie: number, fleissig: boolean): number {
  const berufsbonus = boni.tempoBeruf[beruf] ?? 1;
  const koennen = 1 + Math.min(faehigkeit, 100) / 250; // bis +40 %
  const wach = energie < 25 ? 0.65 : energie < 50 ? 0.88 : 1;
  return boni.tempo * berufsbonus * koennen * wach * (fleissig ? 1.08 : 1);
}
