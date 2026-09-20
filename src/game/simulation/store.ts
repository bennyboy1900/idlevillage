import type { GameState, ResourceId, Store } from '../core/types';
import { RESOURCES, RESOURCE_IDS, lagerbelegung } from '../content/resources';

export function menge(store: Store, id: ResourceId): number {
  return store[id] ?? 0;
}

export function addiere(ziel: Store, quelle: Store, faktor = 1): void {
  for (const [id, n] of Object.entries(quelle) as [ResourceId, number][]) {
    ziel[id] = (ziel[id] ?? 0) + n * faktor;
  }
}

export function istLeer(store: Store): boolean {
  return !RESOURCE_IDS.some((id) => (store[id] ?? 0) > 1e-9);
}

export function kopiere(store: Store): Store {
  const out: Store = {};
  for (const [id, n] of Object.entries(store) as [ResourceId, number][]) if (n) out[id] = n;
  return out;
}

/** Frei verfügbar heißt: im Lager und nicht bereits zugesagt. */
export function verfuegbar(state: GameState, id: ResourceId): number {
  return Math.max(0, menge(state.store, id) - menge(state.reserviert, id));
}

export function deckt(state: GameState, kosten: Store): boolean {
  return (Object.entries(kosten) as [ResourceId, number][]).every(
    ([id, n]) => verfuegbar(state, id) >= n,
  );
}

/** Zusagen eintragen. Reservierungen sind keine zusätzlichen Güter. */
export function reserviere(state: GameState, kosten: Store): boolean {
  if (!deckt(state, kosten)) return false;
  addiere(state.reserviert, kosten);
  return true;
}

export function gibReservierungFrei(state: GameState, kosten: Store): void {
  for (const [id, n] of Object.entries(kosten) as [ResourceId, number][]) {
    state.reserviert[id] = Math.max(0, menge(state.reserviert, id) - n);
  }
}

/**
 * Entnimmt zugesagte Güter tatsächlich aus dem Lager und löst die Reservierung.
 * Wird aufgerufen, wenn ein Bewohner die Ware physisch abholt.
 */
export function entnimmReserviert(state: GameState, kosten: Store): Store {
  const out: Store = {};
  for (const [id, n] of Object.entries(kosten) as [ResourceId, number][]) {
    const nehmen = Math.min(n, menge(state.store, id));
    state.store[id] = menge(state.store, id) - nehmen;
    state.reserviert[id] = Math.max(0, menge(state.reserviert, id) - n);
    if (nehmen > 0) out[id] = nehmen;
  }
  return out;
}

/** Direkter Verbrauch ohne vorherige Reservierung. */
export function verbrauche(state: GameState, kosten: Store): boolean {
  if (!deckt(state, kosten)) return false;
  for (const [id, n] of Object.entries(kosten) as [ResourceId, number][]) {
    state.store[id] = menge(state.store, id) - n;
    state.statistik.verbraucht[id] = menge(state.statistik.verbraucht, id) + n;
  }
  return true;
}

export function lagerkapazitaet(bonus: number): number {
  return 50 + bonus;
}

/**
 * Legt Güter ins Lager. Über der Kapazität wird nicht angenommen; die Menge
 * landet in der Verworfen-Statistik, damit die Erhaltungsgleichung aufgeht.
 */
export function lagerEin(state: GameState, waren: Store, kapazitaet: number): { angenommen: Store; verworfen: Store } {
  const angenommen: Store = {};
  const verworfen: Store = {};
  let belegt = lagerbelegung(state.store);
  for (const [id, n] of Object.entries(waren) as [ResourceId, number][]) {
    if (n <= 0) continue;
    if (!RESOURCES[id].lagert) {
      state.store[id] = menge(state.store, id) + n;
      angenommen[id] = n;
      continue;
    }
    const platz = Math.max(0, kapazitaet - belegt);
    const nehmen = Math.min(n, platz);
    if (nehmen > 0) {
      state.store[id] = menge(state.store, id) + nehmen;
      angenommen[id] = nehmen;
      belegt += nehmen;
    }
    if (n - nehmen > 1e-9) {
      verworfen[id] = n - nehmen;
      state.statistik.verworfen[id] = menge(state.statistik.verworfen, id) + (n - nehmen);
    }
  }
  return { angenommen, verworfen };
}

/** Zählt gewonnene Güter für Aufträge und die Erhaltungsprüfung. */
export function zaehleGewonnen(state: GameState, waren: Store): void {
  addiere(state.statistik.gewonnen, waren);
}
