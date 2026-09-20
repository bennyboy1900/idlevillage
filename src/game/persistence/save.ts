import { SAVE_VERSION, type GameState } from '../core/types';
import { zustandReparieren } from '../simulation/state';

const DB_NAME = 'wurzelhain';
const DB_VERSION = 1;
const STORE = 'spielstaende';
export const SLOTS = [0, 1, 2] as const;
export type Slot = (typeof SLOTS)[number];

export interface SlotInfo {
  slot: Slot;
  dorfname: string;
  einwohner: number;
  spielzeit: number;
  gespeichertAm: number;
  seed: number;
}

interface Eintrag {
  slot: Slot;
  aktuell: GameState;
  /** Letzter gültiger Stand, falls der aktuelle beschädigt ist. */
  backup: GameState | null;
  gespeichertAm: number;
}

function oeffne(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB nicht verfügbar'));
  });
}

function transaktion<T>(modus: IDBTransactionMode, arbeit: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return oeffne().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, modus);
        const req = arbeit(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Speicherfehler'));
        tx.oncomplete = () => db.close();
      }),
  );
}

/**
 * Schreibt Zeitstempel und Zustand gemeinsam in einer Transaktion. Dadurch
 * kann kein Stand entstehen, dessen Zeitstempel nicht zu seinem Inhalt passt;
 * ohne das gäbe es doppelte Offline-Erträge nach einem Reload.
 */
export async function speichern(slot: Slot, state: GameState): Promise<void> {
  const vorher = await ladenRoh(slot).catch(() => null);
  const jetzt = Date.now();
  state.gespeichertAm = jetzt;
  const eintrag: Eintrag = {
    slot,
    aktuell: JSON.parse(JSON.stringify(state)) as GameState,
    backup: vorher?.aktuell ?? null,
    gespeichertAm: jetzt,
  };
  await transaktion('readwrite', (store) => store.put(eintrag));
}

async function ladenRoh(slot: Slot): Promise<Eintrag | null> {
  const wert = await transaktion<Eintrag | undefined>('readonly', (store) => store.get(slot));
  return wert ?? null;
}

export async function laden(slot: Slot): Promise<GameState | null> {
  const eintrag = await ladenRoh(slot).catch(() => null);
  if (!eintrag) return null;
  const kandidaten = [eintrag.aktuell, eintrag.backup];
  for (const kandidat of kandidaten) {
    if (!kandidat) continue;
    const geprueft = pruefeZustand(kandidat);
    if (geprueft.ok) return zustandReparieren(migriere(kandidat));
  }
  return null;
}

export async function slotUebersicht(): Promise<(SlotInfo | null)[]> {
  const out: (SlotInfo | null)[] = [];
  for (const slot of SLOTS) {
    const eintrag = await ladenRoh(slot).catch(() => null);
    if (!eintrag?.aktuell) {
      out.push(null);
      continue;
    }
    const s = eintrag.aktuell;
    out.push({
      slot,
      dorfname: s.dorfname,
      einwohner: s.residents?.length ?? 0,
      spielzeit: s.zeit ?? 0,
      gespeichertAm: eintrag.gespeichertAm,
      seed: s.seed,
    });
  }
  return out;
}

export async function loeschen(slot: Slot): Promise<void> {
  await transaktion('readwrite', (store) => store.delete(slot));
}

// ---------------------------------------------------------------------------
// Prüfung, Migration, Import und Export
// ---------------------------------------------------------------------------

export interface Pruefung {
  ok: boolean;
  fehler: string[];
}

/** Strukturprüfung ohne Ausführung importierter Inhalte. */
export function pruefeZustand(wert: unknown): Pruefung {
  const fehler: string[] = [];
  const s = wert as Partial<GameState> | null;
  if (!s || typeof s !== 'object') return { ok: false, fehler: ['Kein Objekt.'] };
  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) fehler.push('Seed fehlt oder ist ungültig.');
  if (typeof s.version !== 'number') fehler.push('Version fehlt.');
  if ((s.version ?? 0) > SAVE_VERSION) fehler.push('Der Stand stammt aus einer neueren Version des Spiels.');
  if (!Array.isArray(s.residents)) fehler.push('Bewohnerliste fehlt.');
  if (!Array.isArray(s.buildings)) fehler.push('Gebäudeliste fehlt.');
  if (!Array.isArray(s.nodes)) fehler.push('Rohstoffliste fehlt.');
  if (!s.store || typeof s.store !== 'object') fehler.push('Lagerdaten fehlen.');
  if (s.residents && s.residents.length > 5000) fehler.push('Unplausibel viele Bewohner.');
  if (s.nodes && s.nodes.length > 200000) fehler.push('Unplausibel viele Rohstoffe.');
  for (const n of Object.values(s.store ?? {})) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < -1e-6) {
      fehler.push('Lagerbestand enthält ungültige Werte.');
      break;
    }
  }
  return { ok: fehler.length === 0, fehler };
}

