import { describe, expect, it } from 'vitest';
import { exportiere, importiere, pruefeZustand } from '../src/game/persistence/save';
import { neuesSpiel, zustandReparieren } from '../src/game/simulation/state';
import { Simulation } from '../src/game/simulation/sim';
import { offlineNachrechnen } from '../src/game/simulation/offline';
import { fuehreBefehlAus } from '../src/game/simulation/commands';
import { menge } from '../src/game/simulation/store';
import { RESOURCE_IDS } from '../src/game/content/resources';

const MINUTE = 600;

function laufenLassen(seed: number, ticks: number) {
  const sim = new Simulation(neuesSpiel({ seed }));
  sim.schritte(ticks);
  return sim;
}

describe('Export und Import', () => {
  it('überlebt eine vollständige Runde durch JSON', () => {
    const sim = laufenLassen(31, MINUTE * 3);
    const text = exportiere(sim.state);
    const ergebnis = importiere(text);
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.state.seed).toBe(sim.state.seed);
    expect(ergebnis.state.residents.length).toBe(sim.state.residents.length);
    expect(ergebnis.state.buildings.length).toBe(sim.state.buildings.length);
    // Der geladene Stand läuft ohne Ausnahme weiter.
    const weiter = new Simulation(ergebnis.state);
    expect(() => weiter.schritte(MINUTE)).not.toThrow();
  });

  it('weist beschädigte und fremde Daten mit verständlichem Grund zurück', () => {
    expect(importiere('kein json').ok).toBe(false);
    expect(importiere('null').ok).toBe(false);
    expect(importiere('{"spiel":"wurzelhain","stand":{}}').ok).toBe(false);

    const sim = laufenLassen(7, 60);
    const kaputt = JSON.parse(exportiere(sim.state));
    kaputt.stand.store.holz = Number.NaN;
    const ergebnis = importiere(JSON.stringify(kaputt));
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler).toContain('ungültige Werte');
  });

  it('lehnt Stände aus neueren Versionen ab', () => {
    const sim = laufenLassen(8, 10);
    const zukunft = JSON.parse(exportiere(sim.state));
    zukunft.stand.version = 999;
    const pruefung = pruefeZustand(zukunft.stand);
    expect(pruefung.ok).toBe(false);
    expect(pruefung.fehler.join(' ')).toContain('neueren Version');
  });

  it('führt importierte Inhalte nicht aus', () => {
    // Ein Feld mit Codetext bleibt ein Zeichenketten-Feld.
    const sim = laufenLassen(9, 10);
    const daten = JSON.parse(exportiere(sim.state));
    daten.stand.dorfname = '<img src=x onerror=alert(1)>';
    const ergebnis = importiere(JSON.stringify(daten));
    expect(ergebnis.ok).toBe(true);
    if (ergebnis.ok) expect(typeof ergebnis.state.dorfname).toBe('string');
  });
});

describe('Laden und Reparatur', () => {
  it('gibt verwaiste Reservierungen frei und stellt Wege neu auf', () => {
    const sim = laufenLassen(12, MINUTE * 4);
    // Eine Baustelle erzwingen, damit Reservierungen offen sind.
    fuehreBefehlAus(sim, { art: 'bauen', typ: 'huette', x: 60, y: 60 });
    sim.schritte(30);

    const kopie = JSON.parse(JSON.stringify(sim.state));
    // Ein Bewohner verschwindet, seine Ansprüche bleiben zurück.
    kopie.residents.shift();
    const repariert = zustandReparieren(kopie);

    const ids = new Set(repariert.residents.map((r) => r.id));
    for (const node of repariert.nodes) {
      expect(node.reservedBy === null || ids.has(node.reservedBy)).toBe(true);
    }
    for (const id of RESOURCE_IDS) {
      expect(menge(repariert.reserviert, id)).toBeLessThanOrEqual(menge(repariert.store, id) + 1e-6);
    }
    expect(() => new Simulation(repariert).schritte(MINUTE)).not.toThrow();
  });

  it('überlebt dreifaches schnelles Neuladen ohne doppelte Erträge', () => {
    const sim = laufenLassen(15, MINUTE * 2);
    const vorher = menge(sim.state.store, 'holz');
    let stand = JSON.parse(JSON.stringify(sim.state));
    for (let i = 0; i < 3; i++) {
      const neu = new Simulation(zustandReparieren(stand));
      // Sofortiges Neuladen: keine Zeit vergangen, also kein Offline-Ertrag.
      const bericht = offlineNachrechnen(neu, 200, 8);
      expect(bericht.sekunden).toBe(0);
      stand = JSON.parse(JSON.stringify(neu.state));
    }
    expect(menge(stand.store, 'holz')).toBeCloseTo(vorher, 5);
  });
});

