import type { Simulation } from './sim';
import type { ResourceId, Store } from '../core/types';
import { RESOURCE_IDS } from '../content/resources';
import { menge } from './store';

export interface OfflineBericht {
  /** Tatsächlich nachgerechnete Simulationssekunden. */
  sekunden: number;
  /** Abgeschnittene Sekunden, weil das Limit erreicht war. */
  abgeschnitten: number;
  gewinn: Store;
  verlust: Store;
  haeuser: number;
  neueBewohner: number;
  engpaesse: string[];
}

/** Zeitschritt der Nachrechnung. Größere Blöcke statt Millionen Einzelframes. */
const OFFLINE_DT = 1;
/** Obergrenze an Schritten, damit die Rückkehr nicht minutenlang rechnet. */
const MAX_SCHRITTE = 90_000;

/**
 * Rechnet die Abwesenheit nach. Online und offline verwenden dieselben
 * Rezepte, Kapazitäten und Regeln; nur der Zeitschritt ist gröber, wodurch
 * Transporte näherungsweise als Durchsatz wirken. Das ist eine bewusste
 * Näherung und keine exakte Wiederholung der Echtzeitsimulation.
 */
export function offlineNachrechnen(
  sim: Simulation,
  vergangeneMillisekunden: number,
  maxStunden: number,
): OfflineBericht {
  // Negative Zeitdifferenzen (verstellte Uhr) zählen als null.
  const roh = Math.max(0, vergangeneMillisekunden / 1000);
  const limit = maxStunden * 3600;
  const sekunden = Math.min(roh, limit);
  const abgeschnitten = Math.max(0, roh - sekunden);

  const vorher: Store = {};
  for (const id of RESOURCE_IDS) vorher[id] = menge(sim.state.store, id);
  const haeuserVorher = sim.state.statistik.haeuserGebaut;
  const bewohnerVorher = sim.state.residents.length;

  const schritte = Math.min(MAX_SCHRITTE, Math.floor(sekunden / OFFLINE_DT));
  for (let i = 0; i < schritte; i++) {
    sim.tick(OFFLINE_DT);
    // Cues laufen nicht nach: keine tausend alten Geräusche bei der Rückkehr.
    sim.cues.length = 0;
  }

  const gewinn: Store = {};
  const verlust: Store = {};
  for (const id of RESOURCE_IDS) {
    const diff = menge(sim.state.store, id) - (vorher[id] ?? 0);
    if (diff > 0.5) gewinn[id] = diff;
    else if (diff < -0.5) verlust[id] = -diff;
  }

  const engpaesse = [...sim.state.hinweise];
  return {
    sekunden: schritte * OFFLINE_DT,
    abgeschnitten,
    gewinn,
    verlust,
    haeuser: sim.state.statistik.haeuserGebaut - haeuserVorher,
    neueBewohner: sim.state.residents.length - bewohnerVorher,
    engpaesse,
  };
}

export function formatiereDauer(sekunden: number): string {
  const stunden = Math.floor(sekunden / 3600);
  const minuten = Math.floor((sekunden % 3600) / 60);
  if (stunden > 0) return `${stunden} h ${minuten} min`;
  if (minuten > 0) return `${minuten} min`;
  return `${Math.round(sekunden)} s`;
}

export function istRessource(id: string): id is ResourceId {
  return (RESOURCE_IDS as string[]).includes(id);
}