function migriere(state: GameState): GameState {
  // Ältere Stände bekommen fehlende Felder; neue Felder haben klare Vorgaben.
  state.version = SAVE_VERSION;
  return state;
}

export function exportiere(state: GameState): string {
  return JSON.stringify({ spiel: 'wurzelhain', version: SAVE_VERSION, stand: state }, null, 1);
}

export function importiere(text: string): { ok: true; state: GameState } | { ok: false; fehler: string } {
  if (text.length > 40 * 1024 * 1024) return { ok: false, fehler: 'Die Datei ist zu groß.' };
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' };
  }
  const huelle = daten as { spiel?: string; stand?: unknown };
  const stand = huelle?.spiel === 'wurzelhain' ? huelle.stand : daten;
  const pruefung = pruefeZustand(stand);
  if (!pruefung.ok) return { ok: false, fehler: pruefung.fehler.join(' ') };
  return { ok: true, state: zustandReparieren(migriere(stand as GameState)) };
}

// ---------------------------------------------------------------------------
// Mehrere Tabs
// ---------------------------------------------------------------------------

const LOCK_KEY = 'wurzelhain:leader';

/**
 * Nur ein Tab schreibt. Bevorzugt Web Locks; ohne Locks dient ein
 * Heartbeat in localStorage als Rückfallebene.
 */
export class TabFuehrung {
  private istFuehrend = false;
  private timer: number | null = null;
  private readonly id = Math.random().toString(36).slice(2);

  constructor(private readonly onWechsel: (fuehrend: boolean) => void) {}

  async start(): Promise<void> {
    if ('locks' in navigator) {
      void navigator.locks.request('wurzelhain-save', { mode: 'exclusive' }, () => {
        this.setze(true);
        // Der Lock bleibt für die Lebensdauer des Tabs bestehen.
        return new Promise<void>(() => {});
      });
      // Ohne Zuschlag bleibt der Tab Beobachter, bis der führende Tab endet.
      window.setTimeout(() => {
        if (!this.istFuehrend) this.setze(false);
      }, 300);
      return;
    }
    this.heartbeat();
    this.timer = window.setInterval(() => this.heartbeat(), 2000);
  }

  private heartbeat(): void {
    try {
      const roh = localStorage.getItem(LOCK_KEY);
      const jetzt = Date.now();
      const eintrag = roh ? (JSON.parse(roh) as { id: string; zeit: number }) : null;
      const veraltet = !eintrag || jetzt - eintrag.zeit > 6000;
      if (veraltet || eintrag?.id === this.id) {
        localStorage.setItem(LOCK_KEY, JSON.stringify({ id: this.id, zeit: jetzt }));
        this.setze(true);
      } else {
        this.setze(false);
      }
    } catch {
      // Ohne localStorage schreibt der Tab; mehr ist lokal nicht durchsetzbar.
      this.setze(true);
    }
  }

  private setze(wert: boolean): void {
    if (this.istFuehrend === wert) return;
    this.istFuehrend = wert;
    this.onWechsel(wert);
  }

  get fuehrend(): boolean {
    return this.istFuehrend;
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
  }
}

// ---------------------------------------------------------------------------
// Einstellungen (klein, deshalb localStorage)
// ---------------------------------------------------------------------------

export interface Einstellungen {
  master: number;
  musik: number;
  effekte: number;
  atmosphaere: number;
  reduzierteBewegung: boolean;
  zoom: number;
  letzterSlot: Slot;
}

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  master: 0.6,
  musik: 0.35,
  effekte: 0.5,
  atmosphaere: 0.4,
  reduzierteBewegung: false,
  zoom: 2,
  letzterSlot: 0,
};

export function ladeEinstellungen(): Einstellungen {
  try {
    const roh = localStorage.getItem('wurzelhain:einstellungen');
    if (!roh) return { ...STANDARD_EINSTELLUNGEN };
    return { ...STANDARD_EINSTELLUNGEN, ...(JSON.parse(roh) as Partial<Einstellungen>) };
  } catch {
    return { ...STANDARD_EINSTELLUNGEN };
  }
}

export function speichereEinstellungen(werte: Einstellungen): void {
  try {
    localStorage.setItem('wurzelhain:einstellungen', JSON.stringify(werte));
  } catch {
    // Ohne localStorage bleiben die Einstellungen für diese Sitzung gültig.
  }
}