describe('Offline-Nachrechnung', () => {
  it('begrenzt negative und übergroße Zeitdifferenzen', () => {
    const sim = laufenLassen(21, MINUTE);
    const vorher = JSON.stringify(sim.state.store);
    // Zurückgestellte Uhr zählt als null.
    expect(offlineNachrechnen(sim, -5_000_000, 8).sekunden).toBe(0);
    expect(JSON.stringify(sim.state.store)).toBe(vorher);

    const ueber = offlineNachrechnen(sim, 48 * 3600 * 1000, 8);
    expect(ueber.sekunden).toBeLessThanOrEqual(8 * 3600);
    expect(ueber.abgeschnitten).toBeGreaterThan(0);
  });

  it('erzeugt über eine Stunde nachvollziehbaren Fortschritt', () => {
    const sim = laufenLassen(22, MINUTE * 2);
    const bericht = offlineNachrechnen(sim, 3600 * 1000, 8);
    expect(bericht.sekunden).toBe(3600);
    // Gewonnen wird etwas, und die Bestände bleiben gültig.
    expect(Object.keys(bericht.gewinn).length + Object.keys(bericht.verlust).length).toBeGreaterThan(0);
    for (const id of RESOURCE_IDS) expect(menge(sim.state.store, id)).toBeGreaterThanOrEqual(-1e-6);
    expect(sim.state.residents.length).toBeLessThanOrEqual(sim.wohnplaetze);
  });

  it('wächst offline nicht stärker als online in derselben Zeit', () => {
    // Derselbe Seed, dieselbe Dauer: einmal in Echtzeitschritten, einmal
    // in Ein-Sekunden-Blöcken. Die Nachrechnung darf nicht bevorteilen.
    const online = laufenLassen(22, MINUTE * 2);
    online.schritte(3600 * 10);

    const offline = laufenLassen(22, MINUTE * 2);
    offlineNachrechnen(offline, 3600 * 1000, 8);

    const o = online.state.residents.length;
    const f = offline.state.residents.length;
    expect(f, `offline ${f} gegenüber online ${o}`).toBeLessThanOrEqual(Math.ceil(o * 1.3) + 2);
    expect(f, 'offline darf auch nicht stehenbleiben').toBeGreaterThanOrEqual(Math.floor(o * 0.5));
  });

  it('hält für 1 Minute, 1 Stunde und 8 Stunden die Kapazitätsgrenzen ein', () => {
    for (const stunden of [1 / 60, 1, 8]) {
      const sim = laufenLassen(23, MINUTE);
      offlineNachrechnen(sim, stunden * 3600 * 1000, 8);
      expect(sim.belegung).toBeLessThanOrEqual(sim.kapazitaet + 1e-6);
      expect(sim.state.residents.length).toBeLessThanOrEqual(sim.wohnplaetze);
    }
  });

  it('spielt keine alten Geräusche nach', () => {
    const sim = laufenLassen(24, MINUTE);
    sim.cues.length = 0;
    offlineNachrechnen(sim, 3600 * 1000, 8);
    expect(sim.cues.length).toBe(0);
  });
});
